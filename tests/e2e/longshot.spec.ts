import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const root = join(import.meta.dirname, '../..');
const images = JSON.parse(readFileSync(join(root, 'src/content/images.json'), 'utf8')) as Record<
  string,
  { width: number; height: number }
>;

/** 긴 캡처(longshot) 블록이 있는 공개 글. 콘텐츠 JSON에서 읽는다. */
const withLongshot = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'src/content/projects', f), 'utf8')))
  .flatMap((p) =>
    p.blocks
      .filter((b: { type: string }) => b.type === 'longshot')
      .map((b: { image: string }) => ({ slug: p.slug as string, image: b.image })),
  );

const FRAME_MAX = 960; // LongShot.astro의 틀 최대 폭(CSS px)
const prefixes = ['', '/en'];
const pages = withLongshot.flatMap((p) => prefixes.map((prefix) => ({ ...p, prefix })));

const SAMPLE = '/work/telecare-service-app/'; // 1920x8865, 가장 긴 캡처
const linkName = (prefix: string) => (prefix ? 'View full size' : '원본 크기로 보기');
const region = (page: Page) =>
  page.getByRole('region', { name: /긴 화면 캡처|Long screen capture/ });

/** 지연 로드 이미지가 실제로 불러와질 때까지 기다린다. */
async function loaded(page: Page) {
  const r = region(page);
  await r.scrollIntoViewIfNeeded();
  const img = r.locator('img');
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true);
  return img;
}

test.describe('LongShot 영역', () => {
  test('공개 글에 긴 캡처가 있다', () => {
    expect(withLongshot.length).toBe(9);
  });

  for (const { slug, image, prefix } of pages) {
    const url = `${prefix}/work/${slug}/`;
    const hasLink = images[image].width > FRAME_MAX;

    test(`${url} 틀, 이미지 비율, 링크`, async ({ page, request }) => {
      await page.goto(url);
      const r = region(page);
      await expect(r).toHaveCount(1);
      await expect(r).toHaveAttribute('tabindex', '0');

      // width/height 속성 비율이 실제 이미지와 같다(CLS 방지).
      const img = await loaded(page);
      const dims = await img.evaluate((el: HTMLImageElement) => ({
        w: Number(el.getAttribute('width')),
        h: Number(el.getAttribute('height')),
        nw: el.naturalWidth,
        nh: el.naturalHeight,
      }));
      expect(dims.w).toBeGreaterThan(0);
      expect(Math.abs(dims.w / dims.h / (dims.nw / dims.nh) - 1)).toBeLessThan(0.01);

      const link = page.getByRole('link', { name: linkName(prefix) });
      if (!hasLink) {
        await expect(link).toHaveCount(0);
        return;
      }
      await expect(link).toHaveCount(1);
      await expect(link).not.toHaveAttribute('download', /.*/);
      const href = (await link.getAttribute('href')) as string;
      expect(href).toMatch(/^\/_astro\/.+\.(webp|avif)$/);
      const res = await request.get(href);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toMatch(/image\/(webp|avif)/);
      // 링크 대상은 틀 안에 보이는 폭(960px)보다 큰 파일이다.
      const natural = await page.evaluate(
        (src) =>
          new Promise<number>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i.naturalWidth);
            i.onerror = () => reject(new Error(`load failed: ${src}`));
            i.src = src;
          }),
        href,
      );
      expect(natural).toBeGreaterThan(FRAME_MAX);
    });

    test(`${url} 360px DPR3 첫 로드는 변형 하나만, 가장 큰 것은 받지 않는다`, async ({
      browser,
    }) => {
      const ctx = await browser.newContext({
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      });
      const page = await ctx.newPage();
      const requested = new Set<string>();
      page.on('request', (req) => {
        requested.add(new URL(req.url()).pathname);
      });
      await page.goto(url);
      const img = await loaded(page);
      await page.waitForLoadState('networkidle');

      const html = await img.evaluate((el) => el.parentElement?.innerHTML ?? '');
      const candidates = [...html.matchAll(/(\/_astro\/[^\s,"]+)\s+(\d+)w/g)].map((m) => ({
        url: m[1],
        w: Number(m[2]),
      }));
      expect(candidates.length).toBeGreaterThan(0);
      const largest = Math.max(...candidates.map((c) => c.w));
      expect(largest).toBeLessThanOrEqual(1920); // 2560 변형은 후보에 없다
      const got = candidates.filter((c) => requested.has(c.url));
      expect(got, `받은 변형: ${JSON.stringify(got)}`).toHaveLength(1);
      expect(got[0].w).toBeLessThanOrEqual(1280);
      if (largest > 1280) expect(got[0].w).toBeLessThan(largest);
      await ctx.close();
    });
  }

  test('region 의미와 한국어/영어 레이블', async ({ page }) => {
    await page.goto(SAMPLE);
    const r = page.locator('[role="region"][tabindex="0"]');
    await expect(r).toHaveCount(1);
    expect(await r.getAttribute('aria-label')).toBe('긴 화면 캡처, 방향키로 스크롤');
    await page.goto(`/en${SAMPLE}`);
    expect(await page.locator('[role="region"]').getAttribute('aria-label')).toBe(
      'Long screen capture, scroll with arrow keys',
    );
  });

  test('키보드로 틀 안이 스크롤된다', async ({ page }) => {
    await page.goto(SAMPLE);
    const r = region(page);
    await loaded(page);
    const top = () => r.evaluate((el) => el.scrollTop);
    // 병렬 부하에서 첫 키 입력이 사라질 수 있어, 포커스를 확인하고 변하지 않으면 다시 누른다.
    for (const key of ['ArrowDown', 'PageDown']) {
      const before = await top();
      await expect(async () => {
        await r.focus();
        await expect(r).toBeFocused();
        await page.keyboard.press(key);
        await expect.poll(top, { timeout: 1000 }).toBeGreaterThan(before);
      }).toPass({ timeout: 10_000 });
    }
  });

  test('틀이 높이 제한을 지키고 내용이 더 길다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(SAMPLE);
    const m = await region(page).evaluate((el) => ({
      client: el.clientHeight,
      scroll: el.scrollHeight,
      overflowY: getComputedStyle(el).overflowY,
      overscroll: getComputedStyle(el).overscrollBehaviorY,
    }));
    expect(m.overflowY).toBe('auto');
    expect(m.overscroll).toBe('auto');
    expect(m.scroll).toBeGreaterThan(m.client * 2);
    expect(m.client).toBeLessThanOrEqual(800 * 0.8 + 1);
  });

  test('데스크톱에서 틀은 960px을 넘지 않는다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SAMPLE);
    const w = await region(page).evaluate((el) => el.getBoundingClientRect().width);
    expect(w).toBeLessThanOrEqual(FRAME_MAX);
    expect(w).toBeGreaterThan(FRAME_MAX - 4);
  });

  test('틀 끝에서 휠을 굴리면 페이지가 이어서 스크롤된다', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(SAMPLE);
    const r = region(page);
    await r.scrollIntoViewIfNeeded();
    await r.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const box = (await r.boundingBox()) as { x: number; y: number; width: number; height: number };
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
  });

  test('링크는 틀의 오른쪽 가장자리에 맞춰진다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SAMPLE);
    const frame = await region(page).evaluate((el) => el.getBoundingClientRect().right);
    const link = await page
      .getByRole('link', { name: '원본 크기로 보기' })
      .evaluate((el) => el.getBoundingClientRect().right);
    expect(Math.abs(link - frame)).toBeLessThanOrEqual(1);
  });

  test('360px에서 가로 스크롤이 없다(한글/영문)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page = await ctx.newPage();
    for (const { url } of pages.map((p) => ({ url: `${p.prefix}/work/${p.slug}/` }))) {
      await page.goto(url);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, url).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });

  test('JS를 끄고도 틀과 링크가 보인다', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(SAMPLE);
    await expect(region(page)).toBeVisible();
    await expect(region(page).locator('img')).toBeVisible();
    await expect(page.getByRole('link', { name: '원본 크기로 보기' })).toBeVisible();
    await ctx.close();
  });

  test('콘솔 오류와 CSP 위반이 없다', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
    });
    page.on('pageerror', (e) => problems.push(String(e)));
    for (const path of [SAMPLE, `/en${SAMPLE}`]) {
      await page.goto(path);
      await region(page).scrollIntoViewIfNeeded();
      await page.waitForLoadState('networkidle');
    }
    expect(problems).toEqual([]);
  });

  test('forced-colors에서 틀 테두리가 보인다', async ({ browser }) => {
    const ctx = await browser.newContext({ forcedColors: 'active' });
    const page = await ctx.newPage();
    await page.goto(SAMPLE);
    const frame = region(page).locator('xpath=..');
    const w = await frame.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(parseFloat(w)).toBeGreaterThanOrEqual(1);
    await ctx.close();
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`포커스 링은 틀 바깥에 있고 페이지 배경과 3:1 이상 대비한다 (${scheme})`, async ({
      browser,
    }) => {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      await page.goto(SAMPLE);
      await loaded(page);
      await region(page).focus();
      await page.keyboard.press('ArrowDown');
      const o = await region(page).evaluate((el) => {
        const frame = el.parentElement as HTMLElement;
        const s = getComputedStyle(frame);
        const rgb = (v: string) => (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const hex = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-bg')
          .trim();
        const bg = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
        return {
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          offset: parseFloat(s.outlineOffset),
          color: rgb(s.outlineColor),
          bg,
          inner: getComputedStyle(el).outlineStyle,
        };
      });
      expect(o.style).not.toBe('none');
      expect(o.width).toBeGreaterThanOrEqual(2);
      expect(o.offset).toBeGreaterThan(0);
      const lum = (c: number[]) => {
        const [r, g, b] = c.map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [hi, lo] = [lum(o.color), lum(o.bg)].sort((a, b) => b - a);
      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(3);
      await ctx.close();
    });
  }

  test('가장자리 그림자가 스크롤에 따라 나타난다(미지원이면 건너뜀)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(SAMPLE);
    const supported = await page.evaluate(() => CSS.supports('animation-timeline: scroll()'));
    test.skip(!supported, 'animation-timeline 미지원');
    const r = region(page);
    const opacity = (sel: string) =>
      r.evaluate((el, q) => {
        const e = el.querySelector(q) as Element;
        return Number.parseFloat(getComputedStyle(e, '::after').opacity);
      }, sel);
    expect(await opacity('.edge-top')).toBe(0);
    expect(await opacity('.edge-bottom')).toBe(1);
    await r.evaluate((el) => {
      el.scrollTop = 1000;
    });
    await expect.poll(() => opacity('.edge-top')).toBe(1);
    await r.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect.poll(() => opacity('.edge-bottom')).toBe(0);
  });

  test('DPR2 데스크톱은 960px보다 큰 선명한 변형을 고른다', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(SAMPLE);
    const img = await loaded(page);
    // 틀 960px x DPR2 = 1920px가 필요하므로 1280w 이상 후보를 고른다.
    // (naturalWidth는 선택된 w 기술자 밀도로 나뉘어 960으로 보이므로 currentSrc의 후보 폭으로 확인한다.)
    const { current, html } = await img.evaluate((el: HTMLImageElement) => ({
      current: new URL(el.currentSrc).pathname,
      html: el.parentElement?.innerHTML ?? '',
    }));
    const picked = [...html.matchAll(/(\/_astro\/[^\s,"]+)\s+(\d+)w/g)].find(
      (m) => m[1] === current,
    );
    expect(Number(picked?.[2])).toBeGreaterThanOrEqual(1280);
    await ctx.close();
  });
});
