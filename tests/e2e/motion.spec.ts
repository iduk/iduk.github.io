import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { expect, type Page, test } from '@playwright/test';

const root = join(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

interface P {
  slug: string;
  featured?: boolean;
}
const projects: P[] = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => read(`src/content/projects/${f}`));
const tags: { id: string }[] = read('src/content/tags.json');
const featured = projects.filter((p) => p.featured);
const sample = projects[0].slug;

const locales = [
  { loc: 'ko', prefix: '' },
  { loc: 'en', prefix: '/en' },
] as const;

const MOTION_PROPS = ['translate', 'scale', 'transform', 'rotate', 'clipPath', 'maskImage'];

/** 현재 문서의 애니메이션 중 이동·확대·마스크를 건드리는 것의 이름. */
const movingAnimations = (page: Page) =>
  page.evaluate((props) => {
    return document
      .getAnimations()
      .filter((a) => {
        const keys = (a.effect as KeyframeEffect | null)?.getKeyframes() ?? [];
        const moving = keys.some((k) => props.some((p) => p in k && String(k[p]) !== 'none'));
        const tr = a instanceof CSSTransition ? props.includes(a.transitionProperty) : false;
        return moving || tr;
      })
      .map((a) =>
        a instanceof CSSAnimation ? a.animationName : (a as CSSTransition).transitionProperty,
      );
  }, MOTION_PROPS);

test.describe('모션 줄이기(reduce)', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const path of ['/', `/work/${sample}/`, '/en/', `/en/work/${sample}/`]) {
    test(`${path}: 이동·확대·마스크 애니메이션 없음, 모두 보임`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(300);
      expect(await movingAnimations(page)).toEqual([]);
      const state = await page.evaluate(() => {
        const sel = '.reveal';
        const els = [...document.querySelectorAll(sel)];
        return {
          count: els.length,
          bad: els
            .filter((e) => {
              const c = getComputedStyle(e);
              return (
                c.opacity !== '1' ||
                c.animationName !== 'none' ||
                c.translate !== 'none' ||
                c.clipPath !== 'none'
              );
            })
            .map((e) => e.className),
        };
      });
      expect(state.count, 'reveal 요소가 있어야 시험이 의미가 있다').toBeGreaterThan(0);
      expect(state.bad).toEqual([]);
    });
  }

  test('호버해도 확대되지 않는다', async ({ page }) => {
    await page.goto(`/work/${sample}/`);
    const img = page.locator('.zoom .pic').first();
    await img.scrollIntoViewIfNeeded();
    await img.hover();
    await page.waitForTimeout(800);
    expect(await img.evaluate((e) => getComputedStyle(e).scale)).toBe('none');
    expect(await movingAnimations(page)).toEqual([]);
  });

  const reduceTransition = async (page: Page, from: string, link: string) => {
    const info = await captureTransition(page, from, link);
    expect(info.hasTransition).toBe(true);
    const pseudos = info.anims.map((a) => a.pseudo ?? '');
    // 공유 요소 이름이 꺼져 있어야 한다: work-* 그룹·이미지 쌍이 없고, 새 문서에 이름도 없다.
    expect(
      pseudos.filter((x) => x.includes('work-')),
      'reduce에서 공유 요소 의사 요소가 있으면 옛/새 크기의 이미지가 겹쳐 보인다',
    ).toEqual([]);
    expect(info.names).toEqual([]);
    // 남는 것은 root의 투명도 교차뿐이고 120ms 이하다.
    expect(pseudos).toContain('::view-transition-old(root)');
    expect(pseudos).toContain('::view-transition-new(root)');
    for (const a of info.anims.filter((x) => x.pseudo?.startsWith('::view-transition'))) {
      const moves = a.keys.filter((k) => MOTION_PROPS.some((p) => k === p));
      expect(moves, `${a.pseudo} ${a.keys}`).toEqual([]);
      expect(a.duration, a.pseudo ?? '').toBeLessThanOrEqual(120);
    }
  };

  test('홈 → 상세: root 교차 페이드만(공유 요소 없음, 120ms 이하)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', '교차 문서 전환은 Chromium 기준');
    await reduceTransition(page, '/', `a[href="/work/${featured[0].slug}/"]`);
  });

  test('목록 → 상세: root 교차 페이드만(공유 요소 없음, 120ms 이하)', async ({
    browser,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', '교차 문서 전환은 Chromium 기준');
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await reduceTransition(page, '/', `a[href="/work/${projects[3].slug}/"]`);
    await ctx.close();
  });
});

/** pagereveal로 새 문서의 ViewTransition과 의사 요소 애니메이션을 캡처한다. */
async function captureTransition(page: Page, from: string, linkSelector: string) {
  await page.addInitScript(() => {
    window.addEventListener('pagereveal', (e) => {
      const vt = (e as Event & { viewTransition?: ViewTransition }).viewTransition;
      sessionStorage.setItem('pr', JSON.stringify({ hasTransition: !!vt }));
      if (!vt) return;
      vt.ready.then(() => {
        const anims = document.getAnimations().map((a) => {
          const eff = a.effect as KeyframeEffect;
          return {
            pseudo: eff.pseudoElement,
            duration: Number(eff.getTiming().duration),
            keys: [...new Set(eff.getKeyframes().flatMap((k) => Object.keys(k)))],
          };
        });
        sessionStorage.setItem(
          'pr',
          JSON.stringify({ hasTransition: true, anims, names: collectNames() }),
        );
      });
    });
    const collectNames = () =>
      [...document.querySelectorAll('*')]
        .map((e) => getComputedStyle(e).viewTransitionName)
        .filter((n) => n && n !== 'none' && n !== 'root');
  });
  // Chromium은 드물게(부하가 큰 실행에서 약 100회 중 1회) 전환을 건너뛰고 일반 이동을 한다.
  // 옵트인(@view-transition)이 빠졌다면 매번 건너뛰므로, 몇 번 다시 시도해도 이 시험은 여전히 실패한다.
  const attempts = 3;
  let raw: { hasTransition?: boolean; anims?: unknown[]; names?: unknown[] } = {};
  for (let attempt = 0; attempt < attempts; attempt++) {
    await page.goto(from);
    // 나가는 문서가 아직 첫 렌더(pagereveal)를 끝내지 못했으면 브라우저는 전환을 건너뛴다. 끝날 때까지 기다린다.
    await page.waitForFunction(() => sessionStorage.getItem('pr') !== null);
    const link = page.locator(linkSelector).first();
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    // 첫 문서의 pagereveal 기록을 지우고, 이동한 문서의 기록만 읽는다.
    await page.evaluate(() => sessionStorage.removeItem('pr'));
    await Promise.all([page.waitForURL((u) => u.pathname !== from), link.click()]);
    await page.waitForFunction((fromPath) => {
      const v = sessionStorage.getItem('pr');
      return (
        !!v &&
        location.pathname !== fromPath &&
        (!JSON.parse(v).hasTransition || 'anims' in JSON.parse(v))
      );
    }, from);
    raw = JSON.parse((await page.evaluate(() => sessionStorage.getItem('pr'))) ?? '{}');
    if (raw.hasTransition) break;
  }
  return {
    hasTransition: !!raw.hasTransition,
    anims: (raw.anims ?? []) as { pseudo: string | null; duration: number; keys: string[] }[],
    names: (raw.names ?? []) as string[],
  };
}

const uniqueNames = (page: Page) =>
  page.evaluate(() => {
    const names = [...document.querySelectorAll('*')]
      .map((e) => getComputedStyle(e).viewTransitionName)
      .filter((n) => n && n !== 'none' && n !== 'root');
    return names;
  });

test.describe('인쇄', () => {
  for (const path of ['/', `/work/${sample}/`]) {
    test(`${path}: 인쇄 미디어에서는 숨김·이동·마스크가 없다`, async ({ page }) => {
      await page.goto(path);
      await page.emulateMedia({ media: 'print' });
      const bad = await page.evaluate(() =>
        [...document.querySelectorAll('.reveal, .zoom .pic')]
          .map((e) => {
            const c = getComputedStyle(e);
            return {
              cls: e.className,
              opacity: c.opacity,
              translate: c.translate,
              scale: c.scale,
              clip: c.clipPath,
              anim: c.animationName,
            };
          })
          .filter(
            (s) =>
              s.opacity !== '1' ||
              s.translate !== 'none' ||
              s.scale !== 'none' ||
              s.clip !== 'none' ||
              s.anim !== 'none',
          ),
      );
      expect(bad).toEqual([]);
      expect(await page.locator('.reveal').count()).toBeGreaterThan(0);
    });
  }

  test('화면 미디어에서는 접힌 곳 아래 .reveal이 실제로 숨어 있다(인쇄 시험이 의미 있음)', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'ViewTimeline은 Chromium 기준');
    await page.goto('/');
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll('.reveal')].filter((e) => getComputedStyle(e).opacity !== '1')
          .length,
    );
    expect(hidden).toBeGreaterThan(0);
  });
});

/** 모든 엔진: 스크롤 등장 요소는 보이는 위치에서는 항상 완전히 보인다(미지원이면 처음부터). */
test.describe('모든 엔진: 내용이 항상 보인다', () => {
  for (const path of ['/', `/work/${sample}/`]) {
    test(`${path}: .reveal을 하나씩 가운데로 가져오면 불투명하고 제자리`, async ({ page }) => {
      await page.goto(path);
      const els = page.locator('.reveal');
      const count = await els.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await els.nth(i).evaluate((e) => e.scrollIntoView({ block: 'center' }));
        await expect.poll(() => els.nth(i).evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
        expect(await els.nth(i).evaluate((e) => getComputedStyle(e).translate)).toMatch(
          /^(none|0px|0px 0px)$/,
        );
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
});

test.describe('@supports 미지원 에뮬레이션(Chromium)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium 전용 에뮬레이션');

  // 실제 Safari/Firefox 대신, 스타일시트의 @supports 조건을 거짓으로 바꿔서 같은 경로를 만든다.
  for (const path of ['/', `/work/${sample}/`]) {
    test(`${path}: 처음부터 전부 보이고 애니메이션이 없다`, async ({ page }) => {
      let rewritten = 0;
      const unsupported = (css: string) =>
        css.replaceAll(
          '@supports (animation-timeline:view())',
          '@supports (animation-timeline:view-unsupported())',
        );
      // 스타일은 HTML에 들어 있다(inlineStylesheets: always). 내용을 바꾸면 메타 CSP의 해시가 깨지므로
      // 이 에뮬레이션에서만 그 메타를 뺀다. 연결된 CSS가 있으면 그것도 바꾼다.
      await page.route('**/*', async (route) => {
        const type = route.request().resourceType();
        if (type !== 'document' && type !== 'stylesheet') return route.continue();
        const res = await route.fetch();
        const text = await res.text();
        let body = unsupported(text);
        if (type === 'document') {
          body = body.replace(/<meta http-equiv="content-security-policy"[^>]*>/i, '');
        }
        rewritten += body.includes('view-unsupported') ? 1 : 0;
        await route.fulfill({ response: res, body });
      });
      await page.goto(path);
      expect(rewritten, '스타일시트가 바뀌어야 시험이 의미가 있다').toBeGreaterThan(0);
      const state = await page.evaluate(() =>
        [...document.querySelectorAll('.reveal')].map((e) => ({
          opacity: getComputedStyle(e).opacity,
          translate: getComputedStyle(e).translate,
          anims: e.getAnimations().length,
          name: getComputedStyle(e).animationName,
        })),
      );
      expect(state.length).toBeGreaterThan(0);
      for (const s of state) {
        expect(s).toEqual({ opacity: '1', translate: 'none', anims: 0, name: 'none' });
      }
    });
  }
});

test.describe('모션 허용(Chromium)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'ViewTimeline·교차 문서 전환은 Chromium 기준',
  );

  test('.reveal은 스크롤 구동 애니메이션이고 보이면 완전히 불투명해진다', async ({ page }) => {
    await page.goto('/');
    const count = await page.locator('.reveal').count();
    expect(count).toBeGreaterThan(0);
    const info = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.reveal')];
      return els.map((e) => {
        const anim = e.getAnimations().find((a) => a instanceof CSSAnimation);
        return {
          timeline: getComputedStyle(e).animationTimeline,
          viewTimeline: anim?.timeline?.constructor.name,
          opacity: Number(getComputedStyle(e).opacity),
        };
      });
    });
    for (const i of info) {
      expect(i.timeline).toContain('view');
      expect(i.viewTimeline).toBe('ViewTimeline');
    }
    // 접힌 곳 아래 요소는 처음엔 투명하다(= 실제로 구동 중)
    expect(info.some((i) => i.opacity < 1)).toBe(true);
    // 하나씩 가운데로 가져오면 완전히 보인다
    const els = page.locator('.reveal');
    for (let i = 0; i < count; i++) {
      await els.nth(i).evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await expect.poll(() => els.nth(i).evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
      expect(await els.nth(i).evaluate((e) => getComputedStyle(e).translate)).toMatch(
        /^(none|0px|0px 0px)$/,
      );
    }
  });

  const viewports = [
    { name: '1280', width: 1280, height: 720 },
    { name: '360', width: 360, height: 740 },
  ];
  for (const { loc, prefix } of locales) {
    for (const vp of viewports) {
      test(`${loc} ${vp.name}px: 최종 LCP 요소는 애니메이션 밖의 이미지다(상세; 홈은 텍스트 목록)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript(() => {
          const w = window as unknown as { __lcp: (PerformanceEntry & { element?: Element })[] };
          w.__lcp = [];
          new PerformanceObserver((l) => {
            for (const e of l.getEntries())
              w.__lcp.push(e as PerformanceEntry & { element?: Element });
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        });
        for (const path of [`${prefix}/work/${sample}/`]) {
          await page.goto(path);
          await page.waitForLoadState('load');
          await page.waitForTimeout(1500); // 이미지 애니메이션이 끝나도록
          // 사용자 입력이 오면 브라우저는 LCP 보고를 멈춘다. 그때까지의 마지막 항목이 최종이다.
          await page.mouse.click(1, 1);
          const res = await page.evaluate(() => {
            const w = window as unknown as { __lcp: (PerformanceEntry & { element?: Element })[] };
            const el = w.__lcp.at(-1)?.element;
            if (!el) return null;
            const chain: Element[] = [];
            for (let n: Element | null = el; n; n = n.parentElement) chain.push(n);
            return {
              entries: w.__lcp.length,
              tag: el.tagName,
              cls: el.className,
              inMotion: !!el.closest('.reveal'),
              animations: chain.flatMap((n) => n.getAnimations().map((a) => a.playState)),
              inCover: !!el.closest('[data-work-row] .cover, figure.cover'),
            };
          });
          expect(res, `${path}: LCP 항목 없음`).not.toBeNull();
          expect(res?.tag, `${path}: LCP가 이미지가 아님 (${res?.cls})`).toBe('IMG');
          expect(res?.inCover, path).toBe(true);
          expect(res?.inMotion, path).toBe(false);
          expect(res?.animations, path).toEqual([]);
        }
      });
    }
  }

  test('호버 가능한 환경에서만 이미지가 1.03배로 확대된다', async ({ page }) => {
    await page.goto(`/work/${sample}/`);
    const img = page.locator('.zoom .pic').first();
    await img.scrollIntoViewIfNeeded();
    expect(await img.evaluate((e) => getComputedStyle(e).scale)).toBe('none');
    await img.hover();
    await expect.poll(() => img.evaluate((e) => getComputedStyle(e).scale)).toBe('1.03');
    const t = await img.evaluate((e) => {
      const c = getComputedStyle(e);
      return {
        dur: c.transitionDuration,
        prop: c.transitionProperty,
        ease: c.transitionTimingFunction,
      };
    });
    expect(t.dur).toBe('0.64s');
    expect(t.prop).toContain('scale');
    expect(t.ease).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    // 확대해도 가로 스크롤·레이아웃 이동이 없다
    const frame = img.locator('xpath=ancestor::*[contains(@class,"zoom")][1]');
    const before = await frame.evaluate((e) => e.getBoundingClientRect().toJSON());
    await page.waitForTimeout(700);
    const after = await frame.evaluate((e) => e.getBoundingClientRect().toJSON());
    expect(after).toEqual(before);
    expect(await frame.evaluate((e) => getComputedStyle(e).overflow)).toBe('hidden');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test('hover:none 터치 환경에서는 탭해서 :hover가 걸려도 확대되지 않는다', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 800 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    // 링크가 아닌 상세 페이지의 이미지를 탭한다(홈 커버는 탭하면 이동한다).
    await page.goto(`/work/${sample}/`);
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
    const img = page.locator('figure.zoom .pic').first();
    await img.scrollIntoViewIfNeeded();
    await img.tap();
    // 탭은 :hover를 남긴다. 그런데도 확대되지 않아야 시험이 의미가 있다.
    expect(await img.evaluate((e) => e.parentElement?.closest('.zoom')?.matches(':hover'))).toBe(
      true,
    );
    await page.waitForTimeout(800);
    expect(await img.evaluate((e) => getComputedStyle(e).scale)).toBe('none');
    await ctx.close();
  });

  test('홈 → 상세: 교차 문서 전환과 공유 이름(양쪽 한 번씩)', async ({ page }) => {
    const slug = featured[1].slug;
    await page.goto('/');
    const home = await uniqueNames(page);
    expect(new Set(home).size).toBe(home.length);
    expect(home.filter((n) => n === `work-${slug}`)).toHaveLength(1);
    const info = await captureTransition(page, '/', `a[href="/work/${slug}/"]`);
    expect(info.hasTransition).toBe(true);
    expect(new Set(info.names).size).toBe(info.names.length);
    expect(info.names.filter((n) => n === `work-${slug}`)).toHaveLength(1);
    const pseudos = info.anims.map((a) => a.pseudo);
    expect(pseudos).toContain('::view-transition-old(root)');
    expect(pseudos).toContain('::view-transition-new(root)');
    expect(pseudos).toContain(`::view-transition-group(work-${slug})`);
    for (const a of info.anims.filter((x) => x.pseudo?.includes('(root)'))) {
      expect(a.duration).toBe(320);
    }
  });

  test('목록 → 상세: 호버한 행의 이미지가 이어진다', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const slug = projects[3].slug;
    const list = await (async () => {
      await page.goto('/');
      return uniqueNames(page);
    })();
    expect(new Set(list).size).toBe(list.length);
    expect(list.filter((n) => n === `work-${slug}`)).toHaveLength(1);
    const info = await captureTransition(page, '/', `a[href="/work/${slug}/"]`);
    expect(info.hasTransition).toBe(true);
    expect(info.names.filter((n) => n === `work-${slug}`)).toHaveLength(1);
    expect(new Set(info.names).size).toBe(info.names.length);
    expect(info.anims.map((a) => a.pseudo)).toContain(`::view-transition-group(work-${slug})`);
    await ctx.close();
  });

  test('상세 이전/다음 링크는 현재 대표 이미지 이름을 중복하지 않는다', async ({ page }) => {
    for (const p of projects) {
      await page.goto(`/work/${p.slug}/`);
      const names = await uniqueNames(page);
      expect(names, p.slug).toEqual([`work-${p.slug}`]);
    }
  });
});

test.describe('JS 라우터 없음', () => {
  const jsFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const f = join(dir, n);
      if (dir === dist && n === 'html') return [];
      if (statSync(f).isDirectory()) return jsFiles(f);
      return n.endsWith('.js') ? [f] : [];
    });

  test('dist JS와 HTML에 ClientRouter·전환 스크립트가 없다', () => {
    const banned =
      /ClientRouter|astro:transitions|data-astro-transition|startViewTransition|astro-route-announcer/;
    for (const f of jsFiles(dist)) expect(readFileSync(f, 'utf8'), f).not.toMatch(banned);
    for (const f of ['index.html', `work/${sample}/index.html`]) {
      expect(readFileSync(join(dist, f), 'utf8'), f).not.toMatch(banned);
    }
  });

  test('홈 첫 화면 JS는 S10 이전(스크립트 2개, 1025B)보다 늘지 않았다', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8');
    let raw = 0;
    let gz = 0;
    let n = 0;
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      n++;
      const src = m[1].match(/\bsrc="([^"]+)"/)?.[1];
      const body = src ? readFileSync(join(dist, src), 'utf8') : m[2];
      raw += Buffer.byteLength(body);
      gz += gzipSync(body).length;
    }
    expect(n).toBeLessThanOrEqual(2);
    expect(raw).toBeLessThanOrEqual(347 + 678);
    expect(gz).toBeLessThanOrEqual(266 + 395);
  });
});

test.describe('가로 스크롤과 콘솔 오류 없음(360px, 모션 켬)', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    '전 페이지 순회는 Chromium에서 한 번만',
  );
  test.use({ viewport: { width: 360, height: 740 } });
  const paths = [
    ...locales.flatMap(({ prefix }) => [
      `${prefix}/`,
      ...tags.map((t) => `${prefix}/work/tag/${t.id}/`),
      ...projects.map((p) => `${prefix}/work/${p.slug}/`),
    ]),
  ];
  for (const path of paths) {
    test(path, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(path);
      // 끝까지 스크롤하며 .reveal을 모두 통과시킨 뒤에도 가로 스크롤이 없다
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
          scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(() => r(null)));
        }
      });
      const w = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(w[0]).toBeLessThanOrEqual(w[1]);
      expect(errors).toEqual([]);
    });
  }
});
