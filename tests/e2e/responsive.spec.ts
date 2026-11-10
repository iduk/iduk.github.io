/**
 * 반응형: 360/768/1280/1920 폭에서 가로 스크롤 없음, 잘린 텍스트 없음, 이미지가 원본보다 커지지 않음, 콘솔 깨끗.
 * 360px은 모든 페이지(두 언어 81쪽), 나머지 폭은 대표 페이지(가장 긴 영문 제목, 가장 긴 캡처, 가장 무거운 글, 데모 글).
 */
import { expect, type Page, test } from '@playwright/test';
import { allPages, representativePages } from '../helpers/site-pages';

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
] as const;

function watchConsole(page: Page, isDoc404: boolean) {
  const problems: string[] = [];
  // 404 문서를 직접 열면 Chromium이 문서 자체의 404를 콘솔 오류로 한 번 남긴다. 그 한 건만 허용한다.
  let docNotFoundLogged = 0;
  page.on('console', (m) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    if (
      isDoc404 &&
      /^Failed to load resource: .*status of 404/.test(m.text()) &&
      docNotFoundLogged++ === 0
    )
      return;
    problems.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${new URL(r.url()).pathname}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !(isDoc404 && r.request().resourceType() === 'document')) {
      problems.push(`http ${r.status()}: ${new URL(r.url()).pathname}`);
    }
  });
  return problems;
}

/** 페이지 안에서 측정한다: 가로 넘침, 잘린 텍스트, 확대된 이미지. */
const measure = (page: Page) =>
  page.evaluate(async () => {
    for (const img of document.querySelectorAll('img')) img.loading = 'eager';
    await Promise.all(
      [...document.images].map((i) =>
        i.complete
          ? true
          : new Promise((r) => {
              i.onload = i.onerror = () => r(true);
            }),
      ),
    );
    await document.fonts.ready;
    const vw = document.documentElement.clientWidth;
    const out = {
      hscroll: [] as string[],
      clipped: [] as string[],
      upscaled: [] as string[],
      images: 0,
    };
    const de = document.documentElement;
    if (de.scrollWidth > vw) out.hscroll.push(`html scrollWidth ${de.scrollWidth} > ${vw}`);
    if (document.body.scrollWidth > vw)
      out.hscroll.push(`body scrollWidth ${document.body.scrollWidth} > ${vw}`);
    const name = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/)[0]}` : ''} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const hasText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '',
      );
      if (!hasText || el.closest('.skip-link')) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.right > vw + 1 || r.left < -1)
        out.hscroll.push(
          `${name(el)} spans ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`,
        );
      const scrolls = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
      if (cs.display !== 'inline' && !scrolls && el.scrollWidth > el.clientWidth + 1) {
        out.clipped.push(
          `${name(el)} scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
        );
      }
    }
    for (const img of document.querySelectorAll('img')) {
      if (!img.currentSrc || img.clientWidth === 0) continue;
      out.images++;
      const probe = new Image();
      probe.src = img.currentSrc;
      await probe.decode().catch(() => undefined);
      if (img.clientWidth > probe.naturalWidth + 1) {
        out.upscaled.push(
          `${img.currentSrc.split('/').pop()} shown ${img.clientWidth}px, native ${probe.naturalWidth}px`,
        );
      }
    }
    return out;
  });

async function check(page: Page, path: string) {
  const is404 = path === '/__not-found__/';
  const problems = watchConsole(page, is404);
  const res = await page.goto(path);
  expect(res?.status(), path).toBe(is404 ? 404 : 200);
  const m = await measure(page);
  expect(m.hscroll, 'horizontal overflow').toEqual([]);
  expect(m.clipped, 'clipped text').toEqual([]);
  expect(m.upscaled, 'images shown larger than native').toEqual([]);
  expect(problems, 'console / network').toEqual([]);
  return m;
}

test.describe('360px: 모든 페이지', () => {
  test.use({ viewport: VIEWPORTS[0] });
  for (const p of allPages) {
    test(`${p.loc} ${p.kind} ${p.path}`, async ({ page }) => {
      await check(page, p.path);
    });
  }
});

for (const vp of VIEWPORTS.slice(1)) {
  test.describe(`${vp.width}px: 대표 페이지`, () => {
    test.use({ viewport: vp });
    for (const p of representativePages) {
      test(`${p.loc} ${p.kind} ${p.path}`, async ({ page }) => {
        await check(page, p.path);
      });
    }
  });
}
