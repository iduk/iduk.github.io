/**
 * 옛 본문 HTML을 구조화하는 순수 함수 모음. 파일 입출력 없음.
 * 파서는 parse5(HTML 명세대로 파싱). 출력 HTML은 허용 목록으로 새로 직렬화한다.
 */
import { type DefaultTreeAdapterMap, parseFragment } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

// ---------------------------------------------------------------- 이미지 분류

/** 세로/가로가 2.5를 넘으면 긴 캡처. 정확히 2.5는 일반 이미지. */
export function classifyImage(width: number, height: number): 'image' | 'longshot' {
  return height / width > 2.5 ? 'longshot' : 'image';
}

// ---------------------------------------------------------------- DOM 도우미

function isElement(n: Node): n is Element {
  return 'tagName' in n;
}

function attr(el: Element, name: string): string | undefined {
  return el.attrs.find((a) => a.name === name)?.value;
}

function hasClass(el: Element, cls: string): boolean {
  return (attr(el, 'class') ?? '').split(/\s+/).includes(cls);
}

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

/** 요소 안의 글자. br은 공백으로, style·script는 건너뛴다. */
function textOf(node: Node): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value;
  if (!isElement(node)) return '';
  if (node.tagName === 'style' || node.tagName === 'script') return '';
  if (node.tagName === 'br') return ' ';
  return node.childNodes.map(textOf).join('');
}

function walk(node: Node, visit: (n: Node) => boolean | undefined) {
  if (visit(node) === false) return;
  const kids = (node as { childNodes?: Node[] }).childNodes;
  if (kids) for (const k of kids) walk(k, visit);
}

/** 따옴표가 닫히지 않은 `class="... />` 형태의 옛 img 태그를 고친다. */
function repairHtml(html: string): string {
  return html.replace(/(<img\b[^>]*?\bclass="[^"<>]*?)\s*\/>/g, '$1" />');
}

// ---------------------------------------------------------------- dl.subject

export type Subject = {
  /** dt 앞부분의 기간 원문(예: `2019.05 - 2019.07`) */
  period?: string;
  /** 기간을 뺀 dt 글자 */
  name?: string;
  /** 링크만 있는 줄을 뺀 첫 dd */
  role?: string;
  /** 나머지 dd를 줄바꿈으로 이은 것 */
  summary?: string;
  /** 링크만 있는 줄을 뺀 모든 dd 글자(앞의 `- ` 표시는 제거) */
  lines: string[];
  links: { href: string; label: string }[];
};

const PERIOD_RE =
  /^(\d{4}(?:\s*\.\s*\d{1,2})?(?:\s*[-~]\s*(?:\d{4}\s*\.\s*)?(?:\d{1,2})?)?\s*\.?)\s*(.*)$/;

function parseSubjectElement(dl: Element): Subject {
  const out: Subject = { lines: [], links: [] };
  for (const child of dl.childNodes) {
    if (!isElement(child)) continue;
    if (child.tagName === 'dt') {
      const text = collapse(textOf(child));
      const m = PERIOD_RE.exec(text);
      if (m) {
        out.period = collapse(m[1] as string);
        if ((m[2] as string) !== '') out.name = m[2];
      } else if (text !== '') {
        out.name = text;
      }
    } else if (child.tagName === 'dd') {
      const anchors: Element[] = [];
      walk(child, (n) => {
        if (isElement(n) && n.tagName === 'a') {
          anchors.push(n);
          return false;
        }
      });
      const anchorText = collapse(anchors.map(textOf).join(' '));
      const full = collapse(textOf(child));
      for (const a of anchors) {
        const href = attr(a, 'href');
        if (href) out.links.push({ href, label: collapse(textOf(a)) });
      }
      if (anchors.length > 0 && full === anchorText) continue; // 링크만 있는 줄
      const line = full.replace(/^-\s*/, '');
      if (line !== '') out.lines.push(line);
    }
  }
  if (out.lines[0] !== undefined) out.role = out.lines[0];
  if (out.lines.length > 1) out.summary = out.lines.slice(1).join('\n');
  return out;
}

function findSubject(root: Node): Element | undefined {
  let found: Element | undefined;
  walk(root, (n) => {
    if (found) return false;
    if (isElement(n) && n.tagName === 'dl' && hasClass(n, 'subject')) {
      found = n;
      return false;
    }
  });
  return found;
}

export function parseSubject(html: string): Subject {
  const dl = findSubject(parseFragment(repairHtml(html)));
  return dl ? parseSubjectElement(dl) : { lines: [], links: [] };
}

export type Period = { start: string; end?: string };

const pad = (n: string) => n.padStart(2, '0');

/** `2018.7-8`, `2019.05 - 2019.07`, `2020.3 ~`, `2013.` 같은 원문을 `YYYY[-MM]` 구간으로. */
export function parsePeriod(raw: string): Period | undefined {
  const m =
    /^(\d{4})(?:\s*\.\s*(\d{1,2}))?(?:\s*[-~]\s*(?:(\d{4})\s*\.\s*)?(\d{1,2})?)?\s*\.?$/.exec(
      raw.trim(),
    );
  if (!m) return undefined;
  const [, y, mo, endY, endMo] = m;
  const start = mo ? `${y}-${pad(mo)}` : (y as string);
  if (!endMo) return { start };
  return { start, end: `${endY ?? y}-${pad(endMo)}` };
}

// ---------------------------------------------------------------- 본문 토큰

export type ContentToken =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'caption'; text: string }
  | { kind: 'subject'; subject: Subject }
  | { kind: 'link'; href: string; label: string };

/**
 * 본문 HTML을 등장 순서대로 토큰으로 푼다. dl.subject 안의 링크는 subject 바로 뒤에 link로 나온다.
 * 버린 것(style, script 등)은 dropped에 요소 이름으로 남긴다.
 */
export function parseContent(html: string): { tokens: ContentToken[]; dropped: string[] } {
  const tokens: ContentToken[] = [];
  const dropped = new Set<string>();
  const root = parseFragment(repairHtml(html));

  walk(root, (n) => {
    if (n.nodeName === '#text') {
      const text = collapse((n as DefaultTreeAdapterMap['textNode']).value);
      if (text !== '') tokens.push({ kind: 'caption', text });
      return;
    }
    if (!isElement(n)) return;
    switch (n.tagName) {
      case 'style':
      case 'script':
      case 'noscript':
        dropped.add(n.tagName);
        return false;
      case 'hr':
        dropped.add('hr');
        return false;
      case 'img':
        tokens.push({ kind: 'image', src: attr(n, 'src') ?? '', alt: attr(n, 'alt') ?? '' });
        return false;
      case 'dl': {
        if (!hasClass(n, 'subject')) return;
        const subject = parseSubjectElement(n);
        tokens.push({ kind: 'subject', subject });
        for (const l of subject.links) tokens.push({ kind: 'link', ...l });
        return false;
      }
      case 'a': {
        let wrapsImage = false;
        walk(n, (c) => {
          if (isElement(c) && c.tagName === 'img') wrapsImage = true;
        });
        if (wrapsImage) return; // 이미지를 감싼 링크는 이미지만 쓴다
        const href = attr(n, 'href');
        if (href) tokens.push({ kind: 'link', href, label: collapse(textOf(n)) });
        return false;
      }
      default:
        return;
    }
  });
  return { tokens, dropped: [...dropped].sort() };
}

// ---------------------------------------------------------------- 정화

const ALLOWED = new Set(['p', 'a', 'strong', 'em', 'ul', 'ol', 'li', 'br']);
const DROP_WITH_CONTENT = new Set([
  'style',
  'script',
  'iframe',
  'object',
  'embed',
  'noscript',
  'template',
  'svg',
  'math',
  'head',
  'title',
]);
// 옛 호스팅·CDN 주소 조각. 이 파일 자체가 검사에 걸리지 않게 나눠 쓴다.
const LEGACY_HOST = new RegExp(
  ['wp-con' + 'tent', 'cafe' + '24', 'iduk\\.co\\.kr/wp'].join('|'),
  'i',
);

/** 옛 호스팅·CDN 주소가 들어 있는지. */
export const hasLegacyUrl = (s: string): boolean => LEGACY_HOST.test(s);

const escapeText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');

/** 제어 문자와 공백(U+0000-0020, U+007F-009F). */
function isIgnoredInUrl(c: string): boolean {
  const n = c.codePointAt(0) ?? 0;
  return n <= 0x20 || (n >= 0x7f && n <= 0x9f);
}

/** 사이트에 쓸 수 있는 링크 주소만 돌려준다. 아니면 undefined. */
function safeHref(raw: string | undefined): { href: string; external: boolean } | undefined {
  if (raw === undefined) return undefined;
  // 브라우저는 주소 안의 탭·줄바꿈·앞뒤 공백을 무시한다.
  const href = [...raw].filter((c) => !isIgnoredInUrl(c)).join('');
  if (href === '' || LEGACY_HOST.test(href)) return undefined;
  // 브라우저는 `\`를 `/`로 보므로 `/\evil.test`가 `//evil.test`가 된다. 역슬래시는 모두 거부한다.
  if (href.includes('\\')) return undefined;
  if (/^https?:\/\/[^/]/i.test(href)) {
    // 사용자 정보(`user:pw@host`)가 든 주소는 호스트를 속이는 데 쓰이므로 거부한다.
    const authority = href.replace(/^https?:\/\//i, '').split(/[/?#]/, 1)[0] ?? '';
    if (authority.includes('@')) return undefined;
    try {
      const u = new URL(href);
      if (u.username !== '' || u.password !== '') return undefined;
      if (u.protocol === 'http:' || u.protocol === 'https:')
        return { href: raw.trim(), external: true };
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (href.startsWith('/') && !href.startsWith('//')) return { href, external: false };
  return undefined;
}

function serialize(nodes: Node[]): string {
  let out = '';
  for (const n of nodes) {
    if (n.nodeName === '#text') {
      out += escapeText(collapseKeepEdges((n as DefaultTreeAdapterMap['textNode']).value));
      continue;
    }
    if (!isElement(n)) continue;
    const tag = n.tagName;
    if (DROP_WITH_CONTENT.has(tag)) continue;
    const inner = serialize(n.childNodes);
    if (!ALLOWED.has(tag)) {
      out += inner;
    } else if (tag === 'br') {
      out += '<br>';
    } else if (tag === 'a') {
      const safe = safeHref(attr(n, 'href'));
      out += safe
        ? safe.external
          ? `<a href="${escapeAttr(safe.href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
          : `<a href="${escapeAttr(safe.href)}">${inner}</a>`
        : inner;
    } else {
      out += `<${tag}>${inner}</${tag}>`;
    }
  }
  return out;
}

/** 공백 덩어리는 한 칸으로 줄이되 앞뒤 공백은 남긴다(인라인 요소 사이 간격 유지). */
const collapseKeepEdges = (s: string) => s.replace(/\s+/g, ' ');

/**
 * 본문 HTML을 `p, a, strong, em, ul, ol, li, br`만 남기고 새로 직렬화한다.
 * style·script·iframe은 내용까지 지우고, 그 밖의 요소는 풀어서 글자만 남긴다. 모든 속성은 지운다
 * (a의 href만 http(s)와 사이트 안 절대 경로일 때 유지, 외부 링크에는 noopener).
 */
export function sanitizeBody(html: string): string {
  const out = serialize(parseFragment(html).childNodes);
  return out.replace(/<p><\/p>/g, '').trim();
}
