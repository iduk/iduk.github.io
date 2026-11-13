import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Locator, type Page, test } from '@playwright/test';

const root = join(import.meta.dirname, '../..');
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

interface P {
  slug: string;
  year: number;
  order: number;
  tags: string[];
  featured?: boolean;
  title: { ko: string; en: string };
}
const projects: P[] = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => read(`src/content/projects/${f}`));
const tags: { id: string; name: { ko: string; en: string } }[] = read('src/content/tags.json');
const usedTags = tags.filter((t) => projects.some((p) => p.tags.includes(t.id)));
const featured = projects.filter((p) => p.featured);

const locales = [
  { loc: 'ko', prefix: '' },
  { loc: 'en', prefix: '/en' },
] as const;

const rows = (page: Page) => page.locator('[data-work-row]');
/** 행 링크의 href. 기본은 정렬해 집합으로 비교하고, ordered면 DOM 순서 그대로. */
const hrefsOf = async (scope: Page | Locator, ordered = false) => {
  const list = await scope
    .locator('[data-work-row] a[data-work-link]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  return ordered ? list : list.sort();
};
/** 연도 내림차순, 같은 해는 order 오름차순(getPublicProjects와 같은 규칙). */
const byOrder = (list: P[]) => [...list].sort((a, b) => b.year - a.year || a.order - b.order);
const expectedHrefs = (prefix: string, list: P[]) =>
  list.map((p) => `${prefix}/work/${p.slug}/`).sort();

test.describe('JS 없이', () => {
  test.use({ javaScriptEnabled: false });

  for (const { loc, prefix } of locales) {
    test(`${loc} 홈: 대표 작업 행 6~8개, 히어로, 전체 보기 링크`, async ({ page }) => {
      await page.goto(`${prefix}/`);
      expect(featured.length).toBeGreaterThanOrEqual(6);
      expect(featured.length).toBeLessThanOrEqual(8);
      await expect(rows(page)).toHaveCount(featured.length);
      expect(await hrefsOf(page)).toEqual(expectedHrefs(prefix, featured));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('iduk');
      await expect(page.locator('.lede')).toHaveText(loc === 'ko' ? '대표 작업' : 'Selected Work');
      const all = page.locator('a[data-all-work]');
      await expect(all).toHaveAttribute('href', `${prefix}/work/`);
      // 행 링크의 접근 가능한 이름에 제목이 정확히 한 번만 들어간다(이미지는 장식)
      for (const p of featured) {
        const snap = await page.locator(`a[href="${prefix}/work/${p.slug}/"]`).ariaSnapshot();
        const name = snap.match(/link "(.*)"/)?.[1] ?? '';
        expect(name.split(p.title[loc]).length - 1, `${p.slug}: ${name}`).toBe(1);
      }
      // 첫 번째 이미지만 eager
      const loading = await rows(page)
        .locator('img')
        .evaluateAll((imgs) => imgs.map((i) => i.getAttribute('loading')));
      expect(loading[0]).toBe('eager');
      expect(loading.slice(1).every((l) => l === 'lazy')).toBe(true);
    });

    test(`${loc} /work/: 24개 행, 연도별 그룹, 연도 내림차순`, async ({ page }) => {
      await page.goto(`${prefix}/work/`);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(rows(page)).toHaveCount(24);
      const years = await page
        .locator('h2[data-year]')
        .evaluateAll((hs) => hs.map((h) => Number(h.getAttribute('data-year'))));
      const expected = [...new Set(projects.map((p) => p.year))].sort((a, b) => b - a);
      expect(years).toEqual(expected);
      for (const y of expected) {
        const group = page.locator(`section[data-year-group="${y}"]`);
        const inYear = projects.filter((p) => p.year === y);
        expect(await hrefsOf(group)).toEqual(expectedHrefs(prefix, inYear));
        // 같은 해 안의 순서는 order 오름차순 그대로(정렬하지 않고 비교)
        expect(await hrefsOf(group, true)).toEqual(
          byOrder(inYear).map((p) => `${prefix}/work/${p.slug}/`),
        );
      }
      expect(await hrefsOf(page, true)).toEqual(
        byOrder(projects).map((p) => `${prefix}/work/${p.slug}/`),
      );
      // 연도 묶음은 landmark(region)를 만들지 않는다
      await expect(page.getByRole('region')).toHaveCount(0);
      // 행 제목은 해당 언어
      for (const p of projects.slice(0, 3)) {
        await expect(page.locator(`a[href="${prefix}/work/${p.slug}/"]`)).toContainText(
          p.title[loc],
        );
      }
    });

    for (const tag of usedTags) {
      test(`${loc} /work/tag/${tag.id}/: 해당 태그 글만`, async ({ page }) => {
        await page.goto(`${prefix}/work/tag/${tag.id}/`);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveText(tag.name[loc]);
        const has = projects.filter((p) => p.tags.includes(tag.id));
        await expect(rows(page)).toHaveCount(has.length);
        expect(await hrefsOf(page)).toEqual(expectedHrefs(prefix, has));
        // 필터 nav의 태그 집합은 실제로 쓰이는 태그와 같다
        const filterHrefs = await page
          .locator('nav[data-tag-filter] a:not([data-filter-all])')
          .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        expect([...filterHrefs].sort()).toEqual(
          usedTags.map((t) => `${prefix}/work/tag/${t.id}/`).sort(),
        );
        // 이 태그 페이지는 목록에서 현재 위치로 표시된다
        await expect(page.locator(`nav[data-tag-filter] a[aria-current="page"]`)).toHaveCount(1);
        // 언어 전환은 같은 태그 페이지로
        const other = loc === 'ko' ? 'en' : 'ko';
        const otherPrefix = other === 'en' ? '/en' : '';
        await expect(page.locator(`footer a[hreflang="${other}"]`)).toHaveAttribute(
          'href',
          `${otherPrefix}/work/tag/${tag.id}/`,
        );
        await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
          'href',
          `https://iduk.co.kr${otherPrefix}/work/tag/${tag.id}/`,
        );
      });
    }
  }

  test('태그 필터와 언어 전환 링크를 눌러 이동한다', async ({ page }) => {
    await page.goto('/work/');
    const tag = usedTags[0];
    await page.locator(`nav[data-tag-filter] a[href="/work/tag/${tag.id}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`/work/tag/${tag.id}/$`));
    await page.locator('footer a[hreflang="en"]').click();
    await expect(page).toHaveURL(new RegExp(`/en/work/tag/${tag.id}/$`));
    await expect(page.locator('h1')).toHaveText(tag.name.en);
    await page.locator('nav[data-tag-filter] a[data-filter-all]').click();
    await expect(page).toHaveURL(/\/en\/work\/$/);
    await expect(rows(page)).toHaveCount(24);
    await page.locator('footer a[hreflang="ko"]').click();
    await expect(page).toHaveURL(/\/work\/$/);
  });

  test('목록 행에서 상세로 이동한다', async ({ page }) => {
    await page.goto('/work/');
    await page.locator('a[data-work-link]').first().click();
    await expect(page).toHaveURL(/\/work\/[a-z0-9-]+\/$/);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});

const listPages = ['/', '/work/', ...usedTags.map((t) => `/work/tag/${t.id}/`)].flatMap((p) =>
  locales.map(({ prefix }) => (p === '/' ? `${prefix}/` : `${prefix}${p}`)),
);

test.describe('360px', () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  for (const url of listPages) {
    test(`${url} 가로 스크롤 없음, 제목이 잘리지 않음`, async ({ page }) => {
      await page.goto(url);
      const m = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const clipped = [...document.querySelectorAll<HTMLElement>('[data-work-title]')]
          .filter(
            (el) =>
              el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > vw + 1,
          )
          .map((el) => el.textContent);
        return {
          vw,
          sw: document.documentElement.scrollWidth,
          bw: document.body.scrollWidth,
          titles: document.querySelectorAll('[data-work-title]').length,
          clipped,
        };
      });
      expect(m.sw).toBeLessThanOrEqual(m.vw);
      expect(m.bw).toBeLessThanOrEqual(m.vw);
      expect(m.titles).toBeGreaterThan(0);
      expect(m.clipped).toEqual([]);
    });
  }

  const touchPages = locales.flatMap(({ prefix }) =>
    ['/', '/work/', '/work/tag/healthcare/'].map((p) =>
      p === '/' ? `${prefix}/` : `${prefix}${p}`,
    ),
  );
  for (const url of touchPages) {
    test(`${url} 터치 대상은 가로세로 44px 이상`, async ({ page }) => {
      await page.goto(url);
      const targets = await page.locator('a, button').evaluateAll((els) =>
        els
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              t: el.textContent?.trim() || el.getAttribute('aria-label'),
              w: r.width,
              h: r.height,
            };
          })
          .filter((x) => x.w > 0 && x.h > 0),
      );
      expect(targets.length).toBeGreaterThan(10);
      expect(targets.filter((x) => x.w < 44 - 0.5 || x.h < 44 - 0.5)).toEqual([]);
    });
  }
});

test.describe('콘솔과 CSP, 내부 링크', () => {
  for (const url of listPages) {
    test(`${url} 오류 없음, 내부 링크 200`, async ({ page, request }) => {
      const problems: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning')
          problems.push(`${m.type()}: ${m.text()}`);
      });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) =>
          console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`),
        );
      });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      // 지연 로드 이미지까지 불러온다
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForLoadState('networkidle');
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href') as string))]);
      const internal = hrefs.filter((h) => h.startsWith('/'));
      expect(internal.length).toBeGreaterThan(3);
      for (const h of internal) {
        const res = await request.get(h);
        expect(res.status(), h).toBe(200);
      }
      expect(problems).toEqual([]);
    });
  }
});

test.describe('태그 페이지 설명', () => {
  for (const { loc, prefix } of locales) {
    test(`${loc} 14개 태그의 meta description이 모두 다르고 이름과 개수를 담는다`, async ({
      request,
    }) => {
      const descs: string[] = [];
      for (const tag of usedTags) {
        const html = await (await request.get(`${prefix}/work/tag/${tag.id}/`)).text();
        const d = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
        const count = projects.filter((p) => p.tags.includes(tag.id)).length;
        expect(d, tag.id).toContain(tag.name[loc].replace(/&/g, '&#38;').replace(/&#38;/g, '&'));
        expect(d, tag.id).toContain(String(count));
        descs.push(d);
      }
      expect(new Set(descs).size).toBe(usedTags.length);
    });
  }
});

test.describe('호버 미리보기', () => {
  const firstLink = (page: Page) => page.locator('[data-work-row] a[data-work-link]').first();
  const preview = (page: Page) => page.locator('[data-work-row] .preview').first();

  test('hover:hover 1440px에서 호버하면 보이고 평소엔 숨는다', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/work/');
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(true);
    await expect(preview(page)).toBeHidden();
    await firstLink(page).hover();
    await expect(preview(page)).toBeVisible();
    await ctx.close();
  });

  test('64rem 미만에서는 호버해도 보이지 않는다', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('/work/');
    await firstLink(page).hover();
    await expect(preview(page)).toBeHidden();
    await ctx.close();
  });

  test('hover:none(터치) 기기에서는 넓은 화면이어도 보이지 않는다', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto('/work/');
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
    await firstLink(page).focus();
    await firstLink(page).hover();
    await expect(preview(page)).toBeHidden();
    await ctx.close();
  });
});
