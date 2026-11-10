import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { expect, type Page, test } from '@playwright/test';
import { cssRefs, htmlRefs, isExternalUrl, isSkippableUrl } from '../../scripts/lib/demos';

const root = join(import.meta.dirname, '../..');
const DEMOS = ['atom', 'hidea', 'sprx', 'suwon'] as const;

function htmlFilesOnDisk(demo: string): string[] {
  const base = join(root, 'public/html', demo);
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const full = join(dir, n);
      return statSync(full).isDirectory() ? walk(full) : /\.html?$/i.test(n) ? [full] : [];
    });
  return walk(base).map(
    (f) =>
      `/html/${demo}/${f
        .slice(base.length + 1)
        .split(sep)
        .join('/')}`,
  );
}

/** index.html은 디렉터리 주소와 같은 문서로 본다. */
const canonical = (path: string) => path.replace(/index\.html?$/i, '');

/**
 * 고치지 못해 남기는 것. 정확한 주소(와일드카드 없음)와 이유. 비어 있어야 정상이다.
 * 항목이 생기면 반드시 사용자에게 보고한다.
 */
const KNOWN_BROKEN: { url: string; why: string }[] = [];
/** 데모 자신의 스크립트가 던지는 오류. 페이지와 메시지 전체가 같아야 한다. 비어 있어야 정상이다. */
const KNOWN_PAGE_ERRORS: { page: string; message: string; why: string }[] = [];

/** 크롤 결과(데모 한 개). */
async function crawl(
  request: import('@playwright/test').APIRequestContext,
  origin: string,
  demo: string,
) {
  const prefix = `/html/${demo}/`;
  const pages = new Map<string, number>(); // canonical 경로 → 상태
  const checked = new Map<string, number | string>();
  const broken: { from: string; url: string; status: number | string }[] = [];
  const externals = new Set<string>();
  const queue: string[] = [prefix];
  const pagePaths: string[] = [];

  const fetchOnce = async (path: string) => {
    try {
      const res = await request.get(path, { failOnStatusCode: false, maxRedirects: 5 });
      return { status: res.status(), type: res.headers()['content-type'] ?? '', res };
    } catch (e) {
      return { status: `error: ${(e as Error).message}`, type: '', res: undefined };
    }
  };

  const visitRefs = async (from: string, refs: ReturnType<typeof htmlRefs>) => {
    for (const ref of refs) {
      if (isSkippableUrl(ref.url)) continue;
      const abs = new URL(ref.url, `${origin}${from}`);
      if (isExternalUrl(ref.url) || abs.origin !== origin) {
        if (ref.kind !== 'link') externals.add(abs.href);
        continue;
      }
      const path = abs.pathname + abs.search;
      if (
        ref.kind === 'link' &&
        abs.pathname.startsWith(prefix) &&
        /(?:\/|\.html?)$/i.test(abs.pathname)
      ) {
        if (!pages.has(canonical(abs.pathname)) && !queue.includes(abs.pathname)) {
          queue.push(abs.pathname);
        }
        continue;
      }
      if (checked.has(path)) continue;
      const { status, type, res } = await fetchOnce(path);
      checked.set(path, status);
      if (status !== 200) broken.push({ from, url: path, status });
      else if (res && ref.kind === 'style' && /css/i.test(type)) {
        await visitRefs(abs.pathname, cssRefs(await res.text()));
      }
    }
  };

  while (queue.length > 0) {
    const path = queue.shift() as string;
    const key = canonical(path.split('?')[0] ?? path);
    if (pages.has(key)) continue;
    const { status, type, res } = await fetchOnce(path);
    pages.set(key, typeof status === 'number' ? status : 0);
    if (status !== 200) {
      broken.push({ from: '(crawl)', url: path, status });
      continue;
    }
    pagePaths.push(path);
    if (res && /html/i.test(type)) await visitRefs(path, htmlRefs(await res.text()));
  }
  return { pages, pagePaths, checked, broken, externals };
}

async function collect(page: Page, origin: string) {
  const own: string[] = [];
  const external = new Set<string>();
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const url = msg.location().url;
    // 외부 글꼴 CORS 같은 메시지는 위치가 우리 페이지로 찍히므로 본문에 든 주소로도 판별한다.
    const mentioned = msg.text().match(/https?:\/\/[^\s'")]+/g) ?? [];
    const foreign = [url, ...mentioned].find((u) => u && new URL(u).origin !== origin);
    if (foreign) external.add(foreign);
    else own.push(`${msg.text()} @ ${url}`);
  });
  page.on('pageerror', (err) => own.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    const u = new URL(res.url());
    if (res.status() >= 400) {
      if (u.origin === origin) own.push(`HTTP ${res.status()} ${u.pathname}`);
      else external.add(res.url());
    }
  });
  page.on('requestfailed', (req) => {
    if (/^(?:blob|data):/i.test(req.url())) return; // 페이지가 만든 임시 스크립트(Modernizr 기능 검사 등)가 해제되며 중단된 것
    const u = new URL(req.url());
    if (u.origin === origin) {
      own.push(
        `requestfailed ${req.resourceType()} ${u.pathname} ${req.failure()?.errorText ?? ''}`,
      );
    } else external.add(req.url());
  });
  return { own, external };
}

/** 끝까지 천천히 내려가며 지연 로딩을 일으킨 뒤, 불러오기에 실패한(naturalWidth 0) 이미지의 src. */
async function brokenImages(page: Page): Promise<string[]> {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight / 2);
    for (let y = 0; y < document.documentElement.scrollHeight + step; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState('load');
  await page.waitForTimeout(400);
  return page.evaluate(() =>
    [...document.images]
      .filter((img) => img.currentSrc || img.getAttribute('src'))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute('src') ?? img.currentSrc),
  );
}

test.describe('데모 링크 검사', () => {
  for (const demo of DEMOS) {
    test(`/html/${demo}/: 링크로 닿는 모든 페이지가 200이고 내부 참조가 하나도 깨지지 않는다`, async ({
      request,
      baseURL,
    }) => {
      test.setTimeout(120_000);
      const origin = new URL(baseURL as string).origin;
      const { pages, checked, broken, externals } = await crawl(request, origin, demo);

      // 디스크의 모든 HTML이 index에서 링크로 닿는다(고아 페이지 없음).
      const orphans = htmlFilesOnDisk(demo)
        .map(canonical)
        .filter((p) => !pages.has(p))
        .sort();
      expect(orphans, '링크로 닿지 않는 페이지').toEqual([]);

      const unexpected = broken.filter((b) => !KNOWN_BROKEN.some((k) => k.url === b.url));
      expect(unexpected, `깨진 참조:\n${JSON.stringify(unexpected, null, 1)}`).toEqual([]);
      const stale = KNOWN_BROKEN.filter((k) => !broken.some((b) => b.url === k.url));
      expect(
        stale.map((k) => k.url),
        '더는 깨지지 않는 항목: KNOWN_BROKEN에서 지운다',
      ).toEqual([]);

      console.log(
        `[demos] ${demo}: pages ${pages.size}, internal resources ${checked.size}, broken ${broken.length}, external (not checked) ${externals.size}`,
      );
    });
  }
});

test.describe('데모 모든 페이지 브라우저 검사', () => {
  for (const demo of DEMOS) {
    test(`/html/${demo}/ 의 모든 페이지: 우리 출처 콘솔 오류 0, 깨진 이미지 0`, async ({
      page,
      request,
      baseURL,
    }) => {
      test.setTimeout(240_000);
      const origin = new URL(baseURL as string).origin;
      const { pagePaths } = await crawl(request, origin, demo);
      expect(pagePaths.length).toBeGreaterThan(0);
      const seen = await collect(page, origin);
      const problems: string[] = [];
      const imgProblems: string[] = [];
      let externalFailures = 0;
      for (const path of pagePaths) {
        seen.own.length = 0;
        seen.external.clear();
        await page.goto(path, { waitUntil: 'load' });
        await page.waitForTimeout(400);
        const bad = await brokenImages(page);
        for (const src of bad) imgProblems.push(`${path}: ${src}`);
        for (const m of seen.own) {
          if (!KNOWN_PAGE_ERRORS.some((k) => k.page === path && m === `pageerror: ${k.message}`)) {
            problems.push(`${path}: ${m}`);
          }
        }
        externalFailures += seen.external.size;
      }
      console.log(
        `[demos] ${demo}: browsed ${pagePaths.length} page(s), external failures (ignored, counted) ${externalFailures}`,
      );
      expect(problems, problems.join('\n')).toEqual([]);
      expect(imgProblems, `깨진 이미지:\n${imgProblems.join('\n')}`).toEqual([]);
    });
  }
});

interface Project {
  slug: string;
  demo?: string;
}
const demoProjects: Project[] = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'src/content/projects', f), 'utf8')) as Project)
  .filter((p) => p.demo !== undefined);

test.describe('작업 상세 페이지의 데모 링크', () => {
  test('데모가 있는 작업이 있다', () => {
    expect(demoProjects.length).toBeGreaterThanOrEqual(2);
  });
  for (const { slug, demo } of demoProjects) {
    for (const prefix of ['', '/en']) {
      test(`${prefix}/work/${slug}/ → /html/${demo}/ 가 200`, async ({ page, request }) => {
        await page.goto(`${prefix}/work/${slug}/`);
        const link = page.locator('a.demo-link');
        await expect(link).toHaveAttribute('href', `/html/${demo}/`);
        const res = await request.get(`/html/${demo}/`);
        expect(res.status()).toBe(200);
        expect(await res.text()).toContain('<html');
      });
    }
  }
});

test.describe('404 페이지', () => {
  for (const url of [
    '/no-such-page/',
    '/en/no-such-page/',
    '/html/atom/nope.html',
    '/work/no-such-slug/',
  ]) {
    test(`${url} 은 맞춤 404 페이지를 낸다`, async ({ page }) => {
      const res = await page.goto(url);
      expect(res?.status()).toBe(404);
      await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        '페이지를 찾을 수 없습니다',
      );
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Page not found');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('main a[href="/"]')).toBeVisible();
      await expect(page.locator('main a[href="/en/"]')).toBeVisible();
    });
  }

  test('홈 링크가 실제로 이동한다', async ({ page }) => {
    await page.goto('/no-such-page/');
    await page.locator('main a[href="/en/"]').click();
    await expect(page).toHaveURL(/\/en\/$/);
    await page.goto('/no-such-page/');
    await page.locator('main a[href="/"]').click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });

  test('360px에서 가로 스크롤이 없고, 큰 글자(h1 ≥ 32px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/no-such-page/');
    const { overflow, size } = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      size: Number.parseFloat(getComputedStyle(document.querySelector('h1') as Element).fontSize),
    }));
    expect(overflow).toBeLessThanOrEqual(0);
    expect(size).toBeGreaterThanOrEqual(32);
  });

  test('JS 없이도 보인다', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await ctx.newPage();
    const res = await page.goto('/no-such-page/');
    expect(res?.status()).toBe(404);
    await expect(page.locator('main a[href="/"]')).toBeVisible();
    await ctx.close();
  });
});
