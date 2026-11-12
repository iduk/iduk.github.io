/**
 * 첫 로드 바이트 예산 검사: `pnpm budgets`(dist 필요). dist의 모든 사이트 페이지(데모 제외)를 분석해
 * 예산을 넘는 페이지가 있으면 종료 코드 1. 종류(홈·목록·태그·상세)별 최대값 표를 출력한다.
 * Lighthouse(`pnpm lighthouse`)와 달리 브라우저 없이 결정적이다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePage, type Budgets, overBudget, type PageMetrics } from './lib/budgets';

/**
 * 예산(첫 로드). 근거:
 *  - JS: docs 성능 목표 "첫 화면 JS gzip 30KB 이하".
 *  - CSS: 스타일시트를 HTML에 넣으므로(astro.config inlineStylesheets) 페이지마다 다시 받는 바이트다. Tailwind 토대,
 *    토큰, 글꼴 선언(92개 unicode-range)이 대부분이라 현재 값에 여유를 둔 상한을 둔다.
 *  - 글꼴: 사이트 전용 부분 글꼴(약 38KB, scripts/make-site-font.py) 한 개가 본문 글자를 모두 맡는다. 그래서 1개·60KB.
 *  - 이미지: 모바일 폭에서 즉시 불러오는 이미지 하나의 상한.
 */
export const BUDGETS: Budgets = {
  jsGzipBytes: 30 * 1024,
  cssGzipBytes: 12 * 1024,
  fontFiles: 1,
  fontBytes: 60 * 1024,
  eagerImageBytes: 80 * 1024,
};

export function sitePages(dist: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const rel = relative(dist, full).split(sep).join('/');
      if (rel === 'html' || rel === 'files' || rel === 'og') continue;
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.html')) out.push(rel);
    }
  };
  walk(dist);
  return out.sort();
}

export function analyzeDist(dist: string): { page: string; m: PageMetrics }[] {
  const read = (urlPath: string) => {
    const f = join(dist, urlPath.replace(/^\/+/, ''));
    return f.startsWith(dist) && existsSync(f) && statSync(f).isFile() ? readFileSync(f) : null;
  };
  return sitePages(dist).map((rel) => {
    const pagePath = `/${rel.replace(/index\.html$/, '')}`;
    return {
      page: pagePath,
      m: analyzePage(readFileSync(join(dist, rel), 'utf8'), pagePath, read),
    };
  });
}

const kindOf = (p: string) =>
  /^(?:\/en)?\/$/.test(p)
    ? 'home'
    : /^(?:\/en)?\/work\/$/.test(p)
      ? 'list'
      : /\/work\/tag\//.test(p)
        ? 'tag'
        : /\/work\//.test(p)
          ? 'detail'
          : 'other';

const kb = (n: number) => (n / 1024).toFixed(1);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = join(fileURLToPath(import.meta.url), '../../dist');
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('dist/ is missing: run `pnpm build` first.');
    process.exit(1);
  }
  const rows = analyzeDist(dist);
  const worst = new Map<string, { page: string; m: PageMetrics }[]>();
  for (const r of rows) worst.set(kindOf(r.page), [...(worst.get(kindOf(r.page)) ?? []), r]);
  console.log(`budgets: ${rows.length} pages (mobile ${412}px, DPR 1.75)`);
  console.log(
    'kind    pages  JS gz KB  CSS gz KB  CSS raw KB  fonts  font KB  largest eager image KB',
  );
  for (const [kind, list] of [...worst].sort(([a], [b]) => a.localeCompare(b))) {
    const max = (f: (m: PageMetrics) => number) => Math.max(...list.map((r) => f(r.m)));
    console.log(
      `${kind.padEnd(7)} ${String(list.length).padStart(5)}  ${kb(max((m) => m.jsGzip)).padStart(8)}  ${kb(max((m) => m.cssGzip)).padStart(9)}  ${kb(max((m) => m.cssRaw)).padStart(10)}  ${String(max((m) => m.fonts.length)).padStart(5)}  ${kb(max((m) => m.fontBytes)).padStart(7)}  ${kb(max((m) => m.largestEagerImage)).padStart(8)}`,
    );
  }
  console.log(
    `limits: JS ${kb(BUDGETS.jsGzipBytes)} KB gz, CSS ${kb(BUDGETS.cssGzipBytes)} KB gz, fonts ${BUDGETS.fontFiles} files / ${kb(BUDGETS.fontBytes)} KB, eager image ${kb(BUDGETS.eagerImageBytes)} KB`,
  );
  const failures = rows.flatMap((r) => overBudget(r.m, BUDGETS).map((f) => `${r.page}: ${f}`));
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(
    failures.length === 0
      ? 'OK: all pages within budget'
      : `FAILED: ${failures.length} budget violation(s)`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}
