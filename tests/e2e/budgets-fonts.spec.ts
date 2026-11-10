/**
 * scripts/lib/budgets.ts의 HTML 분석(글꼴·스크립트·즉시 이미지)이 실제 Chromium이 받는 것과 같은지 확인한다.
 * 분석이 틀리면 예산 검사(`pnpm budgets`)가 의미를 잃으므로, 대표 페이지를 모바일 크기로 열어 요청을 비교한다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { analyzePage, MOBILE } from '../../scripts/lib/budgets';
import { representativePages } from '../helpers/site-pages';

const dist = join(import.meta.dirname, '../../dist');
const read = (urlPath: string) => {
  try {
    return readFileSync(join(dist, urlPath.replace(/^\/+/, '')));
  } catch {
    return null;
  }
};

test.use({ viewport: { width: MOBILE.width, height: 823 }, deviceScaleFactor: MOBILE.dpr });

const pages = representativePages.filter((p) => p.kind !== '404');

for (const p of pages) {
  test(`${p.path}: 분석한 글꼴·스크립트가 실제 요청과 같다`, async ({ page }) => {
    const fonts = new Set<string>();
    const scripts = new Set<string>();
    page.on('request', (r) => {
      const path = new URL(r.url()).pathname;
      if (r.resourceType() === 'font') fonts.add(path);
      if (r.resourceType() === 'script') scripts.add(path);
    });
    await page.goto(p.path);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const file = join(dist, p.path.replace(/^\//, ''), 'index.html');
    const m = analyzePage(readFileSync(file, 'utf8'), p.path, read);
    expect([...fonts].sort()).toEqual(m.fonts);
    expect([...scripts].sort()).toEqual(m.jsRequests);
  });
}

test('즉시 불러오는 이미지의 모바일 후보가 실제 요청과 같다', async ({ page }) => {
  for (const p of pages.filter((x) => x.kind === 'home' || x.kind === 'detail').slice(0, 6)) {
    const imgs = new Set<string>();
    page.on('request', (r) => {
      if (r.resourceType() === 'image') imgs.add(new URL(r.url()).pathname);
    });
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');
    const m = analyzePage(
      readFileSync(join(dist, p.path.replace(/^\//, ''), 'index.html'), 'utf8'),
      p.path,
      read,
    );
    for (const e of m.eagerImages) expect([...imgs], `${p.path}: ${e.src}`).toContain(e.src);
    page.removeAllListeners('request');
  }
});
