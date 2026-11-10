/**
 * 빌드한 dist를 Lighthouse CI(모바일 기본 프리셋)로 측정하고 기준을 검사한다: `pnpm lighthouse`.
 * 설정은 lighthouserc.json. 먼저 `pnpm build`가 필요하다. 추가 인자는 lhci autorun에 그대로 넘긴다
 * (예: `pnpm lighthouse --collect.numberOfRuns=1`). 끝나면 URL별 중앙값 표를 출력한다.
 * Chrome은 $CHROME_PATH가 없으면 Playwright가 설치한 Chromium을 쓴다(로컬과 CI가 같은 브라우저).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(fileURLToPath(import.meta.url), '../..');

type Lhr = {
  finalDisplayedUrl?: string;
  finalUrl: string;
  categories: Record<string, { score: number | null }>;
  audits: Record<string, { numericValue?: number }>;
};

const pct = (s: number | null | undefined) => (s == null ? '-' : String(Math.round(s * 100)));
const seconds = (ms?: number) => (ms == null ? '-' : (ms / 1000).toFixed(2));

function summarize(dir: string): string[] {
  const byUrl = new Map<string, Lhr[]>();
  for (const f of readdirSync(dir).filter((n) => /^lhr-\d+\.json$/.test(n))) {
    const r = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Lhr;
    const path = new URL(r.finalDisplayedUrl ?? r.finalUrl).pathname;
    byUrl.set(path, [...(byUrl.get(path) ?? []), r]);
  }
  const header = ['page', 'perf', 'a11y', 'bp', 'seo', 'LCP s', 'CLS', 'TBT ms', 'JS KB', 'runs'];
  const rows = [header];
  for (const [path, runs] of [...byUrl].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = [...runs].sort(
      (a, b) => (a.categories.performance?.score ?? 0) - (b.categories.performance?.score ?? 0),
    );
    const m = sorted[Math.floor(sorted.length / 2)] as Lhr;
    const a = m.audits;
    const js = (
      a['network-requests'] as unknown as {
        details?: { items?: { resourceType?: string; transferSize?: number }[] };
      }
    )?.details?.items;
    const jsKb = (js ?? [])
      .filter((i) => i.resourceType === 'Script')
      .reduce((s, i) => s + (i.transferSize ?? 0), 0);
    rows.push([
      path,
      pct(m.categories.performance?.score),
      pct(m.categories.accessibility?.score),
      pct(m.categories['best-practices']?.score),
      pct(m.categories.seo?.score),
      seconds(a['largest-contentful-paint']?.numericValue),
      (a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3),
      String(Math.round(a['total-blocking-time']?.numericValue ?? 0)),
      (jsKb / 1024).toFixed(1),
      String(runs.length),
    ]);
  }
  const w = header.map((_, i) => Math.max(...rows.map((r) => (r[i] as string).length)));
  return rows.map((r) => r.map((c, i) => c.padEnd(w[i] as number)).join('  '));
}

if (!existsSync(join(root, 'dist/index.html'))) {
  console.error('dist/ is missing: run `pnpm build` first.');
  process.exit(1);
}
const env = { ...process.env };
env.CHROME_PATH ||= chromium.executablePath();
if (!existsSync(env.CHROME_PATH)) {
  console.error(
    `Chrome not found at ${env.CHROME_PATH}: run \`pnpm exec playwright install chromium\`.`,
  );
  process.exit(1);
}
const lhci = join(root, 'node_modules/.bin/lhci');
const res = spawnSync(lhci, ['autorun', '--config=lighthouserc.json', ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit',
});
const out = join(root, '.lighthouseci');
if (existsSync(out)) console.log(`\n${summarize(out).join('\n')}`);
process.exit(res.status ?? 1);
