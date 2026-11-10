/**
 * 접근성(axe-core, 실제 Chromium). 두 언어의 모든 페이지(홈, 목록, 태그 전부, 상세 전부, 404)가 위반 0이어야 한다.
 *
 * 규칙 집합: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa(WCAG 2.2 AA: 대상 크기 포함) + best-practice(랜드마크,
 * 제목 순서, 중복 id 등). 끈 규칙은 없다.
 *
 * 움직임: 스크롤에 따라 나타나는 요소(`.reveal`)는 화면에 들어오는 중에 투명도가 1 미만이라 색 대비가 중간 값으로
 * 잡힌다(정적 상태의 위반이 아님). 전체 훑기는 `prefers-reduced-motion: reduce`로 최종 상태를 보고, 움직임이 켜진
 * 상태에서는 대표 페이지를 끝까지 스크롤해 모든 요소가 최종 상태가 된 뒤 다시 본다.
 * 테마: 대표 페이지는 라이트·다크를 각각 본다(localStorage `theme`).
 * 데모(/html/*): 복사해 온 서드파티 정적 페이지라 사이트 규칙 대상이 아니다. 위반 수만 기록하고 실패시키지 않는다.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';
import { allPages, demoIndexes, representativePages, themePages } from '../helpers/site-pages';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

async function ready(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
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
  });
}

/** 끝까지 스크롤해서 스크롤 구동 애니메이션이 모두 최종 상태가 되게 한다. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight / 2));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 200));
  });
}

async function violations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return r.violations.map(
    (v) =>
      `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')}`,
  );
}

async function open(page: Page, path: string) {
  const res = await page.goto(path);
  if (path === '/__not-found__/') expect(res?.status()).toBe(404);
  else expect(res?.status(), path).toBe(200);
  await ready(page);
}

test.describe('사이트 목록', () => {
  test('시험 대상이 사이트맵의 페이지와 같다', async ({ request }) => {
    const xml = await (await request.get('/sitemap-0.xml')).text();
    const inMap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => new URL(m[1] as string).pathname)
      .sort();
    const ours = allPages
      .filter((p) => p.kind !== '404')
      .map((p) => p.path)
      .sort();
    expect(ours).toEqual(inMap);
  });
});

test.describe('axe: 모든 페이지(움직임 줄임, 기본 테마)', () => {
  test.use({ reducedMotion: 'reduce' });
  for (const p of allPages) {
    test(`${p.loc} ${p.kind} ${p.path}`, async ({ page }) => {
      await open(page, p.path);
      expect(await violations(page)).toEqual([]);
    });
  }
});

test.describe('axe: 움직임을 켜고 끝까지 스크롤한 뒤(대표 페이지)', () => {
  for (const p of representativePages) {
    test(`${p.loc} ${p.kind} ${p.path}`, async ({ page }) => {
      await open(page, p.path);
      await scrollThrough(page);
      expect(await violations(page)).toEqual([]);
    });
  }
});

for (const theme of ['light', 'dark'] as const) {
  test.describe(`axe: ${theme} 테마(대표 페이지)`, () => {
    test.use({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const p of themePages) {
      test(`${theme} ${p.loc} ${p.kind} ${p.path}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
        await open(page, p.path);
        expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
        expect(await violations(page)).toEqual([]);
      });
    }
  });
}

test.describe('axe: 데모 첫 페이지(정보용, 실패시키지 않음)', () => {
  for (const path of demoIndexes) {
    test(path, async ({ page }, info) => {
      await page.goto(path);
      const v = await violations(page);
      info.annotations.push({
        type: 'demo-violations',
        description: `${v.length}: ${v.map((x) => x.split(' ')[0]).join(', ')}`,
      });
    });
  }
});
