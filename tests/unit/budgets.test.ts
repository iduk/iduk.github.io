import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { analyzeDist, BUDGETS } from '../../scripts/check-budgets';
import {
  analyzePage,
  evaluateSizes,
  MOBILE,
  neededFontUrls,
  overBudget,
  parseFontFaces,
  parseUnicodeRange,
  pickCandidate,
} from '../../scripts/lib/budgets';

const dist = join(import.meta.dirname, '../../dist');

const files = (map: Record<string, Buffer | string>) => (p: string) => {
  const v = map[p];
  return v === undefined ? null : Buffer.from(v);
};

describe('unicode-range와 글꼴 선택', () => {
  it('범위, 단일 코드포인트, 와일드카드를 읽는다', () => {
    expect(parseUnicodeRange('U+0020-007e, U+00a0, U+4??')).toEqual([
      [0x20, 0x7e],
      [0xa0, 0xa0],
      [0x400, 0x4ff],
    ]);
  });

  const css = `
    @font-face{font-family:'F';src:url(/fonts/latin.woff2) format('woff2');unicode-range:U+0020-007e}
    @font-face{font-family:'F';src:url(/fonts/han-a.woff2);unicode-range:U+ac00-ac10}
    @font-face{font-family:'F';src:url(/fonts/han-b.woff2);unicode-range:U+d000-d0ff}
    @font-face{font-family:'F';src:url("/fonts/all.woff2")}`;

  it('본문 글자가 걸리는 파일만 받는다(범위가 없으면 항상)', () => {
    const faces = parseFontFaces(css);
    expect(faces.length).toBe(4);
    const text = new Set([...'abc 가'].map((c) => c.codePointAt(0) as number));
    expect(neededFontUrls(faces, text).sort()).toEqual([
      '/fonts/all.woff2',
      '/fonts/han-a.woff2',
      '/fonts/latin.woff2',
    ]);
    expect(neededFontUrls(faces, new Set([0x41])).sort()).toEqual([
      '/fonts/all.woff2',
      '/fonts/latin.woff2',
    ]);
  });
});

describe('이미지 후보', () => {
  it('sizes를 모바일 폭으로 평가한다', () => {
    expect(evaluateSizes('100vw', 412)).toBe(412);
    expect(evaluateSizes(undefined, 412)).toBe(412);
    expect(evaluateSizes('(min-width: 48rem) 50vw, 100vw', 412)).toBe(412);
    expect(evaluateSizes('(min-width: 48rem) 50vw, 100vw', 1000)).toBe(500);
    expect(evaluateSizes('(max-width: 600px) 300px, 100vw', 412)).toBe(300);
  });

  it('필요한 픽셀 폭 이상인 가장 작은 후보를 고른다', () => {
    const set = '/a-640.avif 640w, /a-960.avif 960w, /a-1280.avif 1280w';
    expect(pickCandidate(set, 412, 1.75)).toBe('/a-960.avif'); // 721px 필요
    expect(pickCandidate(set, 300, 1)).toBe('/a-640.avif');
    expect(pickCandidate(set, 2000, 2)).toBe('/a-1280.avif');
  });
});

describe('analyzePage', () => {
  const js = 'console.log("x".repeat(10));'.repeat(50);
  const css = `.a{color:red}@font-face{font-family:F;src:url(/f/l.woff2);unicode-range:U+0020-007e}@font-face{font-family:F;src:url(/f/k.woff2);unicode-range:U+ac00-d7a3}`;
  const html = (body: string) =>
    `<!doctype html><html><head><link rel="stylesheet" href="/s.css"><style>.b{color:blue}</style><script src="/a.js"></script><script>${js}</script><script type="application/ld+json">{"a":1}</script></head><body>${body}</body></html>`;
  const read = files({
    '/s.css': css,
    '/a.js': js,
    '/f/l.woff2': Buffer.alloc(1000),
    '/f/k.woff2': Buffer.alloc(5000),
    '/i/small.avif': Buffer.alloc(100),
    '/i/big.avif': Buffer.alloc(9000),
  });

  it('JS는 외부 파일과 실행되는 인라인의 gzip 합이고 JSON-LD는 뺀다', () => {
    const m = analyzePage(html('<p>abc</p>'), '/', read);
    expect(m.jsFiles).toBe(2);
    expect(m.jsRequests).toEqual(['/a.js']);
    expect(m.jsGzip).toBe(gzipSync(js, { level: 9 }).length * 2);
  });

  it('CSS는 인라인과 연결 파일의 합, 글꼴은 본문 글자에 맞는 것만', () => {
    const latin = analyzePage(html('<p>abc</p>'), '/', read);
    expect(latin.fonts).toEqual(['/f/l.woff2']);
    expect(latin.fontBytes).toBe(1000);
    expect(latin.cssRaw).toBe(Buffer.byteLength(`${'.b{color:blue}'}${css}`));
    const korean = analyzePage(html('<p>abc 가나다</p>'), '/', read);
    expect(korean.fonts).toEqual(['/f/k.woff2', '/f/l.woff2']);
    expect(korean.fontBytes).toBe(6000);
  });

  it('preload한 글꼴은 글자와 상관없이 센다', () => {
    const h = html('<p>1</p>').replace(
      '<head>',
      '<head><link rel="preload" as="font" href="/f/k.woff2">',
    );
    expect(analyzePage(h, '/', read).fonts).toEqual(['/f/k.woff2', '/f/l.woff2']);
  });

  it('즉시 불러오는 이미지만 모바일 후보로 센다(lazy 제외, AVIF 우선)', () => {
    const pic = (loading: string, big: boolean) =>
      `<picture><source type="image/avif" srcset="/i/small.avif 640w, /i/big.avif 960w" sizes="100vw"><img src="/x.webp" srcset="/x.webp 640w" sizes="100vw" loading="${loading}"></picture>`.replace(
        '/i/small.avif 640w, /i/big.avif 960w',
        big ? '/i/small.avif 100w, /i/big.avif 960w' : '/i/small.avif 640w',
      );
    const m = analyzePage(html(pic('eager', true) + pic('lazy', true)), '/', read);
    expect(m.eagerImages).toEqual([{ src: '/i/big.avif', bytes: 9000 }]);
    expect(m.largestEagerImage).toBe(9000);
    expect(analyzePage(html(pic('lazy', true)), '/', read).eagerImages).toEqual([]);
  });

  it('참조한 파일이 dist에 없으면 0바이트로 통과하지 않고 실패한다', () => {
    const h = `<html><head><link rel="stylesheet" href="/gone.css"><script src="/gone.js"></script></head><body><p>abc</p><img src="/gone.png" srcset="/gone.png 640w" sizes="100vw" loading="eager"></body></html>`;
    const m = analyzePage(h, '/', files({}));
    expect(m.missing).toEqual(['/gone.css', '/gone.js', '/gone.png']);
    expect(overBudget(m, BUDGETS).join()).toContain('missing from dist');
    const fontCss = `<html><head><style>@font-face{font-family:F;src:url(/f/none.woff2);unicode-range:U+0020-007e}</style></head><body>abc</body></html>`;
    expect(analyzePage(fontCss, '/', files({})).missing).toEqual(['/f/none.woff2']);
    expect(
      analyzePage(h, '/', files({ '/gone.css': 'a{}', '/gone.js': 'x', '/gone.png': 'p' })).missing,
    ).toEqual([]);
  });

  it('외부 주소는 dist 파일로 찾지 않는다(missing에도 넣지 않는다)', () => {
    const h =
      '<html><head><script src="https://cdn.example.org/a.js"></script><script src="//cdn.example.org/b.js"></script></head><body></body></html>';
    const m = analyzePage(h, '/', files({}));
    expect(m.missing).toEqual([]);
    expect(m.jsFiles).toBe(0);
  });

  it('상대 경로는 페이지 위치 기준으로 푼다', () => {
    const h = '<html><head><script src="a.js"></script></head><body></body></html>';
    expect(analyzePage(h, '/x/y/', files({ '/x/y/a.js': 'var a=1;' })).jsFiles).toBe(1);
  });
});

describe('overBudget', () => {
  const ok = {
    jsGzip: 1,
    jsFiles: 1,
    jsRequests: [],
    missing: [],
    cssRaw: 1,
    cssGzip: 1,
    fonts: ['a'],
    fontBytes: 1,
    eagerImages: [],
    largestEagerImage: 1,
  };
  it('예산 안이면 비어 있고, 넘으면 항목마다 알려 준다', () => {
    expect(overBudget(ok, BUDGETS)).toEqual([]);
    expect(overBudget({ ...ok, jsGzip: BUDGETS.jsGzipBytes + 1 }, BUDGETS).join()).toContain(
      'JS gzip',
    );
    expect(overBudget({ ...ok, cssGzip: BUDGETS.cssGzipBytes + 1 }, BUDGETS).join()).toContain(
      'CSS gzip',
    );
    expect(
      overBudget({ ...ok, fonts: Array(BUDGETS.fontFiles + 1).fill('f') }, BUDGETS).join(),
    ).toContain('font files');
    expect(overBudget({ ...ok, fontBytes: BUDGETS.fontBytes + 1 }, BUDGETS).join()).toContain(
      'font bytes',
    );
    expect(
      overBudget({ ...ok, largestEagerImage: BUDGETS.eagerImageBytes + 1 }, BUDGETS).join(),
    ).toContain('eager image');
  });

  it('JS 예산은 계획의 30KB gzip이고 모바일 기준은 412px, DPR 1.75다', () => {
    expect(BUDGETS.jsGzipBytes).toBe(30 * 1024);
    expect(MOBILE).toEqual({ width: 412, dpr: 1.75 });
  });
});

// `pnpm build` 뒤에만 돈다(CI의 test 단계는 빌드 전이라 건너뛰고, 같은 검사를 `pnpm budgets`가 빌드 뒤에 한다).
describe.skipIf(!existsSync(join(dist, 'index.html')))('빌드 결과 전체', () => {
  it('모든 사이트 페이지가 예산 안이다', () => {
    const rows = analyzeDist(dist);
    expect(rows.length).toBeGreaterThan(55); // 작업 24개 x 2언어 + 목록·태그·홈·404
    const failures = rows.flatMap((r) => overBudget(r.m, BUDGETS).map((f) => `${r.page}: ${f}`));
    expect(failures).toEqual([]);
  }, 120_000);
});
