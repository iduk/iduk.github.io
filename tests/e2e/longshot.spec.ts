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

const SAMPLE = '/work/telecare-service-app/'; // 1920x8865, 가장 긴 캡처
const SAMPLE_IMAGE = 'telecare-service-app/02-tsp32-ui';

const region = (page: Page) =>
  page.getByRole('region', { name: /긴 화면 캡처|Long screen capture/ });

test.describe('LongShot 영역', () => {
  test('공개 글에 긴 캡처가 있다', () => {
    expect(withLongshot.length).toBe(9);
  });

  for (const { slug } of withLongshot) {
    for (const prefix of ['', '/en']) {
      test(`${prefix}/work/${slug}/ 틀과 링크가 있다`, async ({ page }) => {
        await page.goto(`${prefix}/work/${slug}/`);
        const r = region(page);
        await expect(r).toHaveCount(1);
        await expect(r).toHaveAttribute('tabindex', '0');
        await expect(r.locator('img')).toHaveAttribute('width', /\d+/);
        await expect(r.locator('img')).toHaveAttribute('height', /\d+/);
        const link = page.getByRole('link', {
          name: prefix ? 'View full size' : '원본 크기로 보기',
        });
        await expect(link).toHaveCount(1);
        await expect(link).not.toHaveAttribute('download', /.*/);
      });
    }
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
    await r.scrollIntoViewIfNeeded();
    await r.focus();
    await expect(r).toBeFocused();
    const top0 = await r.evaluate((el) => el.scrollTop);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => r.evaluate((el) => el.scrollTop)).toBeGreaterThan(top0);
    const top1 = await r.evaluate((el) => el.scrollTop);
    await page.keyboard.press('PageDown');
    await expect.poll(() => r.evaluate((el) => el.scrollTop)).toBeGreaterThan(top1);
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

  test('원본 크기 링크는 200과 webp/avif 이미지를 가리킨다', async ({ page, request }) => {
    await page.goto(SAMPLE);
    const href = await page.getByRole('link', { name: '원본 크기로 보기' }).getAttribute('href');
    expect(href).toMatch(/^\/_astro\/.+\.(webp|avif)$/);
    const res = await request.get(href as string);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/image\/(webp|avif)/);
  });

  test('360px DPR3 모바일 첫 로드는 원본 크기 변형을 받지 않는다', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 740 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const requested: string[] = [];
    page.on('request', (req) => {
      requested.push(new URL(req.url()).pathname);
    });
    await page.goto(SAMPLE);
    const r = region(page);
    await r.scrollIntoViewIfNeeded();
    await page.waitForLoadState('networkidle');
    const img = r.locator('img');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete)).toBe(true);

    const href = (await page
      .getByRole('link', { name: '원본 크기로 보기' })
      .getAttribute('href')) as string;
    // 이 이미지는 960px보다 크므로 원본 크기 파일은 틀 안 후보와 달라야 한다.
    expect(images[SAMPLE_IMAGE].width).toBeGreaterThan(960);
    expect(requested).not.toContain(href);

    const srcset = (await img.evaluate((el) => el.parentElement?.innerHTML ?? '')) as string;
    const widths = [...srcset.matchAll(/\s(\d+)w\b/g)].map((m) => Number(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    expect(Math.max(...widths)).toBeLessThanOrEqual(960);
    expect(srcset).not.toContain(href);
    // 틀 안 이미지는 960px 이하 변형으로 시작한다.
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeLessThanOrEqual(960);
    await ctx.close();
  });

  test('360px에서 가로 스크롤이 없다(한글/영문)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const page = await ctx.newPage();
    for (const { slug } of withLongshot) {
      for (const prefix of ['', '/en']) {
        await page.goto(`${prefix}/work/${slug}/`);
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(over, `${prefix}/work/${slug}/`).toBeLessThanOrEqual(0);
      }
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

  test('포커스 링이 보인다', async ({ page }) => {
    await page.goto(SAMPLE);
    await region(page).focus();
    await page.keyboard.press('ArrowDown');
    const o = await region(page).evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(o.style).not.toBe('none');
    expect(o.width).toBeGreaterThanOrEqual(2);
  });

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
});
