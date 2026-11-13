/**
 * 저장소와 dist의 개인정보·접속 정보·품질 검사(docs/07 6절, docs/05 S12). 종료 코드 0(통과) / 1(실패).
 *
 *   pnpm check-privacy                 기본: 추적 파일 + dist (CI가 쓴다)
 *   pnpm check-privacy --pre-publish   기본 검사 + 번역 초안 표시·개수 검사 (S13/S14 전에 사람이 돌린다)
 *
 * 옵션: --archive <경로>  비공개 글 제목·슬러그를 원본 아카이브(posts.json)에서 메모리로만 뽑아 검사
 *                        (생략하면 이웃 폴더 ../iduk.design이 있을 때 자동으로 쓴다)
 *       --require-private  $IDUK_PRIVATE_PATTERNS 가 없으면 실패(CI는 항상 실패)
 *       --allow-missing-private  비공개 패턴이 없어도 크게 경고만 한다(포크 PR 전용)
 *       --list-external    dist가 가리키는 외부 주소 호스트 목록을 모두 출력
 *       --root <경로>, --site <origin>
 *
 * 출력에는 일치한 값을 절대 싣지 않는다(파일, 줄, 규칙 번호, 개수만). 비공개 패턴·치환 원본·비공개 글 제목은
 * 저장소에 두지 않고 실행 중 메모리에서만 다룬다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRedactions, redactionForms } from './lib/demos';
import { IMAGE_EXT, imageHasGps } from './lib/exif';
import { classify, cssUrls, extractPageRefs, resolveFile, scriptUrls } from './lib/links';
import { scanDemoText, scanText } from './lib/privacy';

export type Options = {
  root: string;
  prePublish?: boolean;
  archive?: string;
  requirePrivate?: boolean;
  allowMissingPrivate?: boolean;
  listExternal?: boolean;
  siteOrigin?: string;
  env?: Record<string, string | undefined>;
};

export type Finding = { rule: string; file: string; count: number; line?: number };
export type Result = { code: 0 | 1; lines: string[]; findings: Finding[] };

const DEFAULT_SITE = 'https://iduk.co.kr';
// 옛 서버 접속 방식 이름은 문서가 아닌 이 파일에서도 연속된 글자로 두지 않는다.
const WORDS_RE = new RegExp(
  ['gmail\\.com', 'naver\\.com', ['ka', 'kao'].join(''), ['sf', 'tp'].join('')].join('|'),
  'gi',
);
const MAILTO_RE = /(?<![A-Za-z0-9_$])(?:mailto|tel):/gi;
const MAP_URL_RE = /sourceMappingURL\s*=/;
// 알려진 바이너리(이미지, 글꼴, 문서, 압축, 미디어, 실행 파일)만 텍스트에서 뺀다. 그 밖의 확장자(.sql, .mdx, .jsonl,
// .rss 등)는 텍스트로 보고 공개 패턴을 검사한다.
const BINARY_EXT =
  /\.(?:png|jpe?g|webp|avif|gif|ico|icns|bmp|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|bz2|xz|7z|rar|tar|mp4|webm|mov|mp3|ogg|wav|flac|psd|ai|heic|heif|tiff?|wasm|bin|exe|dll|so|dylib|class|jar|docx|xlsx|pptx|key|numbers|pages|sqlite3?|db)$/i;

/**
 * 파일 내용을 텍스트로 풀어 돌려준다. 바이너리면 null. UTF-16(BOM 있음, 또는 BOM 없이 NUL이 번갈아 나오는 것)은 디코드한다.
 */
export function decodeText(buf: Buffer, rel: string): string | null {
  if (BINARY_EXT.test(rel) || IMAGE_EXT.test(rel)) return null;
  const head = buf.subarray(0, 8000);
  if (head[0] === 0xff && head[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  if (head[0] === 0xfe && head[1] === 0xff)
    return Buffer.from(buf.subarray(2)).swap16().toString('utf16le');
  const nuls = head.reduce((n, b) => n + (b === 0 ? 1 : 0), 0);
  if (nuls === 0) return buf.toString('utf8');
  if (nuls >= head.length / 4) {
    let odd = 0;
    let even = 0;
    for (let i = 0; i < head.length; i++) if (head[i] === 0) i % 2 ? odd++ : even++;
    return odd >= even ? buf.toString('utf16le') : Buffer.from(buf).swap16().toString('utf16le');
  }
  return null;
}

// ------------------------------------------------------------------ 파일 목록

function walk(dir: string, skip: (rel: string) => boolean, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(base, full).split(sep).join('/');
    if (skip(rel)) continue;
    if (statSync(full).isDirectory()) out.push(...walk(full, skip, base));
    else out.push(rel);
  }
  return out;
}

/** 추적 중인 파일과 아직 추가하지 않은 새 파일(git ls-files --cached --others --exclude-standard). git 저장소가 아니면(시험용 임시 폴더) 폴더를 직접 훑는다. */
function trackedFiles(root: string): string[] {
  try {
    const out = execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      {
        cwd: root,
        maxBuffer: 1 << 28,
        stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, GIT_CEILING_DIRECTORIES: join(root, '..') },
      },
    )
      .toString()
      .split('\0')
      .filter(Boolean);
    return out.filter((f) => existsSync(join(root, f)));
  } catch {
    const skip = (rel: string) =>
      /^(?:node_modules|dist|\.git|\.astro|test-results|playwright-report)(?:\/|$)/.test(rel);
    return walk(root, skip);
  }
}

const isDemo = (rel: string) => /^(?:public|dist)\/html\//.test(rel);

// ------------------------------------------------------------------ 허용 목록

type Allow = { kind: string; glob: RegExp; match: string; line: number; used: boolean };

const KINDS = new Set(['email', 'phone', 'path', 'secret', 'word', 'reg', 'mailto-tel']);

function globToRe(glob: string): RegExp {
  const re = glob
    .split('**')
    .map((part) => part.split('*').map(escapeRe).join('[^/]*'))
    .join('.*');
  return new RegExp(`^${re}$`);
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `종류 | 경로(glob) | 일치 값(정확히) | 이유` 한 줄에 하나. `#` 줄은 주석. 이유가 없으면 오류.
 * 일치 값 `*`은 그 파일의 해당 종류를 모두 허용한다: 검사기 자신의 시험 입력을 담은 파일에만 쓴다.
 */
export function parseAllowList(text: string): { allow: Allow[]; errors: string[] } {
  const allow: Allow[] = [];
  const errors: string[] = [];
  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const parts = line.split('|').map((p) => p.trim());
    const [kind = '', glob = '', match = '', ...reason] = parts;
    if (!KINDS.has(kind) || glob === '' || match === '' || reason.join('|').trim() === '') {
      errors.push(`privacy-allow.txt:${i + 1} needs "kind | path | exact match | reason"`);
      continue;
    }
    allow.push({
      kind,
      glob: globToRe(glob),
      match: match.toLowerCase(),
      line: i + 1,
      used: false,
    });
  }
  return { allow, errors };
}

// ------------------------------------------------------------------ 비공개 패턴

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
}

type Needle = { label: string; test: (text: string, lower: string) => number };

function slugNeedle(slug: string, index: number): Needle {
  const re = new RegExp(`(?<![a-z0-9-])${escapeRe(slug)}(?![a-z0-9-])`, 'g');
  return { label: `archive-slug[${index}]`, test: (_t, lower) => [...lower.matchAll(re)].length };
}

function countOf(lower: string, needle: string): number {
  let n = 0;
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, i + needle.length)) n++;
  return n;
}

/** `sourceMappingURL=data:...;base64,` 로 박힌 소스맵을 풀어 검사 대상 문자열에 덧붙인다. */
function decodeInlineMaps(text: string): string {
  let out = '';
  for (const m of text.matchAll(
    /sourceMappingURL=data:[^;,]*;(?:charset=[^;,]*;)?base64,([A-Za-z0-9+/=]+)/g,
  )) {
    out += `\n${Buffer.from(m[1] ?? '', 'base64').toString('utf8')}`;
  }
  return out;
}

// ------------------------------------------------------------------ 본체

type Ctx = {
  root: string;
  lines: string[];
  findings: Finding[];
  allow: Allow[];
  add: (rule: string, file: string, count: number, line?: number) => void;
};

function lineOf(text: string, needle: string): number | undefined {
  const i = text.indexOf(needle);
  if (i < 0) return undefined;
  let n = 1;
  for (let p = text.indexOf('\n'); p !== -1 && p < i; p = text.indexOf('\n', p + 1)) n++;
  return n;
}

export async function runCheck(opts: Options): Promise<Result> {
  const root = opts.root;
  const env = opts.env ?? process.env;
  const site = opts.siteOrigin ?? DEFAULT_SITE;
  const lines: string[] = [];
  const findings: Finding[] = [];
  const warn = (m: string) => lines.push(`WARN  ${m}`);
  const info = (m: string) => lines.push(`      ${m}`);
  const add: Ctx['add'] = (rule, file, count, line) => {
    findings.push({ rule, file, count, line });
  };
  const fail = (rule: string, file: string, message: string) => {
    findings.push({ rule, file, count: 1 });
    lines.push(`FAIL  [${rule}] ${file}: ${message}`);
  };

  // 허용 목록
  const allowPath = join(root, 'scripts/privacy-allow.txt');
  const parsedAllow = existsSync(allowPath)
    ? parseAllowList(readFileSync(allowPath, 'utf8'))
    : { allow: [], errors: [] };
  for (const e of parsedAllow.errors) fail('allow-list', 'scripts/privacy-allow.txt', e);
  const allow = parsedAllow.allow;
  const allowed = (kind: string, file: string, match: string) => {
    const m = match.normalize('NFKC').toLowerCase();
    const hit = allow.find(
      (a) => a.kind === kind && (a.match === '*' || a.match === m) && a.glob.test(file),
    );
    if (hit) hit.used = true;
    return hit !== undefined;
  };

  // 비공개 패턴
  const isCi = env.CI === 'true' || env.CI === '1';
  const privPath = env.IDUK_PRIVATE_PATTERNS;
  const privRes: RegExp[] = [];
  if (privPath) {
    try {
      for (const [i, p] of readLines(privPath).entries()) {
        try {
          privRes.push(new RegExp(p, 'i'));
        } catch {
          fail('private-patterns', '$IDUK_PRIVATE_PATTERNS', `line ${i + 1} is not a valid regex`);
        }
      }
      if (privRes.length === 0) {
        fail('private-patterns', '$IDUK_PRIVATE_PATTERNS', 'file has no patterns');
      }
    } catch {
      fail('private-patterns', '$IDUK_PRIVATE_PATTERNS', 'cannot read the file');
    }
  } else if (opts.allowMissingPrivate) {
    warn(
      '!!! IDUK_PRIVATE_PATTERNS is not set: old-server host/account patterns were NOT checked. ' +
        'Allowed only for fork pull requests. Run the full check before merging.',
    );
  } else if (isCi || opts.requirePrivate) {
    fail(
      'private-patterns',
      '$IDUK_PRIVATE_PATTERNS',
      isCi
        ? 'not set in CI: provide the private pattern file (see docs/05 S12)'
        : 'not set but --require-private was given',
    );
  } else {
    warn('IDUK_PRIVATE_PATTERNS is not set: old-server patterns are not checked (local run).');
  }

  // 치환 원본(저장소 밖, 있을 때만)
  const redactPath = join(env.TMPDIR ?? tmpdir(), 'iduk-redact.json');
  const redactForms: string[][] = [];
  if (existsSync(redactPath)) {
    try {
      for (const e of parseRedactions(readFileSync(redactPath, 'utf8'))) {
        redactForms.push(redactionForms(e.find));
      }
    } catch {
      fail('redact-originals', '$TMPDIR/iduk-redact.json', 'file exists but cannot be parsed');
    }
  }

  // 공개 글에 속하지 않는 아카이브 글의 제목·슬러그(메모리에서만)
  const needles: Needle[] = [];
  if (opts.archive) {
    const postsFile = join(opts.archive, 'data/posts.json');
    if (!existsSync(postsFile)) {
      info(`archive not found, skipped private-post check`);
    } else {
      const publicSlugs = new Set<string>();
      const projDir = join(root, 'src/content/projects');
      if (existsSync(projDir)) {
        for (const f of readdirSync(projDir)) {
          const slug = f.replace(/\.json$/, '');
          publicSlugs.add(slug);
          // 공개 작업 슬러그의 낱말(smartfarm-dashboard의 dashboard)은 이미 공개된 일반 단어라 비공개 글 슬러그와 같아도 식별자가 아니다.
          for (const word of slug.split('-')) publicSlugs.add(word);
        }
      }
      const tagsFile = join(root, 'src/content/tags.json');
      if (existsSync(tagsFile)) {
        for (const t of JSON.parse(readFileSync(tagsFile, 'utf8')) as { id: string }[]) {
          publicSlugs.add(t.id);
        }
      }
      const posts = JSON.parse(readFileSync(postsFile, 'utf8')) as {
        type?: string;
        status: string;
        slug: string;
        title: string;
        categories?: { slug: string }[];
      }[];
      // 워드프레스 고정 페이지(Intro, Contact, Blog 등)는 제목이 일반 단어라 제외하고 글(post)만 본다.
      const priv = posts.filter(
        (p) =>
          (p.type ?? 'post') === 'post' &&
          !(p.status === 'publish' && (p.categories ?? []).some((c) => c.slug === 'portfolio')),
      );
      const seen = new Set<string>();
      for (const [i, p] of priv.entries()) {
        const title = (p.title ?? '').normalize('NFC').trim().toLowerCase();
        if (title.length >= 4 && !seen.has(title)) {
          seen.add(title);
          needles.push({
            label: `archive-title[${i}]`,
            test: (_t, lower) => countOf(lower, title),
          });
        }
        const slug = (p.slug ?? '').toLowerCase();
        if (slug.length >= 5 && !publicSlugs.has(slug) && !seen.has(`s:${slug}`)) {
          seen.add(`s:${slug}`);
          needles.push(slugNeedle(slug, i));
        }
      }
    }
  }

  // ---- 파일 수집
  const repoFiles = trackedFiles(root);
  const distDir = join(root, 'dist');
  if (!existsSync(distDir)) {
    fail('dist', 'dist/', 'dist/ is missing: run `pnpm build` first');
  }
  const distFiles = existsSync(distDir) ? walk(distDir, () => false) : [];
  const all = [
    ...repoFiles.map((rel) => ({ rel, abs: join(root, rel), where: 'repo' as const })),
    ...distFiles.map((rel) => ({
      rel: `dist/${rel}`,
      abs: join(distDir, rel),
      where: 'dist' as const,
    })),
  ];

  const count = { repoText: 0, distText: 0, binary: 0, images: 0, gpsUnreadable: 0 };

  for (const f of all) {
    const rel = f.rel;
    const buf = readFileSync(f.abs);
    const decoded = decodeText(buf, rel);
    const text = decoded !== null;

    // 이미지 GPS
    if (IMAGE_EXT.test(rel)) {
      count.images++;
      const gps = await imageHasGps(buf);
      if (gps === true) fail('image-gps', rel, 'image contains GPS location data');
      else if (gps === 'unreadable') count.gpsUnreadable++;
    }

    // 소스맵 (dist 전체와 추적 파일의 .map)
    if (/\.map$/i.test(rel)) fail('source-map', rel, 'source map file');

    // 비공개 패턴(바이너리는 latin1로)
    let body = decoded ?? buf.toString('latin1');
    if (text && body.includes('sourceMappingURL=data:')) body += decodeInlineMaps(body);
    if (text) f.where === 'repo' ? count.repoText++ : count.distText++;
    else count.binary++;
    for (const [i, re] of privRes.entries()) {
      const g = new RegExp(re.source, 'gi');
      const n = [...`${rel}\n${body}`.matchAll(g)].length;
      if (n > 0) {
        add(`private[${i}]`, rel, n);
        lines.push(`FAIL  [private[${i}]] ${rel}: ${n} match(es) (values not shown)`);
      }
    }
    // 치환 원본
    for (const [i, forms] of redactForms.entries()) {
      let n = 0;
      for (const form of forms) n += countOf(body, form);
      if (n > 0) {
        add(`redact-original[${i}]`, rel, n);
        lines.push(`FAIL  [redact-original[${i}]] ${rel}: ${n} match(es) (values not shown)`);
      }
    }
    if (!text) continue;

    // 비공개 글 제목·슬러그
    if (needles.length > 0 && buf.length < 8_000_000) {
      const lower = body.normalize('NFC').toLowerCase();
      for (const nd of needles) {
        const n = nd.test(body, lower);
        if (n > 0) {
          add(nd.label, rel, n);
          lines.push(`FAIL  [${nd.label}] ${rel}: ${n} match(es) (values not shown)`);
        }
      }
    }

    // 개인정보 패턴. 허용 목록 파일은 값 자체를 적는 곳이라 공개 패턴 검사에서 뺀다(비공개 패턴은 위에서 이미 봤다).
    if (rel === 'scripts/privacy-allow.txt') continue;
    const lock = rel === 'pnpm-lock.yaml';
    const byKind = new Map<string, { n: number; first: string }>();
    const record = (kind: string, match: string) => {
      if (allowed(kind, rel, match)) return;
      const cur = byKind.get(kind);
      if (cur) cur.n++;
      else byKind.set(kind, { n: 1, first: match });
    };
    if (!lock) {
      if (isDemo(rel)) {
        for (const h of scanDemoText(body)) record(h.kind === 'reg' ? 'reg' : h.kind, h.match);
      } else {
        for (const h of scanText(body)) record(h.kind, h.match);
      }
    } else {
      for (const h of scanText(body)) if (h.kind === 'path') record('path', h.match);
    }
    for (const m of body.matchAll(WORDS_RE)) record('word', m[0]);
    if (f.where === 'dist') {
      for (const m of body.matchAll(MAILTO_RE)) record('mailto-tel', m[0]);
      // 데모(복사한 서드파티 코드)의 소스맵 주석은 가리키는 .map이 없다. 사이트가 만든 JS·CSS만 본다.
      if (!isDemo(rel) && /\.(?:js|mjs|css)$/i.test(rel) && MAP_URL_RE.test(body)) {
        record('source-map-ref', 'sourceMappingURL');
      }
    }
    for (const [kind, v] of byKind) {
      const line = lineOf(body, v.first);
      add(kind, rel, v.n, line);
      lines.push(
        `FAIL  [${kind}] ${rel}${line ? `:${line}` : ''}: ${v.n} match(es) (values not shown)`,
      );
    }
  }

  // ---- 내부 링크 (dist의 모든 HTML)
  const distSet = new Set(distFiles);
  const pageIds = new Map<string, Set<string>>();
  const external = new Map<string, number>();
  let linkCount = 0;
  let pageCount = 0;
  const htmlFiles = distFiles.filter((f) => /\.html?$/i.test(f));
  const parsed = new Map<string, ReturnType<typeof extractPageRefs>>();
  const pageOf = (file: string) => {
    let p = parsed.get(file);
    if (!p) {
      p = extractPageRefs(readFileSync(join(distDir, file), 'utf8'));
      parsed.set(file, p);
    }
    return p;
  };
  const brokenByPage = new Map<string, number>();
  const extLoad = new Map<string, number>();
  const checkRef = (
    file: string,
    url: string,
    pagePath: string,
    base: string | undefined,
    attrName = 'a[href]',
  ) => {
    const c = classify(url, pagePath, site, base);
    if (c.kind === 'skip') return;
    linkCount++;
    if (c.kind === 'invalid') {
      brokenByPage.set(file, (brokenByPage.get(file) ?? 0) + 1);
      return;
    }
    if (c.kind === 'external') {
      external.set(c.host, (external.get(c.host) ?? 0) + 1);
      // 사이트 자체 페이지는 외부 자원을 불러오지 않는다(docs/03: 외부 CDN·글꼴 서버 금지). 링크(a)는 허용.
      if (!isDemo(`dist/${file}`) && !/^(?:a|area)\[/.test(attrName)) {
        extLoad.set(file, (extLoad.get(file) ?? 0) + 1);
      }
      return;
    }
    const target = resolveFile(c.path, distSet);
    if (!target) {
      brokenByPage.set(file, (brokenByPage.get(file) ?? 0) + 1);
      return;
    }
    // 프래그먼트는 사이트 페이지(데모 제외)끼리만 확인한다.
    if (c.fragment && !isDemo(`dist/${file}`) && /\.html?$/i.test(target)) {
      let ids = pageIds.get(target);
      if (!ids) {
        ids = pageOf(target).ids;
        pageIds.set(target, ids);
      }
      if (!ids.has(c.fragment)) brokenByPage.set(file, (brokenByPage.get(file) ?? 0) + 1);
    }
  };
  for (const file of htmlFiles) {
    pageCount++;
    const pagePath = `/${file.replace(/index\.html$/, '')}`;
    const p = pageOf(file);
    for (const r of p.refs) checkRef(file, r.url, pagePath, p.base, r.attr);
    if (!isDemo(`dist/${file}`)) {
      // 인라인 <style>·style 속성(url(), @import)과 인라인 <script>(문자열 속 외부 주소)도 같은 규칙으로 본다.
      for (const css of p.inlineStyles) {
        for (const u of cssUrls(css)) checkRef(file, u, pagePath, p.base, 'inline-style[url]');
      }
      for (const js of p.inlineScripts) {
        for (const u of scriptUrls(js)) checkRef(file, u, pagePath, p.base, 'inline-script[url]');
      }
      // 사이트 페이지가 불러오는 CSS 안의 url()
      const css: string[] = [];
      for (const r of p.refs) {
        if (r.attr === 'link[href]' && /\.css(?:$|[?#])/.test(r.url)) css.push(r.url);
      }
      for (const u of css) {
        const c = classify(u, pagePath, site, p.base);
        if (c.kind !== 'internal') continue;
        const cssFile = resolveFile(c.path, distSet);
        if (!cssFile) continue;
        const cssPath = `/${cssFile}`;
        for (const cu of cssUrls(readFileSync(join(distDir, cssFile), 'utf8'))) {
          checkRef(cssFile, cu, cssPath, undefined, 'css[url]');
        }
      }
    }
  }
  for (const [file, n] of brokenByPage) {
    add('broken-link', `dist/${file}`, n);
    lines.push(`FAIL  [broken-link] dist/${file}: ${n} internal reference(s) do not resolve`);
  }

  for (const [file, n] of extLoad) {
    add('external-resource', `dist/${file}`, n);
    lines.push(
      `FAIL  [external-resource] dist/${file}: ${n} external resource reference(s) in a site page`,
    );
  }

  // ---- 공개 전 검사
  if (opts.prePublish) preChecks(root, fail, info);

  if (needles.length === 0) {
    warn(
      'archive needles: 0 - private post titles/slugs are NOT checked (no archive here, as in CI). In CI the private pattern file is the only protection; run locally with --archive ../iduk.design (docs/07 section 6).',
    );
  }
  for (const a of allow.filter((x) => !x.used)) {
    warn(`unused allow-list entry (privacy-allow.txt:${a.line}); remove it if no longer needed`);
  }

  const extHosts = [...external.entries()].sort((a, b) => b[1] - a[1]);
  const header = [
    `check-privacy: mode=${opts.prePublish ? 'pre-publish' : 'repo+dist'}`,
    `  repo text files: ${count.repoText}, dist text files: ${count.distText}, binary: ${count.binary}`,
    `  images checked for GPS: ${count.images} (unreadable, byte-search only: ${count.gpsUnreadable})`,
    `  private patterns: ${privRes.length}, redaction originals: ${redactForms.length}, archive needles: ${needles.length}`,
    `  allow-list entries: ${allow.length}`,
    `  html pages: ${pageCount}, references checked: ${linkCount}, external references: ${extHosts.reduce((s, [, n]) => s + n, 0)} to ${extHosts.length} host(s)`,
  ];
  if (opts.listExternal) for (const [h, n] of extHosts) header.push(`    external ${h} x${n}`);
  const failCount = lines.filter((l) => l.startsWith('FAIL')).length;
  const code: 0 | 1 = failCount > 0 ? 1 : 0;
  return {
    code,
    lines: [
      ...header,
      ...lines,
      code === 0 ? 'OK: no findings' : `FAILED: ${failCount} finding line(s)`,
    ],
    findings,
  };
}

// ------------------------------------------------------------------ 공개 전 검사

function preChecks(
  root: string,
  fail: (rule: string, file: string, message: string) => void,
  info: (m: string) => void,
) {
  const projDir = join(root, 'src/content/projects');
  const projects: Record<string, unknown>[] = existsSync(projDir)
    ? readdirSync(projDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({ ...JSON.parse(readFileSync(join(projDir, f), 'utf8')), __file: f }))
    : [];
  const tagsFile = join(root, 'src/content/tags.json');
  const tags: { id: string; status?: string; name?: { ko?: string; en?: string } }[] = existsSync(
    tagsFile,
  )
    ? JSON.parse(readFileSync(tagsFile, 'utf8'))
    : [];

  const drafts = projects.filter((p) => p.status === 'draft-translation');
  if (drafts.length > 0) {
    fail(
      'draft-translation',
      'src/content/projects',
      `${drafts.length} of ${projects.length} project(s) still have status "draft-translation" (review en/ko text and alt, then remove the field)`,
    );
  }
  const draftTags = tags.filter((t) => t.status === 'draft-translation');
  if (draftTags.length > 0) {
    fail(
      'draft-translation',
      'src/content/tags.json',
      `${draftTags.length} tag(s) still draft-translation`,
    );
  }

  const featured = projects.filter((p) => p.featured === true).length;
  if (projects.length > 0 && (featured < 6 || featured > 8)) {
    fail(
      'featured-count',
      'src/content/projects',
      `featured projects must be 6-8, found ${featured}`,
    );
  }
  const tagIds = new Set(tags.map((t) => t.id));
  for (const p of projects) {
    const file = `src/content/projects/${p.__file}`;
    const unknown = ((p.tags as string[]) ?? []).filter((t) => !tagIds.has(t));
    if (unknown.length > 0) fail('tags', file, `${unknown.length} tag(s) not defined in tags.json`);
    let emptyAlt = 0;
    const visit = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        if ('image' in o && 'alt' in o) {
          const a = o.alt as { ko?: string; en?: string } | undefined;
          if (!a?.ko?.trim() || !a?.en?.trim()) emptyAlt++;
        }
        for (const x of Object.values(o)) visit(x);
      }
    };
    visit(p);
    if (emptyAlt > 0) fail('alt', file, `${emptyAlt} image(s) with empty alt`);
  }
  info(`pre-publish: ${projects.length} projects, ${featured} featured, ${tags.length} tags`);
}

// ------------------------------------------------------------------ CLI

function parseArgs(argv: string[]): Options {
  const o: Options = { root: join(fileURLToPath(import.meta.url), '../..') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pre-publish') o.prePublish = true;
    else if (a === '--require-private') o.requirePrivate = true;
    else if (a === '--allow-missing-private') o.allowMissingPrivate = true;
    else if (a === '--list-external') o.listExternal = true;
    else if (a === '--archive') o.archive = argv[++i];
    else if (a === '--root') o.root = argv[++i] ?? o.root;
    else if (a === '--site') o.siteOrigin = argv[++i];
    else throw new Error(`unknown option: ${a}`);
  }
  // 로컬에서는 이웃 폴더의 원본 아카이브가 있으면 자동으로 쓴다(CI에는 없어서 건너뛴다).
  const sibling = join(o.root, '../iduk.design');
  if (!o.archive && existsSync(join(sibling, 'data/posts.json'))) o.archive = sibling;
  return o;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await runCheck(parseArgs(process.argv.slice(2)));
    console.log(result.lines.join('\n'));
    process.exit(result.code);
  } catch (e) {
    console.error(`check-privacy crashed: ${(e as Error).message}`);
    process.exit(1);
  }
}
