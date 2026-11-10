/**
 * 데모 복사·점검용 순수 함수 모음(파일 입출력 없음). copy-demos CLI와 e2e 링크 검사가 함께 쓴다.
 */
import { type DefaultTreeAdapterMap, parse } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

// ---------------------------------------------------------------- 복사 규칙

export const DEMOS = ['atom', 'hidea', 'sprx', 'suwon'] as const;

/**
 * 이미지를 훑어 보고 사람 얼굴·신분·주소·등록번호가 보여서 자리표시로 바꾸기로 한 파일(데모 상대 경로).
 * 법인 로고, 건축 조감도, 스톡 사진, 앱 목업은 남긴다.
 */
export const OMITTED_IMAGES: string[] = [
  // atom: 자격·특허·등록 증서(성명, 생년월일, 주소, 등록번호), 대표 사진, 임직원 사진
  ...[1, 2, 3, 4].map((n) => `atom/assets/images/license-paten-img${n}.jpg`),
  ...[1, 2, 3, 4, 5, 6].map((n) => `atom/assets/images/license-pro-img${n}.jpg`),
  'atom/assets/images/ceo-img.jpg',
  'atom/assets/images/conference.png',
  'atom/assets/images/conference2.png',
  'atom/assets/images/team.png',
  'atom/assets/images/team2.png',
  // hidea: 행사·인터뷰·언론 사진(실제 인물)
  ...[1, 2, 3, 4, 5].map((n) => `hidea/images/news-img0${n}.jpg`),
  // sprx: 광고 모델 사진, 회사 정보(주소, 대표, 등록번호, 전화)가 글자로 들어간 이미지
  'sprx/img/topbanner.jpg',
  'sprx/img/visual_contents.jpg',
  'sprx/img/event_img.jpg',
  'sprx/img/footbanner02.jpg',
  'sprx/img/footbanner03.jpg',
  'sprx/img/footer.jpg',
];

/** 복사에서 빼는 이름(어느 깊이든). 접속 정보(.vscode/sftp.json)와 소스맵, 버전 관리 폴더. */
export function isExcludedName(name: string): boolean {
  return name === '.DS_Store' || name === '.vscode' || name === '.git' || name.endsWith('.map');
}

const TEXT_EXT = new Set([
  '.html',
  '.htm',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.svg',
  '.txt',
  '.xml',
  '.scss',
]);

/** 정화·검사 대상 텍스트 파일인가. 글꼴·이미지·PDF 같은 바이너리는 건드리지 않는다. */
export function isTextFile(path: string): boolean {
  const dot = path.lastIndexOf('.');
  return dot >= 0 && TEXT_EXT.has(path.slice(dot).toLowerCase());
}

// ---------------------------------------------------------------- 참조 추출

export type RefKind = 'script' | 'style' | 'font' | 'image' | 'media' | 'frame' | 'link' | 'other';
export type Ref = { url: string; kind: RefKind };

const FONT_EXT = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i;
const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|bmp)(?:[?#]|$)/i;

/** 다시 요청하지 않는 주소(스킴이 데이터·스크립트·메일·전화, 같은 문서 안 앵커)인가. */
export function isSkippableUrl(url: string): boolean {
  const u = url.trim();
  return (
    u === '' || u.startsWith('#') || /^(?:data|javascript|mailto|tel|sms|about|blob):/i.test(u)
  );
}

/** 절대 주소(`http(s)://`) 또는 프로토콜 상대(`//host`)인가. */
export function isExternalUrl(url: string): boolean {
  return /^(?:https?:)?\/\/[^/\s]/i.test(url.trim());
}

function kindFromUrl(url: string): RefKind {
  if (FONT_EXT.test(url)) return 'font';
  if (IMAGE_EXT.test(url)) return 'image';
  return 'other';
}

// 따옴표 있는 값과 없는 값을 따로 둔다. 닫는 괄호가 없는 `url(url(url(…` 같은 입력에서 시작점마다 끝까지
// 훑지 않도록 값의 문자 집합에서 `(`와 줄바꿈을 뺀다.
const URL_FN_RE =
  /url\(\s{0,64}(?:"([^"\n]{0,4096})"|'([^'\n]{0,4096})'|([^'"()\s]{0,4096}))\s{0,64}\)/gi;
const IMPORT_RE = /@import\s{1,16}(?:url\(\s{0,64})?(["'])([^"'\n]{1,4096})\1/gi;

/** CSS 안의 `url(...)`과 `@import`. */
export function cssRefs(css: string): Ref[] {
  const out: Ref[] = [];
  for (const m of css.matchAll(URL_FN_RE)) {
    const url = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (!isSkippableUrl(url)) out.push({ url, kind: kindFromUrl(url) });
  }
  for (const m of css.matchAll(IMPORT_RE)) {
    const url = (m[2] ?? '').trim();
    if (!isSkippableUrl(url)) out.push({ url, kind: 'style' });
  }
  return out;
}

function isElement(n: Node): n is Element {
  return 'tagName' in n;
}

function attr(el: Element, name: string): string | undefined {
  return el.attrs.find((a) => a.name === name)?.value;
}

function textOf(el: Element): string {
  return el.childNodes.map((c) => ('value' in c ? c.value : '')).join('');
}

function srcsetUrls(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0] ?? '')
    .filter((u) => u !== '');
}

/** HTML이 가리키는 모든 주소. `link`는 이동용(a, area, form), 나머지는 불러오는 자원. */
export function htmlRefs(html: string): Ref[] {
  const out: Ref[] = [];
  const add = (url: string | undefined, kind: RefKind) => {
    if (url !== undefined && !isSkippableUrl(url)) out.push({ url: url.trim(), kind });
  };
  const walk = (node: Node) => {
    if (isElement(node)) {
      const tag = node.tagName;
      const style = attr(node, 'style');
      if (style) out.push(...cssRefs(style));
      switch (tag) {
        case 'a':
        case 'area':
          add(attr(node, 'href'), 'link');
          break;
        case 'form':
          add(attr(node, 'action'), 'link');
          break;
        case 'script':
          add(attr(node, 'src'), 'script');
          break;
        case 'style':
          out.push(...cssRefs(textOf(node)));
          break;
        case 'img':
          add(attr(node, 'src'), 'image');
          for (const u of srcsetUrls(attr(node, 'srcset') ?? '')) add(u, 'image');
          break;
        case 'source':
          add(attr(node, 'src'), 'media');
          for (const u of srcsetUrls(attr(node, 'srcset') ?? '')) add(u, 'image');
          break;
        case 'video':
          add(attr(node, 'src'), 'media');
          add(attr(node, 'poster'), 'image');
          break;
        case 'audio':
        case 'track':
          add(attr(node, 'src'), 'media');
          break;
        case 'iframe':
        case 'frame':
          add(attr(node, 'src'), 'frame');
          break;
        case 'embed':
          add(attr(node, 'src'), 'other');
          break;
        case 'object':
          add(attr(node, 'data'), 'other');
          break;
        case 'link': {
          const rel = (attr(node, 'rel') ?? '').toLowerCase().split(/\s+/);
          const href = attr(node, 'href');
          if (rel.includes('stylesheet')) add(href, 'style');
          else if (rel.some((r) => r.includes('icon'))) add(href, 'image');
          else if (rel.includes('preload') || rel.includes('prefetch')) {
            const as = attr(node, 'as');
            add(
              href,
              as === 'font'
                ? 'font'
                : as === 'style'
                  ? 'style'
                  : as === 'script'
                    ? 'script'
                    : 'other',
            );
          }
          break;
        }
      }
      if (tag === 'template' && 'content' in node) walk(node.content as unknown as Node);
    }
    if ('childNodes' in node) for (const c of node.childNodes) walk(c);
  };
  walk(parse(html) as unknown as Node);
  return out;
}

// ---------------------------------------------------------------- 외부 주소 분류

const RETIRED_HOSTS = new Set([
  'cdn.rawgit.com',
  'rawgit.com',
  'netdna.bootstrapcdn.com',
  'oss.maxcdn.com',
  'maxcdn.bootstrapcdn.com',
  'stackpath.bootstrapcdn.com',
]);

export type ExternalNote = { host: string; insecure: boolean; hints: string[] };

/** 주소만 보고 오래됐거나 사라졌을 가능성을 표시한다(네트워크 확인 없음). */
export function classifyExternal(rawUrl: string): ExternalNote {
  const url = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    return { host: '', insecure: false, hints: ['unparseable'] };
  }
  const hints: string[] = [];
  const insecure = url.toLowerCase().startsWith('http:');
  if (insecure) hints.push('http-only (blocked as mixed content on https)');
  if (RETIRED_HOSTS.has(host)) hints.push('retired-host');
  const versions: [RegExp, number, string][] = [
    [/jquery[-/@.]{0,8}(\d+)\.\d+/i, 3, 'jQuery < 3'],
    [/bootstrap[-/@.a-z]{0,20}?(\d+)\.\d+/i, 4, 'Bootstrap < 4'],
    [/font-?awesome[-/@.a-z]{0,20}?(\d+)\.\d+/i, 5, 'Font Awesome < 5'],
  ];
  for (const [re, min, label] of versions) {
    const v = re.exec(url)?.[1];
    if (v !== undefined && Number(v) < min) hints.push(`outdated (${label})`);
  }
  return { host, insecure, hints };
}

// ---------------------------------------------------------------- 정화 후 검사

// 옛 서버 호스트 이름은 저장소에 연속된 글자로 두지 않는다(조각을 이어 만든다). sftp는 일반 단어다.
const ACCESS_RE = new RegExp([['iduk', '\\.space'].join(''), 'sftp'].join('|'), 'i');

/** 접속 정보 문자열이 들어 있는가(대소문자 무시). */
export function hasAccessString(text: string): boolean {
  return ACCESS_RE.test(text);
}

// ---------------------------------------------------------------- 지도 임베드

const MAP_HOST_RE =
  /(?:google\.[a-z.]{1,30}\/maps|maps\.google|maps\.googleapis|goo\.gl\/maps|map\.naver|map\.kakao|dmaps\.daum|map\.daum)/i;

/**
 * 지도 `<iframe>`의 src를 `about:blank`로 바꾼다. 구글 지도의 `pb=` 값은 주소와 정확한 좌표를
 * base64 형태로 담고 있어서 어떤 형태로도 남기지 않는다. 바꾼 개수를 돌려준다.
 */
export function neutralizeMapEmbeds(html: string): { text: string; replaced: number } {
  let replaced = 0;
  const text = html.replace(/<iframe\b[^<>]*>/gi, (tag) =>
    tag.replace(
      /(\bsrc\s{0,16}=\s{0,16})(["'])([^"']*)\2/i,
      (all, pre: string, q: string, url: string) => {
        if (!MAP_HOST_RE.test(url)) return all;
        replaced++;
        return `${pre}${q}about:blank${q}`;
      },
    ),
  );
  return { text, replaced };
}

/** 지도 임베드·좌표 흔적이 남아 있는가. */
export function hasMapTrace(text: string): boolean {
  return /google\.[a-z.]{1,30}\/maps\/embed|[?&]pb=!|!1m\d+!1m\d+/i.test(text);
}

// ---------------------------------------------------------------- 사람·주소 치환 목록(저장소 밖 파일)

export type Redaction = { find: string; replace: string };

const entityDec = (s: string) =>
  [...s].map((c) => (c.charCodeAt(0) > 127 ? `&#${c.codePointAt(0)};` : c)).join('');
const entityHex = (s: string) =>
  [...s]
    .map((c) => (c.charCodeAt(0) > 127 ? `&#x${(c.codePointAt(0) as number).toString(16)};` : c))
    .join('');
const jsEscape = (s: string) =>
  [...s]
    .map((c) => (c.charCodeAt(0) > 127 ? `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}` : c))
    .join('');

/** 한 항목의 표기 변형(원문, URL 인코딩, 숫자 엔티티 10·16진, JS 유니코드 이스케이프). */
export function redactionForms(find: string): string[] {
  const forms = new Set([
    find,
    encodeURIComponent(find),
    entityDec(find),
    entityHex(find),
    jsEscape(find),
  ]);
  forms.add(entityHex(find).toUpperCase().replace(/&#X/g, '&#x'));
  return [...forms].filter((f) => f.length > 0);
}

/** 긴 것부터 문자열 그대로 바꾼다. 항목별 치환 횟수를 함께 돌려준다. */
export function applyRedactions(
  text: string,
  entries: Redaction[],
): { text: string; counts: number[] } {
  const order = entries.map((e, i) => ({ e, i })).sort((a, b) => b.e.find.length - a.e.find.length);
  const counts = entries.map(() => 0);
  let out = text;
  for (const { e, i } of order) {
    for (const form of redactionForms(e.find)) {
      const parts = out.split(form);
      if (parts.length > 1) {
        counts[i] = (counts[i] ?? 0) + parts.length - 1;
        out = parts.join(e.replace);
      }
    }
  }
  return { text: out, counts };
}

/** 치환 목록 JSON 검증: `{ "entries": [{ "find": "...", "replace": "..." }] }` */
export function parseRedactions(json: string): Redaction[] {
  const data = JSON.parse(json) as { entries?: Redaction[] };
  if (!Array.isArray(data.entries)) throw new Error('redact file needs an "entries" array');
  for (const e of data.entries) {
    if (typeof e.find !== 'string' || e.find.length < 2 || typeof e.replace !== 'string') {
      throw new Error('each redaction needs find (>= 2 chars) and replace strings');
    }
  }
  return data.entries;
}

// ---------------------------------------------------------------- 정리(가지치기)

/** 데모 파일 경로(`atom/assets/x.png`)를 `/html/...` 사이트 경로로 푼 참조. 외부·건너뜀·사이트 밖이면 null. */
export function resolveSitePath(fromRel: string, url: string): string | null {
  if (isSkippableUrl(url) || isExternalUrl(url)) return null;
  try {
    const u = new URL(url, `http://x/html/${fromRel}`);
    return decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
}

const isHtml = (p: string) => /\.html?$/i.test(p);
const baseName = (p: string) => p.slice(p.lastIndexOf('/') + 1);

/**
 * 남길 파일을 정한다. 규칙:
 *  1. HTML 페이지는 각 데모의 index.html에서 링크·프레임·(남은 스크립트의 문자열)로 닿는 것만 남긴다.
 *  2. 그 외 파일은 남은 텍스트 파일(HTML, CSS, JS 등)에 파일 이름이 한 번이라도 나오면 남긴다(고정점까지 반복).
 *     이름만 비교하므로 지나치게 지우는 일은 없고, 어느 쪽으로든 의심스러우면 남는다.
 * `files`는 `demo/경로` 상대 경로 목록, `read`는 텍스트 파일 내용(바이너리면 undefined).
 */
export function planKeep(
  demos: readonly string[],
  files: string[],
  read: (rel: string) => string | undefined,
): { keep: Set<string>; droppedPages: string[]; droppedAssets: string[] } {
  const all = new Set(files);
  const keep = new Set<string>();
  const queue: string[] = [];
  for (const d of demos) {
    if (all.has(`${d}/index.html`)) {
      keep.add(`${d}/index.html`);
      queue.push(`${d}/index.html`);
    }
  }
  const pageFromRef = (from: string, url: string): string | null => {
    const site = resolveSitePath(from, url);
    if (!site?.startsWith('/html/')) return null;
    let rel = site.slice('/html/'.length);
    if (rel.endsWith('/')) rel += 'index.html';
    return all.has(rel) && isHtml(rel) ? rel : null;
  };
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const ref of htmlRefs(read(cur) ?? '')) {
      if (ref.kind !== 'link' && ref.kind !== 'frame') continue;
      const target = pageFromRef(cur, ref.url);
      if (target && !keep.has(target)) {
        keep.add(target);
        queue.push(target);
      }
    }
  }
  // 남은 JS 안의 `.html` 문자열도 이동으로 본다.
  const jsMentions = (rel: string): string[] => {
    const out: string[] = [];
    for (const m of (read(rel) ?? '').matchAll(/["']([^"'\s<>]+\.html?)(?:[?#][^"']*)?["']/gi)) {
      const t = pageFromRef(rel, m[1] as string);
      if (t) out.push(t);
    }
    return out;
  };

  const assets = files.filter((f) => !isHtml(f));
  const corpus = new Map<string, string>();
  const addText = (rel: string) => {
    const t = read(rel);
    if (t !== undefined) corpus.set(rel, t);
  };
  for (const k of keep) addText(k);
  let changed = true;
  while (changed) {
    changed = false;
    const text = [...corpus.values()].join('\n');
    for (const f of assets) {
      if (keep.has(f)) continue;
      const name = baseName(f);
      if (text.includes(name) || text.includes(encodeURI(name))) {
        keep.add(f);
        addText(f);
        changed = true;
        if (/\.(?:js|mjs)$/i.test(f)) {
          for (const t of jsMentions(f)) {
            if (!keep.has(t)) {
              keep.add(t);
              addText(t);
            }
          }
        }
      }
    }
    // 새로 남은 JS가 가리키는 페이지의 본문도 말뭉치에 넣었으므로 한 번 더 돈다.
    if (!changed) break;
  }
  return {
    keep,
    droppedPages: files.filter((f) => isHtml(f) && !keep.has(f)).sort(),
    droppedAssets: assets.filter((f) => !keep.has(f)).sort(),
  };
}

/** 남은 파일의 내부 참조 중 닿지 않는 것. 사이트 루트(`/`)는 허용한다. */
export function findBrokenRefs(
  files: Set<string>,
  read: (rel: string) => string | undefined,
): { from: string; url: string; kind: RefKind }[] {
  const out: { from: string; url: string; kind: RefKind }[] = [];
  const check = (from: string, refs: Ref[]) => {
    for (const r of refs) {
      if (isSkippableUrl(r.url) || isExternalUrl(r.url)) continue;
      const u = r.url.trim();
      if (u === '/' || /^\/(?:\?|#)/.test(u)) continue;
      const site = resolveSitePath(from, u);
      let ok = false;
      if (site?.startsWith('/html/')) {
        let rel = site.slice('/html/'.length);
        if (rel.endsWith('/')) rel += 'index.html';
        ok = files.has(rel) || files.has(`${rel}/index.html`);
      }
      if (!ok) out.push({ from, url: r.url, kind: r.kind });
    }
  };
  for (const f of [...files].sort()) {
    const t = read(f);
    if (t === undefined) continue;
    if (isHtml(f)) check(f, [...htmlRefs(t), ...cssRefs(t)]);
    else if (/\.css$/i.test(f)) check(f, cssRefs(t));
  }
  return out;
}

// ---------------------------------------------------------------- 수리(repair)

/** `<?=GML_THEME_URL ?>/assets/...` 같은 PHP 출력 태그가 그대로 남은 곳: 태그와 뒤 슬래시를 지워 상대 경로로 만든다. */
export function stripPhpEchoTags(html: string): { text: string; replaced: number } {
  let replaced = 0;
  const text = html.replace(/<\?=\s{0,16}[A-Za-z_]{1,64}\s{0,16}\?>\/?/g, () => {
    replaced++;
    return '';
  });
  return { text, replaced };
}

/** 쉼표로 나누되 괄호 안의 쉼표는 건드리지 않는다. */
function splitTopLevel(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of value) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const urlOf = (entry: string): string | undefined => {
  const m = new RegExp(URL_FN_RE.source, 'i').exec(entry);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
};

const pathOnly = (url: string) => url.split(/[?#]/)[0] ?? url;

/** 현대 브라우저가 쓰지 않는 글꼴 형식(EOT, SVG 글꼴). */
export function isLegacyFontUrl(url: string): boolean {
  return /\.(?:eot|svg)$/i.test(pathOnly(url));
}

/** 사라진 구글 글꼴 얼리 액세스 주소(`fonts.gstatic.com/ea/...`). */
export function isDeadExternalFontUrl(url: string): boolean {
  return /^(?:https?:)?\/\/fonts\.gstatic\.com\/ea\//i.test(url);
}

/**
 * `@font-face`의 `src` 목록에서 `drop(url)`이 참인 항목을 뺀다. 한 `src`가 전부 빠지면 그 선언을 지운다.
 * 한 블록에서 모든 `src`가 사라지면(쓸 수 있는 원본이 없는 글꼴 정의) 그 블록을 통째로 뺀다.
 */
export function filterFontSrc(
  css: string,
  drop: (url: string) => boolean,
): { text: string; removed: number } {
  let removed = 0;
  const text = css.replace(/@font-face\s{0,16}\{[^{}]*\}/gi, (block) => {
    let local = 0;
    const next = block.replace(
      /(\bsrc\s{0,16}:\s{0,16})([^;}]*)(;?)/gi,
      (all, pre: string, value: string, semi: string) => {
        const entries = splitTopLevel(value);
        const kept = entries.filter((e) => {
          const u = urlOf(e);
          return u === undefined || !drop(u);
        });
        if (kept.length === entries.length) return all;
        local += entries.length - kept.length;
        return kept.length === 0 ? '' : `${pre}${kept.join(',')}${semi}`;
      },
    );
    if (local === 0) return block;
    removed += local;
    return /\bsrc\s{0,16}:/i.test(next) ? next : '';
  });
  return { text, removed };
}

const KEEP_IMAGE_HOSTS = new Set(['images.unsplash.com']);
export const IMAGE_PLACEHOLDER_URL = '/html/_placeholder.svg';

/**
 * 외부에서 끌어오는 이미지(언론 사진, 로고, 구글 이미지 검색 썸네일 등)를 로컬 자리표시 이미지로 바꾼다.
 * 제3자 콘텐츠이고 대부분 호스트가 사라졌다. 스톡 사진 호스트(images.unsplash.com)만 그대로 둔다.
 */
export function replaceExternalImages(
  text: string,
  html: boolean,
): { text: string; replaced: number } {
  const refs = html ? [...htmlRefs(text), ...cssRefs(text)] : cssRefs(text);
  const map = new Map<string, string>();
  for (const r of refs) {
    if (r.kind !== 'image' || !isExternalUrl(r.url) || map.has(r.url)) continue;
    let host = '';
    try {
      host = new URL(r.url.startsWith('//') ? `https:${r.url}` : r.url).hostname;
    } catch {
      continue;
    }
    if (KEEP_IMAGE_HOSTS.has(host)) continue;
    for (const form of rawForms(r.url)) map.set(form, IMAGE_PLACEHOLDER_URL);
  }
  const r = replaceRefs(text, map);
  return { text: r.text, replaced: r.count };
}

const HTTPS_OK_HOSTS = ['ajax.googleapis.com', 'fonts.googleapis.com'];

/** `http://`로 불러오지만 https로도 같은 주소가 열리는 호스트를 https로 바꾼다(혼합 콘텐츠 차단 방지). */
export function upgradeHttps(text: string): { text: string; replaced: number } {
  let replaced = 0;
  const re = new RegExp(
    `http://(${HTTPS_OK_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')})/`,
    'g',
  );
  const out = text.replace(re, (_all, host: string) => {
    replaced++;
    return `https://${host}/`;
  });
  return { text: out, replaced };
}

/** 사이트 안에 있는 파일에 닿는 상대·절대 경로 계산. */
function relocate(from: string, original: string, candidate: string): string {
  const m = /^([^?#]*)([?#].*)?$/.exec(original) as RegExpExecArray;
  const suffix = m[2] ?? '';
  if (original.startsWith('/')) return `/html/${candidate}${suffix}`;
  const dir = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : '';
  return `${relativePosix(dir, candidate)}${suffix}`;
}

function relativePosix(fromDir: string, to: string): string {
  const a = fromDir === '' ? [] : fromDir.split('/');
  const b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...Array<string>(a.length - i).fill('..'), ...b.slice(i)].join('/');
}

export type FixReport = {
  relocated: number;
  linksNeutralized: number;
  fontsDropped: number;
  imagesPlaceholdered: number;
  mediaDropped: number;
  unresolved: { from: string; url: string; kind: RefKind }[];
};

/**
 * 주소 전체가 따옴표·괄호·공백·쉼표로 경계 지어진 곳만 한 번에 바꾼다(다른 주소의 일부는 건드리지 않는다).
 * 글자 하나씩 지나가며 맵을 찾으므로 주소가 수만 개여도 글 길이에 비례한다. `속성=값` 꼴이면 `=` 뒤 값도 본다.
 */
function replaceRefs(
  text: string,
  map: ReadonlyMap<string, string>,
): { text: string; count: number } {
  if (map.size === 0) return { text, count: 0 };
  let count = 0;
  const out = text.replace(/(?<=["'(=\s,])[^"'()\s,>]{1,4096}(?=["')\s,>])/g, (tok) => {
    const direct = map.get(tok);
    if (direct !== undefined) {
      count++;
      return direct;
    }
    for (let i = tok.indexOf('='); i >= 0; i = tok.indexOf('=', i + 1)) {
      const r = map.get(tok.slice(i + 1));
      if (r !== undefined) {
        count++;
        return tok.slice(0, i + 1) + r;
      }
    }
    return tok;
  });
  return { text: out, count };
}

const rawForms = (u: string) => [...new Set([u, u.replace(/&/g, '&amp;')])];

/**
 * 남은 파일 집합 기준으로 깨진 내부 참조를 고친다(결정적 규칙).
 *  - 같은 데모 안에 같은 이름의 파일이 하나뿐이면 그 경로로 옮긴다(루트 기준 절대 경로, 폴더 이름이 틀린 글꼴 등).
 *    여럿이면 경로 꼬리가 가장 길게 겹치는 하나, 동점이면 고치지 않는다.
 *  - 없는 페이지로 가는 링크는 `#`으로, 없는 글꼴은 `src` 목록에서, 없는 영상은 `<source>`째로 뺀다.
 *  - 없는 이미지는 자리표시 이미지로 바꾼다. 없는 CSS·JS는 고칠 수 없으므로 unresolved로 돌려준다.
 * `texts`(텍스트 파일 내용)를 직접 고친다. `files`는 남은 모든 파일(바이너리 포함)의 `demo/경로` 집합.
 */
export function fixBrokenRefs(texts: Map<string, string>, files: Set<string>): FixReport {
  const read = (rel: string) => texts.get(rel);
  const report: FixReport = {
    relocated: 0,
    linksNeutralized: 0,
    fontsDropped: 0,
    imagesPlaceholdered: 0,
    mediaDropped: 0,
    unresolved: [],
  };
  const byBase = new Map<string, string[]>();
  for (const f of files) {
    const b = baseName(f);
    const list = byBase.get(b) ?? [];
    list.push(f);
    byBase.set(b, list);
  }
  const broken = findBrokenRefs(files, read);
  const byFile = new Map<string, { url: string; kind: RefKind }[]>();
  const done = new Set<string>();
  for (const b of broken) {
    const key = `${b.from}\0${b.url}`;
    if (done.has(key)) continue;
    done.add(key);
    const list = byFile.get(b.from) ?? [];
    list.push({ url: b.url, kind: b.kind });
    byFile.set(b.from, list);
  }
  for (const [from, list] of byFile) {
    let text = texts.get(from) as string;
    const demo = from.split('/')[0];
    const map = new Map<string, string>();
    const fontUrls = new Set<string>();
    const mediaUrls = new Set<string>();
    const setMap = (url: string, to: string) => {
      for (const f of rawForms(url)) if (!map.has(f)) map.set(f, to);
    };
    for (const b of list) {
      const name = decodeURIComponent(pathOnly(b.url).split('/').pop() ?? '');
      const cands = (byBase.get(name) ?? []).filter((f) => f.startsWith(`${demo}/`) && f !== from);
      const site = resolveSitePath(from, b.url) ?? '';
      const tail = (f: string) => {
        const a = `/html/${f}`.split('/').reverse();
        const c = site.split('/').reverse();
        let n = 0;
        while (n < a.length && n < c.length && a[n] === c[n]) n++;
        return n;
      };
      let target: string | undefined;
      if (cands.length === 1 && b.kind !== 'link') target = cands[0];
      else if (cands.length > 1 && b.kind !== 'link') {
        const ranked = [...cands].sort((x, y) => tail(y) - tail(x));
        if (tail(ranked[0] as string) > tail(ranked[1] as string)) target = ranked[0];
      }
      if (target !== undefined) {
        setMap(b.url, relocate(from, b.url, target));
        report.relocated++;
      } else if (b.kind === 'link') {
        setMap(b.url, '#');
        report.linksNeutralized++;
      } else if (b.kind === 'font') {
        fontUrls.add(b.url);
      } else if (b.kind === 'media') {
        mediaUrls.add(b.url);
      } else if (b.kind === 'image') {
        setMap(b.url, IMAGE_PLACEHOLDER_URL);
        report.imagesPlaceholdered++;
      } else {
        report.unresolved.push({ from, url: b.url, kind: b.kind });
      }
    }
    text = replaceRefs(text, map).text;
    if (fontUrls.size > 0) {
      const r = filterFontSrc(text, (u) => fontUrls.has(u));
      text = r.text;
      report.fontsDropped += r.removed;
      if (r.removed === 0) {
        for (const u of fontUrls) report.unresolved.push({ from, url: u, kind: 'font' });
      }
    }
    if (mediaUrls.size > 0) {
      let removed = 0;
      text = text.replace(/<source\b[^<>]*>/gi, (tag) => {
        const m = /\bsrc\s{0,16}=\s{0,16}(["'])([^"']*)\1/i.exec(tag);
        if (
          m &&
          (mediaUrls.has(m[2] as string) || mediaUrls.has((m[2] as string).replace(/&amp;/g, '&')))
        ) {
          removed++;
          return '';
        }
        return tag;
      });
      report.mediaDropped += removed;
      if (removed === 0) {
        for (const u of mediaUrls) report.unresolved.push({ from, url: u, kind: 'media' });
      }
    }
    texts.set(from, text);
  }
  return report;
}

export type Repair = { file: string; why: string; apply: (text: string) => string };

/** 파일별 결정적 수리. 적용되지 않으면(원문이 바뀌었으면) CLI가 실패한다. */
export const REPAIRS: Repair[] = [
  {
    file: 'atom/assets/js/popper.min.js',
    why: 'ES 모듈 빌드(export default)를 일반 스크립트로 불러와 구문 오류. window.Popper로 노출한다(부트스트랩 4가 찾는 전역).',
    apply: (t) =>
      t.includes('export default ve;')
        ? `(function(){${t.replace(/\n?\/\/# sourceMappingURL=.*$/m, '').replace('export default ve;', 'window.Popper=ve;')}\n})();\n`
        : t,
  },
  {
    file: 'hidea/js/nav.js',
    why: '#grid가 없는 페이지에서 AnimOnScroll이 null.id를 읽어 오류. 요소가 있을 때만 만든다.',
    apply: (t) =>
      t.includes("new AnimOnScroll( document.getElementById( 'grid' )")
        ? t.replace(
            "new AnimOnScroll( document.getElementById( 'grid' )",
            "document.getElementById( 'grid' ) && new AnimOnScroll( document.getElementById( 'grid' )",
          )
        : t,
  },
  {
    file: 'suwon/index.html',
    why: 'util.js가 datetimepicker를 쓰는데 그 스크립트 두 줄이 주석 안에 있다(sub.html과 같게 켠다. bundle은 켜지 않는다).',
    apply: (t) =>
      t.replace(
        /<!-- <script src="[^"]{0,200}bootstrap\.bundle\.min\.js"><\/script>(\s{0,64}<script src="[^"]{0,200}bootstrap-datetimepicker\.min\.js"><\/script>\s{0,64}<script src="[^"]{0,200}bootstrap-datetimepicker\.ko\.js"[^<>]{0,100}><\/script>) -->/,
        '$1',
      ),
  },
  {
    file: 'suwon/sub.html',
    why: 'data-list.js가 jqGrid를 쓰는데 jqGrid 스크립트 두 줄이 주석 안에 있다. 켠다.',
    apply: (t) =>
      t.replace(
        /<!-- (<script src="[^"]{0,200}grid\.locale-en\.js"><\/script>\s{0,64}<script src="[^"]{0,200}jquery\.jqGrid\.js"><\/script>) -->/,
        '$1',
      ),
  },
];

/** 데모에 들어 있는 지도·길찾기 링크(`<a href>`)를 `#`으로 바꾼다. 정류장 ID 등으로 위치가 드러난다. */
export function neutralizeMapLinks(html: string): { text: string; replaced: number } {
  let replaced = 0;
  const text = html.replace(
    /(<a\b[^<>]*?\bhref\s{0,16}=\s{0,16})(["'])([^"']*)\2/gi,
    (all, pre: string, q: string, url: string) => {
      if (!MAP_HOST_RE.test(url)) return all;
      replaced++;
      return `${pre}${q}#${q}`;
    },
  );
  return { text, replaced };
}

/** 자리표시 이미지(SVG). 글꼴 없이 도형만 쓴다. */
export const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="Image omitted"><rect width="640" height="360" fill="#e5e5e5"/><path d="M200 250l70-80 50 55 40-40 80 65z" fill="#c4c4c4"/><circle cx="240" cy="130" r="22" fill="#c4c4c4"/></svg>\n';
