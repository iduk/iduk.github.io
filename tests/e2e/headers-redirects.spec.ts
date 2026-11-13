/**
 * 헤더·리다이렉트·SEO를 실제 Chromium으로 확인한다.
 *
 * vercel.json은 Vercel의 변환기(@vercel/routing-utils)로 라우트가 되고, tests/helpers/vercel-routes.ts의 평가기가
 * Vercel 문서의 라우트 의미(순서, continue 헤더, 3xx+Location, 쿼리 전달, 파일 시스템, 404)대로 처리한다.
 *
 * 증명하는 것: 변환된 라우트가 이 평가 의미에서 내는 응답. 즉 리다이렉트 표(두 번 이동 포함), wp 경로 404,
 * 헤더 값, 헤더 CSP와 meta CSP가 함께 적용된 상태의 콘솔 위반 0(데모는 완화 정책), hreflang·canonical·OG.
 * 증명하지 못하는 것: 실제 Vercel 엣지가 같은 라우트를 같은 순서·의미로 실행하는지(헤더 병합, 쿼리 전달,
 * 파일 시스템 조회 시점, 리다이렉트 응답의 헤더). 그것은 S13 미리보기 배포에서만 확인된다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import { type DistServer, startDistServer } from '../helpers/static-server';
import type { VercelConfig } from '../helpers/vercel-routes';

const root = join(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as VercelConfig;
const projects = readdirSync(join(root, 'src/content/projects')).map(
  (f) =>
    JSON.parse(readFileSync(join(root, 'src/content/projects', f), 'utf8')) as {
      slug: string;
      legacy: { path: string };
      cover: { alt: { ko: string; en: string } };
    },
);
const tags = (
  JSON.parse(readFileSync(join(root, 'src/content/tags.json'), 'utf8')) as { id: string }[]
).map((t) => t.id);

const test = base.extend<object, { dist: DistServer }>({
  dist: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture 시그니처
    async ({}, use) => {
      const server = await startDistServer(dist, config);
      await use(server);
      await server.close();
    },
    { scope: 'worker' },
  ],
});

/** 위반 보고를 모은다: securitypolicyviolation 이벤트와 콘솔의 CSP 메시지. */
async function watchCsp(page: Page) {
  const violations: string[] = [];
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(
        `${e.violatedDirective} ${e.blockedURI.slice(0, 60)} @${e.sourceFile.split('/').slice(-2).join('/')}:${e.lineNumber} [${e.sample.slice(0, 50)}]`,
      );
    });
  });
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to|violates the following/i.test(m.text()))
      violations.push(`console: ${m.text().slice(0, 160)}`);
  });
  return {
    violations,
    collect: async () => [
      ...new Set([
        ...violations,
        ...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)),
      ]),
    ],
  };
}

/** 외부 호스트 요청은 인터넷으로 보내지 않고 빈 응답으로 막는다(CSP 판정은 네트워크 이전이라 영향 없음). */
async function stubExternal(page: Page, origin: string, seen?: Map<string, Set<string>>) {
  await page.route(/^https?:\/\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    const type = route.request().resourceType();
    seen?.set(`${type} ${url.origin}`, new Set());
    const bodies: Record<string, [string, string | Buffer]> = {
      script: ['text/javascript', ''],
      stylesheet: ['text/css', ''],
      image: ['image/gif', Buffer.from('R0lGODlhAQABAAAAACw=', 'base64')],
      font: ['font/woff2', ''],
      document: ['text/html', '<!doctype html><title>stub</title>'],
    };
    const [contentType, body] = bodies[type] ?? ['text/plain', ''];
    return route.fulfill({ status: 200, contentType, body });
  });
}

const htmlOf = (demo: string) => {
  const base = join(root, 'public/html', demo);
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) =>
      statSync(join(d, n)).isDirectory()
        ? walk(join(d, n))
        : /\.html?$/i.test(n)
          ? [join(d, n)]
          : [],
    );
  return walk(base).map(
    (f) =>
      `/html/${demo}/${f
        .slice(base.length + 1)
        .split(sep)
        .join('/')}`,
  );
};

test.describe('리다이렉트', () => {
  test('옛 주소 24개: 슬래시 있으면 301 한 번, 없으면 308 다음 301 두 번, 최종 200', async ({
    dist: s,
    request,
    page,
  }) => {
    for (const p of projects) {
      const bare = p.legacy.path.replace(/\/$/, '');
      const one = await request.get(`${s.origin}${p.legacy.path}`, { maxRedirects: 0 });
      expect([p.legacy.path, one.status()], p.slug).toEqual([p.legacy.path, 301]);
      expect(one.headers().location, p.legacy.path).toBe(`/work/${p.slug}/`);
      // 슬래시 없는 주소: trailingSlash의 308이 먼저, 그 다음 301(두 번 이동)
      const first = await request.get(`${s.origin}${bare}`, { maxRedirects: 0 });
      expect([bare, first.status()], p.slug).toEqual([bare, 308]);
      expect(first.headers().location, bare).toBe(p.legacy.path);
      const final = await page.goto(`${s.origin}${bare}`);
      expect(final?.status(), p.slug).toBe(200);
      expect(page.url()).toBe(`${s.origin}/work/${p.slug}/`);
    }
  });

  test('/portfolio/1812 → jejuair-mobile, /portfolio → 첫 화면, 옛 목록 /work/ → 첫 화면', async ({
    dist: s,
    request,
  }) => {
    const get = async (path: string) => {
      const r = await request.get(`${s.origin}${path}`, { maxRedirects: 0 });
      return [r.status(), r.headers().location];
    };
    expect(await get('/portfolio/1812/')).toEqual([301, '/work/jejuair-mobile/']);
    expect(await get('/portfolio/1812')).toEqual([308, '/portfolio/1812/']);
    expect(await get('/portfolio/')).toEqual([301, '/']);
    expect(await get('/portfolio')).toEqual([308, '/portfolio/']);
    // 첫 화면이 작업 목록이라 옛 목록 주소는 첫 화면으로 간다.
    expect(await get('/work/')).toEqual([301, '/']);
    expect(await get('/en/work/')).toEqual([301, '/en/']);
  });

  test('/?p=ID, /?page_id=ID는 이동 없이 홈 200 (canonical이 /를 가리킨다)', async ({
    dist: s,
    request,
    page,
  }) => {
    for (const url of ['/?p=1833', '/?page_id=77', '/', '/?utm_source=x']) {
      expect((await request.get(`${s.origin}${url}`, { maxRedirects: 0 })).status(), url).toBe(200);
    }
    await page.goto(`${s.origin}/?p=1833`);
    expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(
      'https://iduk.co.kr/',
    );
    expect(page.url()).toBe(`${s.origin}/?p=1833`);
  });

  test('trailingSlash: /work/oyedu → /work/oyedu/, 파일은 그대로', async ({ dist: s, request }) => {
    const r = await request.get(`${s.origin}/work/oyedu`, { maxRedirects: 0 });
    expect([r.status(), r.headers().location]).toEqual([308, '/work/oyedu/']);
    for (const f of ['/robots.txt', '/sitemap-index.xml']) {
      expect((await request.get(`${s.origin}${f}`, { maxRedirects: 0 })).status(), f).toBe(200);
    }
    expect(
      (await request.get(`${s.origin}/html/atom/business.html`, { maxRedirects: 0 })).status(),
    ).toBe(200);
  });

  test('워드프레스 경로는 최종적으로 정적 404', async ({ dist: s, request }) => {
    for (const p of [
      '/wp-admin',
      '/wp-admin/',
      '/wp-login.php',
      '/xmlrpc.php',
      '/wp-content/uploads/2020/04/a.jpg',
      '/wp-json/wp/v2/posts',
      '/index.php',
      '/readme.php',
    ]) {
      const res = await request.get(`${s.origin}${p}`, { failOnStatusCode: false });
      expect(res.status(), p).toBe(404);
      expect(await res.text(), p).toContain('404');
    }
    // 직접 요청한 확장자 있는 경로는 이동 없이 곧바로 404
    expect((await request.get(`${s.origin}/wp-login.php`, { maxRedirects: 0 })).status()).toBe(404);
  });
});

test.describe('응답 헤더', () => {
  const COMMON = {
    'strict-transport-security': 'max-age=300',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'cross-origin-opener-policy': 'same-origin',
  };
  for (const path of ['/', '/en/', '/work/oyedu/']) {
    test(`${path}: 공통 헤더와 엄격한 CSP`, async ({ dist: s, request }) => {
      const h = (await request.get(`${s.origin}${path}`)).headers();
      for (const [k, v] of Object.entries(COMMON)) expect(h[k], k).toBe(v);
      const csp = h['content-security-policy'];
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain('script-src');
      expect(csp).not.toContain('default-src');
      expect(h['x-robots-tag']).toBeUndefined();
    });
  }
  test('/html/atom/: 완화 CSP만(엄격한 것과 합쳐지지 않음), noindex', async ({
    dist: s,
    request,
  }) => {
    const h = (await request.get(`${s.origin}/html/atom/`)).headers();
    const csp = h['content-security-policy'];
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp.split('content-security-policy').length).toBe(1);
    expect(csp).not.toContain(', '); // 쉼표로 이어 붙은 두 정책이 아니다
    expect(h['x-robots-tag']).toBe('noindex, nofollow');
    for (const [k, v] of Object.entries(COMMON)) expect(h[k], k).toBe(v);
  });
  test('404 응답에도 헤더가 붙는다', async ({ dist: s, request }) => {
    const res = await request.get(`${s.origin}/nope/`, { failOnStatusCode: false });
    expect(res.status()).toBe(404);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });
});

test.describe('콘솔 CSP 위반 0 (헤더 CSP + meta CSP 동시 적용)', () => {
  const pages = ['/', `/work/tag/${tags[0]}/`, `/work/${projects[0].slug}/`, '/not-a-page/'];
  for (const prefix of ['', '/en']) {
    for (const p of pages) {
      const url = prefix && p === '/not-a-page/' ? p : `${prefix}${p}`;
      if (prefix && p === '/not-a-page/') continue; // 404는 한 번(두 언어 안내가 한 페이지)
      test(`${url}`, async ({ dist: s, page }) => {
        const watch = await watchCsp(page);
        await stubExternal(page, s.origin);
        const res = await page.goto(`${s.origin}${url}`, { waitUntil: 'networkidle' });
        expect(res?.status()).toBe(p === '/not-a-page/' ? 404 : 200);
        if (p !== '/not-a-page/') {
          expect(await page.locator('meta[http-equiv="content-security-policy"]').count()).toBe(1);
        }
        expect(res?.headers()['content-security-policy']).toBeTruthy();
        // 페이지가 실제로 그려졌는지(스타일이 막히지 않았는지)
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
          'rgba(0, 0, 0, 0)',
        );
        expect(await watch.collect(), url).toEqual([]);
      });
    }
  }

  test("대조군: 헤더에 default-src 'self'를 넣으면 meta 해시가 있어도 인라인 스타일이 막힌다", async ({
    page,
  }) => {
    const mutated: VercelConfig = JSON.parse(JSON.stringify(config));
    const rules = mutated.headers as { headers: { key: string; value: string }[] }[];
    for (const rule of rules) {
      for (const h of rule.headers) {
        if (h.key === 'Content-Security-Policy' && !h.value.includes('script-src'))
          h.value = `default-src 'self'; ${h.value}`;
      }
    }
    const server = await startDistServer(dist, mutated);
    try {
      const watch = await watchCsp(page);
      await page.goto(`${server.origin}/`, { waitUntil: 'domcontentloaded' });
      // 두 정책의 교집합이라 해시된 인라인 스타일이 막혀야 한다(보고는 비동기라 기다린다).
      await expect
        .poll(async () => (await watch.collect()).length, { timeout: 10_000 })
        .toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });
});

/**
 * atom 데모의 modernizr-custom.js가 기능 탐지로 일부러 시도하는 동작(문자열 평가, blob/data 워커, data 미디어).
 * 정책이 막으면 Modernizr는 '미지원'으로 처리하고 페이지는 그대로 동작한다. 이 탐지 때문에 unsafe-eval,
 * worker-src blob:/data:, media-src data:를 열지 않기로 했다(03번 문서 4.2). 정확한 항목만 허용하고 나머지는 전부 위반으로 센다.
 */
const KNOWN_PROBES: { demo: string; pattern: RegExp }[] = [
  { demo: 'atom', pattern: /^script-src eval @js\/modernizr-custom\.js:3 / },
  { demo: 'atom', pattern: /^worker-src (?:blob|data) @js\/modernizr-custom\.js:[45] / },
  // media-src data: 탐지는 비동기로 실행되어 Chromium이 보고하는 소스 줄이 그 순간 실행 중인 스크립트 태그에 따라
  // 바뀐다(24, 25, 212 …). 그래서 줄 번호는 고정하지 않는다. 대신 지시어(media-src), 차단 대상 종류(data),
  // 데모(atom 페이지를 연 경우에만 허용)와 출처 모양(atom의 html 페이지, 디렉터리 색인, 또는 소스가 비어 `@:0`)은
  // 그대로 좁게 고정한다.
  { demo: 'atom', pattern: /^media-src data @(?:atom\/(?:[a-z]+\.html)?)?:\d+ / },
  { demo: 'atom', pattern: /^console: Refused to evaluate a string as JavaScript/ },
  { demo: 'atom', pattern: /^console: Creating a worker from '(?:blob|data):/ },
  { demo: 'atom', pattern: /^console: Loading media from\s+'data:/ },
];

test.describe('데모(/html/*): 완화 정책에서 위반 0 (기능 탐지 항목 제외)', () => {
  const DEMOS = ['atom', 'hidea', 'sprx', 'suwon'];
  for (const demo of DEMOS) {
    test(`/html/${demo}/ 와 하위 html 전부`, async ({ dist: s, page }) => {
      test.setTimeout(120_000);
      const watch = await watchCsp(page);
      const seen = new Map<string, Set<string>>();
      await stubExternal(page, s.origin, seen);
      const bad: string[] = [];
      const probes = new Set<string>();
      for (const path of [`/html/${demo}/`, ...htmlOf(demo)]) {
        const res = await page.goto(`${s.origin}${path}`, { waitUntil: 'load' });
        expect(res?.status(), path).toBe(200);
        expect(res?.headers()['x-robots-tag'], path).toBe('noindex, nofollow');
        const found = await watch.collect();
        for (const v of found) {
          if (KNOWN_PROBES.some((k) => k.demo === demo && k.pattern.test(v)))
            probes.add(v.replace(/\s.*/, ''));
          else bad.push(`${path}: ${v}`);
        }
        watch.violations.length = 0;
      }
      expect(bad).toEqual([]);
      // 보고용: 이 데모가 실제로 요청한 외부 출처
      console.log(`[probes ${demo}]`, [...probes].sort().join(' | ') || '(none)');
      console.log(`[external ${demo}]`, [...seen.keys()].sort().join(' | ') || '(none)');
    });
  }
});

test.describe('SEO (실제 브라우저 DOM)', () => {
  test('홈과 상세: canonical, hreflang, OG 태그', async ({ dist: s, page }) => {
    const p = projects.find((x) => x.slug === 'oyedu') as (typeof projects)[number];
    for (const [url, lang, alt] of [
      ['/', 'ko', null],
      ['/en/', 'en', null],
      ['/work/oyedu/', 'ko', p.cover.alt.ko],
      ['/en/work/oyedu/', 'en', p.cover.alt.en],
    ] as const) {
      await page.goto(`${s.origin}${url}`);
      const attr = (sel: string, a: string) => page.locator(sel).first().getAttribute(a);
      const ko = url.replace(/^\/en/, '') || '/';
      const en = `/en${ko}`;
      expect(await attr('link[rel=canonical]', 'href'), url).toBe(`https://iduk.co.kr${url}`);
      expect(await attr('link[hreflang=ko]', 'href')).toBe(`https://iduk.co.kr${ko}`);
      expect(await attr('link[hreflang=en]', 'href')).toBe(`https://iduk.co.kr${en}`);
      expect(await attr('link[hreflang=x-default]', 'href')).toBe(`https://iduk.co.kr${ko}`);
      expect(await attr('html', 'lang')).toBe(lang);
      expect(await attr('meta[property="og:image:width"]', 'content')).toBe('1200');
      expect(await attr('meta[property="og:image:height"]', 'content')).toBe('630');
      expect((await attr('meta[property="og:image:alt"]', 'content')) ?? '').not.toBe('');
      if (alt) expect(await attr('meta[property="og:image:alt"]', 'content')).toBe(alt);
      expect(await attr('meta[name="twitter:card"]', 'content')).toBe('summary_large_image');
    }
  });

  test('모든 og:image 주소가 200이고 1200x630 JPEG(작은 파일, 메타데이터 없음)', async ({
    dist: s,
    request,
  }) => {
    const urls = new Set<string>(['/']);
    for (const p of projects) urls.add(`/work/${p.slug}/`);
    const images = new Set<string>();
    for (const u of urls) {
      const html = await (await request.get(`${s.origin}${u}`)).text();
      const m = html.match(/<meta property="og:image" content="([^"]+)"/);
      expect(m, u).toBeTruthy();
      images.add((m as RegExpMatchArray)[1]);
    }
    expect(images.size).toBe(projects.length + 1);
    for (const abs of images) {
      const res = await request.get(`${s.origin}${new URL(abs).pathname}`);
      expect(res.status(), abs).toBe(200);
      expect(res.headers()['content-type'], abs).toBe('image/jpeg');
      const body = await res.body();
      expect(body.length, abs).toBeLessThan(300 * 1024);
      const meta = await sharp(body).metadata();
      expect([meta.format, meta.width, meta.height], abs).toEqual(['jpeg', 1200, 630]);
      expect(meta.exif, abs).toBeUndefined();
    }
  });

  test('robots.txt와 사이트맵 응답', async ({ dist: s, request }) => {
    const robots = await (await request.get(`${s.origin}/robots.txt`)).text();
    expect(robots).toContain('Sitemap: https://iduk.co.kr/sitemap-index.xml');
    expect(robots).not.toMatch(/Disallow:\s*\S/);
    const idx = await (await request.get(`${s.origin}/sitemap-index.xml`)).text();
    expect(idx).toContain('sitemap-0.xml');
  });
});
