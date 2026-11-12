/**
 * dist의 HTML이 가리키는 내부 주소를 모아 실제 파일로 해석되는지 보는 순수 함수 모음.
 * 외부 주소는 목록만 만들고 요청하지 않는다.
 */
import { type DefaultTreeAdapterMap, parse } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

export type PageRefs = {
  refs: { url: string; attr: string }[];
  ids: Set<string>;
  base: string | undefined;
  /** 인라인 `<style>` 본문과 `style=""` 속성 값 */
  inlineStyles: string[];
  /** 실행되는 인라인 `<script>` 본문(JSON·importmap 등 데이터 블록 제외) */
  inlineScripts: string[];
};

const isElement = (n: Node): n is Element => 'tagName' in n;
const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;

function srcsetUrls(value: string): string[] {
  // data: 주소에는 쉼표가 들어 있어 나누지 않는다(어차피 건너뛰는 주소).
  if (/\bdata:/i.test(value)) return [];
  return value
    .split(',')
    .map((s) => s.trim().split(/\s+/)[0] ?? '')
    .filter((u) => u !== '');
}

const URL_ATTRS: Record<string, string[]> = {
  a: ['href'],
  area: ['href'],
  link: ['href'],
  form: ['action'],
  script: ['src'],
  img: ['src'],
  source: ['src'],
  iframe: ['src'],
  frame: ['src'],
  embed: ['src'],
  video: ['src', 'poster'],
  audio: ['src'],
  track: ['src'],
  object: ['data'],
};

/** href/src/srcset/action/poster/data 와 meta의 og:image, `<base href>`, 요소 id·name. */
export function extractPageRefs(html: string): PageRefs {
  const out: PageRefs = {
    refs: [],
    ids: new Set(),
    base: undefined,
    inlineStyles: [],
    inlineScripts: [],
  };
  const walk = (node: Node) => {
    if (isElement(node)) {
      const tag = node.tagName;
      const id = attr(node, 'id');
      if (id) out.ids.add(id);
      const name = attr(node, 'name');
      if (name && tag === 'a') out.ids.add(name);
      if (tag === 'base' && out.base === undefined) out.base = attr(node, 'href');
      const styleAttr = attr(node, 'style');
      if (styleAttr) out.inlineStyles.push(styleAttr);
      const inlineText = () =>
        node.childNodes.map((c) => ('value' in c ? (c.value as string) : '')).join('');
      if (tag === 'style') out.inlineStyles.push(inlineText());
      if (tag === 'script' && !attr(node, 'src')) {
        const type = attr(node, 'type');
        if (!type || /javascript|module/i.test(type)) out.inlineScripts.push(inlineText());
      }
      for (const a of URL_ATTRS[tag] ?? []) {
        const v = attr(node, a);
        if (v !== undefined && !(tag === 'base'))
          out.refs.push({ url: v.trim(), attr: `${tag}[${a}]` });
      }
      if (tag === 'img' || tag === 'source') {
        const set = attr(node, 'srcset');
        if (set) for (const u of srcsetUrls(set)) out.refs.push({ url: u, attr: `${tag}[srcset]` });
      }
      if (tag === 'meta') {
        const prop = attr(node, 'property') ?? attr(node, 'name');
        const content = attr(node, 'content');
        if (content && (prop === 'og:image' || prop === 'og:url' || prop === 'twitter:image')) {
          out.refs.push({ url: content.trim(), attr: `meta[${prop}]` });
        }
      }
      if (tag === 'template' && 'content' in node) walk(node.content as unknown as Node);
    }
    if ('childNodes' in node) for (const c of node.childNodes) walk(c);
  };
  walk(parse(html) as unknown as Node);
  return out;
}

/** 인라인 스크립트 안의 문자열 속 절대·프로토콜 상대 주소(`"https://x"`, `'//x'`, import("https://x"), fetch). */
export function scriptUrls(js: string): string[] {
  const out: string[] = [];
  for (const m of js.matchAll(/["'`]((?:https?:)?\/\/[^\s"'`<>)\\]+)/g)) out.push(m[1] as string);
  return out;
}

/** CSS 안의 `url(...)` 주소(따옴표 제거). data: 는 호출 쪽이 건너뛴다. `@import "x"`도 포함. */
export function cssUrls(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/@import\s+(?:url\(\s*)?(?:"([^"]*)"|'([^']*)')/gi)) {
    const u = (m[1] ?? m[2] ?? '').trim();
    if (u) out.push(u);
  }
  for (const m of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
    const u = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (u) out.push(u);
  }
  return out;
}

export type Resolution =
  | { kind: 'skip' }
  | { kind: 'external'; host: string }
  | { kind: 'internal'; path: string; fragment: string }
  | { kind: 'invalid' };

/**
 * 한 주소를 페이지 기준으로 풀어 분류한다. `pagePath`는 페이지의 사이트 경로(`/work/x/`), `base`는 `<base href>`.
 * 사이트 자신의 절대 주소(`siteOrigin`)는 내부로 본다.
 */
export function classify(
  ref: string,
  pagePath: string,
  siteOrigin: string,
  base?: string,
): Resolution {
  const u = ref.trim();
  if (u === '' || /^(?:data|javascript|mailto|tel|sms|about|blob):/i.test(u))
    return { kind: 'skip' };
  try {
    const baseUrl = new URL(base ?? '', new URL(pagePath, siteOrigin));
    const url = new URL(u, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return { kind: 'skip' };
    if (url.origin !== new URL(siteOrigin).origin) return { kind: 'external', host: url.host };
    return {
      kind: 'internal',
      path: safeDecode(url.pathname),
      fragment: safeDecode(url.hash.replace(/^#/, '')),
    };
  } catch {
    return { kind: 'invalid' };
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** 사이트 경로가 dist의 파일이나 디렉터리 색인으로 해석되는 실제 파일(dist 기준 상대 경로). 없으면 null. */
export function resolveFile(path: string, files: ReadonlySet<string>): string | null {
  const rel = path.replace(/^\/+/, '');
  if (!path.endsWith('/') && rel !== '' && files.has(rel)) return rel;
  const idx = rel === '' ? 'index.html' : `${rel.replace(/\/+$/, '')}/index.html`;
  return files.has(idx) ? idx : null;
}
