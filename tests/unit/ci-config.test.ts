/**
 * .github/workflows의 보안·순서 속성을 YAML 텍스트에서 정적으로 확인한다(GitHub Actions는 푸시 전에는 돌 수 없다).
 * 각 규칙은 lint 함수의 한 줄이고, 아래 "변형" 시험이 실제 파일을 일부러 망가뜨려 그 규칙이 잡는지 확인한다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// GitHub Actions 표현식 여는 기호(문자열 안의 `${{`가 템플릿 경고에 걸리지 않게 나누어 둔다).
const EXPR = '$' + '{{';
const root = join(import.meta.dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const ci = read('.github/workflows/ci.yml');
const weekly = read('.github/workflows/weekly-cloak-check.yml');
const pkg = JSON.parse(read('package.json')) as {
  engines: { node: string };
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

/** `run:` 값(한 줄 또는 `|`/`>` 블록)을 모아 돌려준다. */
function runBlocks(yaml: string): string[] {
  const lines = yaml.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(?:- )?run:\s*(.*)$/.exec(lines[i] as string);
    if (!m) continue;
    const indent = (m[1] as string).length;
    const value = (m[2] as string).trim();
    if (value === '|' || value === '>' || value === '|-' || value === '>-') {
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j] as string;
        if (l.trim() !== '' && l.length - l.trimStart().length <= indent) break;
        body.push(l);
      }
      out.push(body.join('\n'));
    } else out.push(value);
  }
  return out;
}

/** `name:` 단계 목록(이름, if, 본문 텍스트). */
function steps(yaml: string): { name: string; text: string }[] {
  const parts = yaml.split(/\n(?=\s{6}- name: )/).slice(1);
  return parts.map((t) => ({ name: /- name: (.*)/.exec(t)?.[1] ?? '', text: t }));
}

function lintWorkflow(source: string): string[] {
  const p: string[] = [];
  // 주석 줄은 설명일 뿐이다(예: "pull_request_target은 쓰지 않는다"). 버전 주석(`uses: ... # v6`)은 줄 끝이라 남는다.
  const yaml = source.replace(/^\s*#.*$/gm, '');
  if (!/^permissions:\n\s+contents: read\n/m.test(yaml))
    p.push('top-level permissions must be exactly contents: read');
  if (/:\s*write\b|write-all/.test(yaml)) p.push('no write permissions');
  if (/pull_request_target/.test(yaml)) p.push('pull_request_target is forbidden');
  const uses = [...yaml.matchAll(/^\s*(?:- )?uses:\s*(.+)$/gm)].map((m) => (m[1] as string).trim());
  for (const u of uses) {
    if (!/^[\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+(\.\d+){0,2}$/.test(u))
      p.push(`action must be pinned to a full SHA with a version comment: ${u}`);
    if (!u.startsWith('actions/')) p.push(`only first-party actions/* are allowed: ${u}`);
  }
  for (const b of runBlocks(yaml)) {
    if (/\$\{\{/.test(b)) p.push(`no ${EXPR} }} expression inside run (pass values through env)`);
  }
  for (const s of steps(yaml)) {
    if (/uses: actions\/checkout@/.test(s.text) && !/persist-credentials: false/.test(s.text))
      p.push('checkout must set persist-credentials: false');
  }
  for (const j of yaml.split(/\n(?= {2}[a-z][\w-]*:\n)/).filter((x) => /runs-on:/.test(x))) {
    if (!/timeout-minutes: \d+/.test(j)) p.push('every job needs timeout-minutes');
  }
  if (/secrets\./.test(yaml.replace(/^\s+\w+: \$\{\{ secrets\.[A-Z0-9_]+ \}\}$/gm, '')))
    p.push('secrets must only be mapped into env');
  return p;
}

function lintCi(yaml: string): string[] {
  const p = lintWorkflow(yaml);
  if (!/cancel-in-progress: true/.test(yaml)) p.push('concurrency must cancel in progress');
  if (!/node-version-file: package\.json/.test(yaml))
    p.push('Node version must come from package.json engines');
  const runs = runBlocks(yaml);
  const at = (needle: string) => runs.findIndex((r) => r.includes(needle));
  const order = [
    'corepack enable',
    'pnpm install --frozen-lockfile',
    'playwright install --with-deps chromium',
    'pnpm lint',
    'pnpm check',
    'pnpm test',
    'pnpm build',
    'pnpm check-privacy',
    'pnpm budgets',
    'pnpm e2e',
    'pnpm lighthouse',
  ];
  const idx = order.map((o) => at(o));
  idx.forEach((v, i) => {
    if (v < 0) p.push(`missing step: ${order[i]}`);
    else if (i > 0 && (idx[i - 1] as number) >= v && (idx[i - 1] as number) >= 0)
      p.push(`step order: ${order[i - 1]} must come before ${order[i]}`);
  });
  for (const r of runs)
    if (/pnpm install(?!\s+--frozen-lockfile)/.test(r))
      p.push('pnpm install must use --frozen-lockfile');
  // dist를 읽는 시험은 빌드 전에는 건너뛰어지므로, 빌드 뒤에 `pnpm test`가 한 번 더 있어야 한다.
  const buildAt = runs.findIndex((r) => r.trim() === 'pnpm build');
  if (!runs.slice(buildAt + 1).some((r) => r.trim() === 'pnpm test'))
    p.push('pnpm test must run again after the build');
  const all = steps(yaml);
  const priv = all.find((s) => s.name.startsWith('Write private patterns'));
  if (!priv) p.push('missing step that writes private patterns');
  else {
    if (!/shell: bash/.test(priv.text)) p.push('private patterns step must set shell: bash');
    if (!/\$\{\{ secrets\.IDUK_PRIVATE_PATTERNS_B64 \}\}/.test(priv.text))
      p.push('private patterns must come from a repository secret');
    if (
      /set -x|\becho "?\$PATTERNS|\bcat\b|\bprintenv\b|\benv\b\s*$/m.test(
        priv.text.split('run:')[1] ?? '',
      )
    )
      p.push('private patterns step must not echo the secret');
    if (/>> "?\$GITHUB_ENV/.test(priv.text))
      p.push('do not export the private patterns path to later steps');
  }
  const full = all.find((s) => s.name === 'Privacy and link check');
  const fork = all.find((s) => s.name.includes('fork PR'));
  if (!full || !/IDUK_PRIVATE_PATTERNS: \$\{\{ steps\.private\.outputs\.path \}\}/.test(full.text))
    p.push('check-privacy must receive IDUK_PRIVATE_PATTERNS from the private step');
  if (full && /--allow-missing-private/.test(full.text))
    p.push('the main privacy step must not allow missing private patterns');
  if (full && !/head\.repo\.fork != true/.test(full.text))
    p.push('the main privacy step must not run for fork PRs');
  if (
    !fork ||
    !/--allow-missing-private/.test(fork.text) ||
    !/head\.repo\.fork == true/.test(fork.text) ||
    !/::warning/.test(fork.text)
  ) {
    p.push('fork PR step must be limited to forks and warn loudly');
  }
  const clean = all.findIndex(
    (s) =>
      /rm -f "\$RUNNER_TEMP\/private-patterns\.txt"/.test(s.text) && /if: always\(\)/.test(s.text),
  );
  const e2e = all.findIndex((s) => /pnpm e2e/.test(s.text));
  const privIdx = all.findIndex((s) => s.name === 'Privacy and link check');
  if (clean < 0 || clean < privIdx || clean > e2e)
    p.push(
      'private patterns file must be removed (if: always()) right after the privacy check and before e2e/lighthouse',
    );
  const up = all.find((s) => /upload-artifact@/.test(s.text));
  if (!up || !/if: always\(\)/.test(up.text)) p.push('reports must be uploaded even on failure');
  if (up && /private|\.env|secret|RUNNER_TEMP/i.test(up.text.replace(/# .*$/gm, '')))
    p.push('artifact paths must not include secrets');
  return p;
}

function lintWeekly(yaml: string): string[] {
  const p = lintWorkflow(yaml);
  if (!/^\s+schedule:\n\s+- cron: "[^"]+"/m.test(yaml)) p.push('needs a schedule');
  if (!/workflow_dispatch:/.test(yaml)) p.push('needs workflow_dispatch');
  if (!/SITE_URL: \$\{\{ vars\.SITE_URL \}\}/.test(yaml))
    p.push('the site URL must come from the SITE_URL repository variable via env');
  if (!runBlocks(yaml).some((r) => r.trim() === 'node scripts/cloak-check.ts'))
    p.push('must run scripts/cloak-check.ts');
  if (runBlocks(yaml).some((r) => /install/.test(r))) p.push('must not install dependencies');
  return p;
}

describe('CI 워크플로(정적 검사)', () => {
  it('ci.yml', () => expect(lintCi(ci)).toEqual([]));
  it('weekly-cloak-check.yml', () => expect(lintWeekly(weekly)).toEqual([]));

  it('모든 uses가 40자리 SHA이고 정확히 그 버전 주석이 있다', () => {
    const all = [...ci.matchAll(/uses: ([^@\s]+)@([0-9a-f]{40}) # (v[\d.]+)/g)];
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(new Set(all.map((m) => m[1]))).toEqual(
      new Set(['actions/checkout', 'actions/setup-node', 'actions/upload-artifact']),
    );
    const count = (ci.match(/^\s*(?:- )?uses:/gm) ?? []).length;
    expect(all.length).toBe(count);
  });

  it('워크플로가 부르는 pnpm 스크립트는 package.json에 있다', () => {
    for (const r of [...runBlocks(ci), ...runBlocks(weekly)]) {
      for (const m of r.matchAll(/pnpm (?!exec|install|dlx)([\w:-]+)/g)) {
        expect(pkg.scripts[m[1] as string], `pnpm ${m[1]}`).toBeDefined();
      }
    }
  });

  it('engines.node가 24.x다(CI의 Node 버전 출처)', () => {
    expect(pkg.engines.node).toMatch(/^24\./);
  });

  it('gate 스크립트가 CI와 같은 순서이고 gate:full은 Lighthouse를 더한다', () => {
    const order = [
      'clean',
      'lint',
      'check',
      'test',
      'build',
      'test',
      'check-privacy',
      'budgets',
      'e2e',
    ];
    const parts = (pkg.scripts.gate as string).split(' && ').map((s) => s.replace('pnpm ', ''));
    expect(parts).toEqual(order);
    expect(pkg.scripts['gate:full']).toBe('pnpm gate && pnpm lighthouse');
  });
});

describe('Lighthouse 기준을 풀지 않았다', () => {
  const rc = JSON.parse(read('lighthouserc.json')).ci;
  it('3회 중앙값으로 판정하고 기준은 계획의 목표 그대로이며 모두 error다', () => {
    expect(rc.collect.numberOfRuns).toBeGreaterThanOrEqual(3);
    // 기본값(optimistic)은 3회 중 가장 좋은 값만 통과해도 합격이라 약하다.
    expect(rc.assert.aggregationMethod).toBe('median-run');
    const a = rc.assert.assertions;
    for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) {
      expect(a[`categories:${c}`]).toEqual(['error', { minScore: 0.95 }]);
    }
    expect(a['largest-contentful-paint']).toEqual(['error', { maxNumericValue: 1800 }]);
    expect(a['cumulative-layout-shift']).toEqual(['error', { maxNumericValue: 0.05 }]);
    expect(a['resource-summary:script:size']).toEqual(['error', { maxNumericValue: 30720 }]);
    expect(Object.values(a).every((v) => (v as unknown[])[0] === 'error')).toBe(true);
    // 모바일 기본 프리셋(데스크톱 프리셋·formFactor 변경 금지)
    expect(rc.collect.settings.preset).toBeUndefined();
    expect(rc.collect.settings.formFactor).toBeUndefined();
  });
});

describe('공급망 규칙을 풀지 않았다', () => {
  const ws = read('pnpm-workspace.yaml');
  it('pnpm-workspace.yaml', () => {
    expect(ws).toMatch(/^minimumReleaseAge: 4320$/m);
    expect(ws).toMatch(/^blockExoticSubdeps: true$/m);
    expect(ws).toMatch(/^trustPolicy: no-downgrade$/m);
    const block = /^allowBuilds:\n((?:\s+.+\n?)+)/m.exec(ws)?.[1] ?? '';
    expect(
      block
        .split('\n')
        .filter(Boolean)
        .map((l) => l.trim())
        .sort(),
    ).toEqual(['esbuild: true', 'sharp: true']);
    expect(ws).not.toMatch(/trustPolicyExclude|minimumReleaseAgeExclude|dangerouslyAllowAllBuilds/);
  });
  it('직접 의존성은 17개 이하다(docs/02)', () => {
    expect(
      Object.keys(pkg.dependencies).length + Object.keys(pkg.devDependencies).length,
    ).toBeLessThanOrEqual(17);
  });
});

describe('변형: 규칙이 실제로 잡는다', () => {
  const sha = /@[0-9a-f]{40} # v[\d.]+/;
  const mutations: [string, (s: string) => string, string][] = [
    ['태그로 고정', (s) => s.replace(sha, '@v6'), 'pinned to a full SHA'],
    [
      '짧은 SHA',
      (s) => s.replace(/@([0-9a-f]{7})[0-9a-f]{33} # v/, '@$1 # v'),
      'pinned to a full SHA',
    ],
    ['버전 주석 없음', (s) => s.replace(/(@[0-9a-f]{40}) # v[\d.]+/, '$1'), 'pinned to a full SHA'],
    ['서드파티 액션', (s) => s.replace('actions/setup-node@', 'evil/setup-node@'), 'first-party'],
    ['권한 확대', (s) => s.replace('contents: read', 'contents: write'), 'permissions'],
    [
      'pull_request_target',
      (s) => s.replace('pull_request:', 'pull_request_target:'),
      'pull_request_target',
    ],
    [
      'run 안의 이벤트 입력',
      (s) => s.replace('run: pnpm lint', `run: echo ${EXPR} github.event.pull_request.title }}`),
      'expression inside run',
    ],
    [
      'run 안의 비밀 값',
      (s) => s.replace('run: pnpm build', `run: echo ${EXPR} secrets.X }}`),
      'expression inside run',
    ],
    [
      'frozen-lockfile 없음',
      (s) => s.replace('pnpm install --frozen-lockfile', 'pnpm install'),
      'missing step: pnpm install --frozen-lockfile',
    ],
    [
      'frozen-lockfile 없는 설치 추가',
      (s) => s.replace('run: pnpm lint', 'run: pnpm install && pnpm lint'),
      'pnpm install must use --frozen-lockfile',
    ],
    [
      '권한 블록 없음',
      (s) => s.replace(/^permissions:\n\s+contents: read\n/m, ''),
      'permissions must be exactly contents: read',
    ],
    [
      '권한 read-all',
      (s) => s.replace(/^permissions:\n\s+contents: read\n/m, 'permissions: read-all\n'),
      'permissions must be exactly contents: read',
    ],
    [
      '비밀 값이 env 밖에서 쓰임',
      (s) =>
        s.replace(
          'id: private\n',
          `id: private\n        name2: ${EXPR} format('{0}', secrets.IDUK_PRIVATE_PATTERNS_B64) }}\n`,
        ),
      'secrets must only be mapped into env',
    ],
    [
      '주 검사의 포크 제외 조건 제거',
      (s) => {
        const marker =
          "        if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork != true\n        shell: bash\n        env:\n          IDUK_PRIVATE_PATTERNS";
        return s.replace(marker, marker.replace(/ {8}if: .*\n/, ''));
      },
      'must not run for fork PRs',
    ],
    [
      '단계 순서 바꿈',
      (s) =>
        s
          .replace('run: pnpm lint', 'run: pnpm TMP')
          .replace('run: pnpm check\n', 'run: pnpm lint\n')
          .replace('run: pnpm TMP', 'run: pnpm check'),
      'step order',
    ],
    [
      'persist-credentials',
      (s) => s.replace('persist-credentials: false', 'persist-credentials: true'),
      'persist-credentials',
    ],
    ['timeout 없음', (s) => s.replace(/timeout-minutes: \d+\n/, ''), 'timeout-minutes'],
    [
      '취소 없음',
      (s) => s.replace('cancel-in-progress: true', 'cancel-in-progress: false'),
      'cancel',
    ],
    [
      '비밀 값 출력',
      (s) =>
        s.replace(
          'printf \'%s\' "$PATTERNS_B64" | base64 -d > "$file"',
          'echo "$PATTERNS_B64"; printf \'%s\' "$PATTERNS_B64" | base64 -d > "$file"',
        ),
      'echo the secret',
    ],
    [
      'GITHUB_ENV로 내보냄',
      (s) =>
        s.replace('echo "path=$file" >> "$GITHUB_OUTPUT"', 'echo "IDUK=$file" >> "$GITHUB_ENV"'),
      'do not export',
    ],
    [
      '주 검사가 비공개 패턴 없이 허용',
      (s) =>
        s.replace('run: pnpm check-privacy\n', 'run: pnpm check-privacy --allow-missing-private\n'),
      'must not allow missing',
    ],
    [
      '포크 조건 제거',
      (s) =>
        s.replace(
          /if: github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.repo\.fork == true\n/,
          '',
        ),
      'fork PR step',
    ],
    [
      '정리 단계 제거',
      (s) => s.replace('rm -f "$RUNNER_TEMP/private-patterns.txt"', 'true'),
      'must be removed',
    ],
    [
      '정리 단계 조건 제거',
      (s) => s.replace(/if: always\(\)\n(\s+shell: bash\n\s+run: rm -f)/, '$1'),
      'must be removed',
    ],
    [
      '보고서 업로드가 실패 시 건너뜀',
      (s) => s.replace(/(Upload test reports\n\s+)if: always\(\)\n/, '$1'),
      'uploaded even on failure',
    ],
    [
      'Node 버전 하드코딩',
      (s) => s.replace('node-version-file: package.json', 'node-version: 20'),
      'package.json engines',
    ],
    [
      '빌드 뒤 단위 시험 제거',
      (s) =>
        s.replace(
          /(Unit tests against the build[^\n]*\n(?:\s+env:\n\s+[^\n]*\n)?\s+run: )pnpm test/,
          '$1echo skipped',
        ),
      'pnpm test must run again after the build',
    ],
    [
      '예산 단계 제거',
      (s) => s.replace('run: pnpm budgets', 'run: echo skipped'),
      'missing step: pnpm budgets',
    ],
    [
      'Lighthouse 단계 제거',
      (s) => s.replace('run: pnpm lighthouse', 'run: echo skipped'),
      'missing step: pnpm lighthouse',
    ],
  ];
  for (const [name, mutate, expected] of mutations) {
    it(`ci.yml ${name}`, () => {
      const mutated = mutate(ci);
      expect(mutated).not.toBe(ci);
      expect(lintCi(mutated).join('\n')).toContain(expected);
    });
  }

  const weeklyMutations: [string, (s: string) => string, string][] = [
    ['예약 제거', (s) => s.replace(/ {2}schedule:\n\s+- cron: "[^"]+"\n/, ''), 'schedule'],
    ['수동 실행 제거', (s) => s.replace('  workflow_dispatch:\n', ''), 'workflow_dispatch'],
    ['쓰기 권한', (s) => s.replace('contents: read', 'contents: read\n  issues: write'), 'write'],
    [
      '주소를 변수 대신 고정',
      (s) => s.replace(`${EXPR} vars.SITE_URL }}`, 'https://example.org'),
      'SITE_URL',
    ],
    [
      '설치 추가',
      (s) =>
        s.replace(
          '      - name: Compare',
          '      - name: Install\n        run: pnpm install --frozen-lockfile\n\n      - name: Compare',
        ),
      'must not install',
    ],
    [
      '스크립트 대신 다른 명령',
      (s) => s.replace('run: node scripts/cloak-check.ts', 'run: curl -s https://example.org'),
      'must run scripts/cloak-check.ts',
    ],
    ['SHA 고정 해제', (s) => s.replace(sha, '@v6'), 'pinned'],
  ];
  for (const [name, mutate, expected] of weeklyMutations) {
    it(`weekly ${name}`, () => {
      const mutated = mutate(weekly);
      expect(mutated).not.toBe(weekly);
      expect(lintWeekly(mutated).join('\n')).toContain(expected);
    });
  }
});
