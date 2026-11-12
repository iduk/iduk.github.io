/**
 * 주간 은폐 검사(cloaking check). 운영 주소를 일반 방문자 헤더로 두 번, 검색 로봇 User-Agent로 한 번 요청해
 * 응답 본문이 같은지와, 스크립트·스타일·iframe 주소가 허용 목록(scripts/cloak-allow.txt) 밖으로 나가지 않는지 본다.
 * 해킹된 사이트는 방문자나 검색 로봇에게만 다른 내용(스팸, 외부 스크립트)을 보여 주는 경우가 많다.
 *
 *   SITE_URL=https://example.org node scripts/cloak-check.ts
 *
 * 로컬 파일을 가져오지 않고 의존성도 없다(Node 24가 TypeScript를 바로 실행한다): 워크플로가 설치 없이 돌린다.
 * SITE_URL(저장소 변수)이 없으면 알림만 남기고 성공한다(도메인 전환 전에도 무해).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PATHS = ['/', '/en/', '/work/'];

const VISITOR_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CRAWLER_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

export type Profile = { name: string; headers: Record<string, string> };
export const PROFILES: Profile[] = [
  {
    name: 'visitor-1',
    headers: {
      'user-agent': VISITOR_UA,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ko-KR,ko;q=0.9',
    },
  },
  {
    // 검색 결과에서 들어온 방문자(Referer 기반 은폐를 잡는다)
    name: 'visitor-2',
    headers: {
      'user-agent': VISITOR_UA,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
      referer: 'https://www.google.com/',
    },
  },
  { name: 'crawler', headers: { 'user-agent': CRAWLER_UA, accept: 'text/html,*/*' } },
];

// ---------------------------------------------------------------- 순수 함수

/** 허용 목록: 줄마다 호스트 이름(`cdn.example.org`) 또는 URL 접두(`https://cdn.example.org/lib/`). `#` 주석. */
export function parseAllow(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

/** `<script src>`, 스타일시트·preload(script, style) `<link href>`, `<iframe src>`의 주소 전부(절대 주소로). */
export function externalRefs(html: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const add = (u: string | undefined) => {
    if (!u) return;
    try {
      urls.push(new URL(u.trim(), pageUrl).href);
    } catch {
      urls.push(`invalid:${u.trim()}`);
    }
  };
  const attr = (tag: string, name: string) =>
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  for (const m of html.matchAll(/<(script|iframe|frame|link)\b[^>]*>/gi)) {
    const tag = m[0];
    const kind = (m[1] as string).toLowerCase();
    if (kind === 'script' || kind === 'iframe' || kind === 'frame') {
      const a = attr(tag, 'src');
      add(a?.[1] ?? a?.[2] ?? a?.[3]);
    } else {
      const rel = (attr(tag, 'rel')?.slice(1).find(Boolean) ?? '').toLowerCase();
      const as = (attr(tag, 'as')?.slice(1).find(Boolean) ?? '').toLowerCase();
      if (
        rel.includes('stylesheet') ||
        ((rel.includes('preload') || rel.includes('modulepreload')) &&
          (as === 'script' || as === 'style' || rel.includes('modulepreload')))
      ) {
        const a = attr(tag, 'href');
        add(a?.[1] ?? a?.[2] ?? a?.[3]);
      }
    }
  }
  return [...new Set(urls)];
}

/** 사이트 자신의 호스트이거나 허용 목록에 있는가. */
export function isAllowed(url: string, siteHost: string, allow: string[]): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.host === siteHost) return true;
  return allow.some((a) => {
    if (!/^https?:\/\//i.test(a)) return u.hostname === a;
    // URL 접두 항목: 출처(스킴+호스트+포트)가 같고 경로가 항목 경로 아래여야 한다.
    // 문자열 접두 비교는 `https://cdn.x.org`가 `https://cdn.x.org.evil.com`을 통과시킨다.
    let e: URL;
    try {
      e = new URL(a);
    } catch {
      return false;
    }
    const dir = e.pathname.endsWith('/') ? e.pathname : `${e.pathname}/`;
    return u.origin === e.origin && (u.pathname === e.pathname || u.pathname.startsWith(dir));
  });
}

const norm = (s: string) => s.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
const pieces = (s: string) => new Set(norm(s).split(/(?<=>)/));

/** 두 본문의 유사도(0..1): 태그 경계로 나눈 조각 집합의 자카드. 공백 차이는 무시한다. */
export function similarity(a: string, b: string): number {
  if (norm(a) === norm(b)) return 1;
  const A = pieces(a);
  const B = pieces(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}

export const MIN_SIMILARITY = 0.98;

// ---------------------------------------------------------------- 실행

export type FetchLike = (
  url: string,
  init: { headers: Record<string, string>; redirect: 'manual' },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

export type Report = { code: 0 | 1; lines: string[] };

async function get(
  fetcher: FetchLike,
  url: string,
  siteHost: string,
  headers: Record<string, string>,
) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetcher(current, { headers, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { error: `redirect without location (${res.status})` };
      const next = new URL(loc, current);
      if (next.host !== siteHost) return { error: `redirects to another host (${next.host})` };
      current = next.href;
      continue;
    }
    if (res.status !== 200) return { error: `status ${res.status}` };
    return { body: await res.text(), url: current };
  }
  return { error: 'too many redirects' };
}

export async function runCloakCheck(opts: {
  siteUrl: string | undefined;
  allowText: string;
  fetcher: FetchLike;
  paths?: string[];
}): Promise<Report> {
  const lines: string[] = [];
  if (!opts.siteUrl?.trim()) {
    return {
      code: 0,
      lines: [
        '::notice::SITE_URL is not set: skipping the cloak check (set the repository variable after the DNS cutover).',
      ],
    };
  }
  const site = new URL(opts.siteUrl);
  if (site.protocol !== 'https:') {
    return { code: 1, lines: [`FAIL: SITE_URL must be https (got ${site.protocol})`] };
  }
  const allow = parseAllow(opts.allowText);
  let failures = 0;
  const fail = (m: string) => {
    failures++;
    lines.push(`FAIL  ${m}`);
  };
  for (const path of opts.paths ?? PATHS) {
    const url = new URL(path, site).href;
    const bodies: { name: string; body: string; url: string }[] = [];
    for (const p of PROFILES) {
      const r = await get(opts.fetcher, url, site.host, p.headers).catch((e: Error) => ({
        error: `request failed (${e.message})`,
      }));
      if ('error' in r) {
        fail(`${path} [${p.name}]: ${r.error}`);
        continue;
      }
      bodies.push({ name: p.name, body: r.body, url: r.url });
    }
    const first = bodies[0];
    if (!first) continue;
    for (const b of bodies.slice(1)) {
      const s = similarity(first.body, b.body);
      if (s < 1) lines.push(`      ${path}: ${first.name} vs ${b.name} similarity ${s.toFixed(4)}`);
      if (s < MIN_SIMILARITY)
        fail(
          `${path}: ${b.name} body differs materially from ${first.name} (similarity ${s.toFixed(4)})`,
        );
    }
    for (const b of bodies) {
      const outside = externalRefs(b.body, b.url).filter((u) => !isAllowed(u, site.host, allow));
      if (outside.length > 0) {
        fail(
          `${path} [${b.name}]: ${outside.length} script/style/iframe URL(s) outside the allow-list: ${outside.map((u) => new URL(u, 'http://x').host || u).join(', ')}`,
        );
      }
    }
    if (failures === 0)
      lines.push(
        `ok    ${path} (${bodies.length} responses identical or near-identical, no foreign script/style/iframe)`,
      );
  }
  lines.push(failures === 0 ? 'OK: no cloaking detected' : `FAILED: ${failures} problem(s)`);
  return { code: failures === 0 ? 0 : 1, lines };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let allowText = '';
  try {
    allowText = readFileSync(new URL('./cloak-allow.txt', import.meta.url), 'utf8');
  } catch {}
  const report = await runCloakCheck({
    siteUrl: process.env.SITE_URL,
    allowText,
    fetcher: (url, init) => fetch(url, init),
  });
  console.log(report.lines.join('\n'));
  process.exit(report.code);
}
