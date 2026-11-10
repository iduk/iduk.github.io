/**
 * 첫 로드 바이트 예산을 dist의 HTML 분석만으로 계산한다(브라우저, 네트워크 없음). Lighthouse와 별개로 결정적이다.
 *  - JS: 페이지가 실행하는 스크립트(외부 파일 + 실행되는 인라인)의 gzip 합
 *  - CSS: 인라인 `<style>` + 연결된 스타일시트의 원본·gzip 합
 *  - 글꼴: @font-face의 unicode-range가 페이지 본문 글자와 겹치는 파일(+ 직접 preload한 파일). 브라우저가 실제로
 *    받는 집합과 같아야 하며, 그 일치는 tests/e2e/budgets-fonts.spec.ts가 실제 Chromium으로 확인한다.
 *  - 이미지: 즉시 불러오는(loading != lazy) 이미지 하나하나에 대해 모바일 폭(412px, DPR 1.75)에서 브라우저가 고를
 *    srcset 후보(AVIF 우선)의 파일 크기
 */

import { gzipSync } from 'node:zlib';
import { type DefaultTreeAdapterMap, parse } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

export const MOBILE = { width: 412, dpr: 1.75 } as const;

export type Budgets = {
  jsGzipBytes: number;
  cssGzipBytes: number;
  fontFiles: number;
  fontBytes: number;
  eagerImageBytes: number;
};

export type PageMetrics = {
  jsGzip: number;
  jsFiles: number;
  /** jsFiles 중 따로 요청하는(외부 파일) 것의 경로 */
  jsRequests: string[];
  cssRaw: number;
  cssGzip: number;
  fonts: string[];
  fontBytes: number;
  eagerImages: { src: string; bytes: number }[];
  largestEagerImage: number;
};

const isElement = (n: Node): n is Element => 'tagName' in n;
const attr = (el: Element, name: string) => el.attrs.find((a) => a.name === name)?.value;
const gz = (b: Buffer | string) => gzipSync(b, { level: 9 }).length;

// ---------------------------------------------------------------- unicode-range

export type Range = [number, number];

export function parseUnicodeRange(value: string): Range[] {
  const out: Range[] = [];
  for (const part of value.split(',')) {
    const m = /^\s*U\+([0-9a-f?]+)(?:-([0-9a-f]+))?\s*$/i.exec(part);
    if (!m) continue;
    const a = m[1] as string;
    if (a.includes('?'))
      out.push([
        Number.parseInt(a.replace(/\?/g, '0'), 16),
        Number.parseInt(a.replace(/\?/g, 'f'), 16),
      ]);
    else out.push([Number.parseInt(a, 16), Number.parseInt((m[2] ?? a) as string, 16)]);
  }
  return out;
}

export type FontFace = { family: string; urls: string[]; ranges: Range[] | null };

export function parseFontFaces(css: string): FontFace[] {
  const faces: FontFace[] = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const body = m[1] as string;
    const family = /font-family\s*:\s*(?:"([^"]+)"|'([^']+)'|([^;]+))/i.exec(body);
    const urls = [...body.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi)].map(
      (u) => (u[1] ?? u[2] ?? u[3]) as string,
    );
    const range = /unicode-range\s*:\s*([^;]+)/i.exec(body);
    faces.push({
      family: (family?.[1] ?? family?.[2] ?? family?.[3] ?? '').trim(),
      urls,
      ranges: range ? parseUnicodeRange(range[1] as string) : null,
    });
  }
  return faces;
}

/** 페이지 글자(코드포인트 집합)가 필요로 하는 글꼴 파일. 각 @font-face는 첫 번째 url(가장 선호)만 받는다고 본다. */
export function neededFontUrls(faces: FontFace[], codepoints: Set<number>): string[] {
  const urls = new Set<string>();
  for (const f of faces) {
    const first = f.urls[0];
    if (!first) continue;
    const hit =
      f.ranges === null ||
      [...codepoints].some((c) => (f.ranges as Range[]).some(([a, b]) => c >= a && c <= b));
    if (hit) urls.add(first);
  }
  return [...urls];
}

// ---------------------------------------------------------------- 이미지 후보

/** `sizes`를 모바일 폭에서 평가한 CSS px. 지원: (min|max)-width 조건(px, rem, em), 길이 `N vw`·`N px`. */
export function evaluateSizes(sizes: string | undefined, viewport: number): number {
  const entries = (sizes ?? '100vw').split(/,(?![^(]*\))/).map((s) => s.trim());
  for (const e of entries) {
    const cond = /^((?:\([^)]*\)\s*(?:and\s*)?)*)\s*(.+)$/.exec(e);
    if (!cond) continue;
    const conds = [
      ...(cond[1] ?? '').matchAll(/\(\s*(min|max)-width\s*:\s*([\d.]+)(px|rem|em)\s*\)/g),
    ];
    const ok = conds.every((c) => {
      const v = Number(c[2]) * (c[3] === 'px' ? 1 : 16);
      return c[1] === 'min' ? viewport >= v : viewport <= v;
    });
    if (!ok) continue;
    const len = /^([\d.]+)(vw|px)$/.exec((cond[2] ?? '').trim());
    if (len) return len[2] === 'vw' ? (viewport * Number(len[1])) / 100 : Number(len[1]);
    return viewport;
  }
  return viewport;
}

/** w 기술자 후보 중 필요한 픽셀 폭 이상인 가장 작은 것(없으면 가장 큰 것). */
export function pickCandidate(srcset: string, cssWidth: number, dpr: number): string | undefined {
  const cands = srcset
    .split(',')
    .map((s) => s.trim().split(/\s+/))
    .filter((p) => p[0])
    .map((p) => ({
      url: p[0] as string,
      w: /^(\d+)w$/.test(p[1] ?? '') ? Number.parseInt(p[1] as string, 10) : 0,
    }))
    .sort((a, b) => a.w - b.w);
  const need = cssWidth * dpr;
  return (cands.find((c) => c.w >= need) ?? cands[cands.length - 1])?.url;
}

// ---------------------------------------------------------------- 페이지 분석

type Collected = {
  scripts: { src?: string; inline?: string }[];
  styles: { href?: string; inline?: string }[];
  preloadFonts: string[];
  images: { img: Element; sources: Element[] }[];
  text: string;
};

function collect(html: string): Collected {
  const out: Collected = { scripts: [], styles: [], preloadFonts: [], images: [], text: '' };
  const text: string[] = [];
  const walk = (node: Node, inBody: boolean, picture: Element | null) => {
    if (isElement(node)) {
      const tag = node.tagName;
      const textOf = () =>
        node.childNodes.map((c) => ('value' in c ? (c.value as string) : '')).join('');
      if (tag === 'script') {
        const type = attr(node, 'type');
        if (!type || /javascript|module/i.test(type)) {
          const src = attr(node, 'src');
          out.scripts.push(src ? { src } : { inline: textOf() });
        }
        return;
      }
      if (tag === 'style') {
        out.styles.push({ inline: textOf() });
        return;
      }
      if (tag === 'link') {
        const rel = (attr(node, 'rel') ?? '').toLowerCase().split(/\s+/);
        const href = attr(node, 'href');
        if (href && rel.includes('stylesheet')) out.styles.push({ href });
        if (href && rel.includes('preload') && attr(node, 'as') === 'font')
          out.preloadFonts.push(href);
        return;
      }
      if (tag === 'picture') picture = node;
      if (tag === 'img') {
        const sources = picture
          ? picture.childNodes.filter((c): c is Element => isElement(c) && c.tagName === 'source')
          : [];
        out.images.push({ img: node, sources });
      }
      if (tag === 'template' || tag === 'noscript') return;
      if (tag === 'body') inBody = true;
    } else if (inBody && node.nodeName === '#text') {
      text.push((node as unknown as { value: string }).value);
    }
    if ('childNodes' in node) for (const c of node.childNodes) walk(c, inBody, picture);
  };
  walk(parse(html) as unknown as Node, false, null);
  out.text = text.join(' ');
  return out;
}

const codepointsOf = (s: string): Set<number> => {
  const set = new Set<number>();
  for (const ch of s.replace(/\s+/g, ' ')) set.add(ch.codePointAt(0) as number);
  return set;
};

/** 사이트 경로(`/_astro/x.css`, 쿼리·해시 제거)를 dist 파일 내용으로. 없으면 null. */
export type ReadDist = (urlPath: string) => Buffer | null;

const pathOf = (url: string, base: string) => {
  try {
    return decodeURIComponent(new URL(url, `http://x${base}`).pathname);
  } catch {
    return url;
  }
};

export function analyzePage(html: string, pagePath: string, read: ReadDist): PageMetrics {
  const c = collect(html);
  let jsGzip = 0;
  let jsFiles = 0;
  const jsRequests: string[] = [];
  for (const s of c.scripts) {
    if (s.src) {
      const b = read(pathOf(s.src, pagePath));
      if (b) {
        jsGzip += gz(b);
        jsFiles++;
        jsRequests.push(pathOf(s.src, pagePath));
      }
    } else if (s.inline?.trim()) {
      jsGzip += gz(s.inline);
      jsFiles++;
    }
  }
  let css = '';
  let cssGzip = 0;
  for (const s of c.styles) {
    const text = s.inline ?? read(pathOf(s.href as string, pagePath))?.toString('utf8') ?? '';
    css += text;
    cssGzip += gz(text);
  }
  const needed = neededFontUrls(parseFontFaces(css), codepointsOf(c.text));
  const fontPaths = new Set([
    ...needed.map((u) => pathOf(u, pagePath)),
    ...c.preloadFonts.map((u) => pathOf(u, pagePath)),
  ]);
  let fontBytes = 0;
  for (const p of fontPaths) fontBytes += read(p)?.length ?? 0;

  const eagerImages: PageMetrics['eagerImages'] = [];
  for (const { img, sources } of c.images) {
    if (attr(img, 'loading') === 'lazy') continue;
    const sizes = evaluateSizes(attr(img, 'sizes'), MOBILE.width);
    const avif = sources.find((s) => attr(s, 'type') === 'image/avif');
    const set = (avif && attr(avif, 'srcset')) || attr(img, 'srcset');
    const url = set ? pickCandidate(set, sizes, MOBILE.dpr) : attr(img, 'src');
    if (!url) continue;
    eagerImages.push({ src: url, bytes: read(pathOf(url, pagePath))?.length ?? 0 });
  }
  return {
    jsGzip,
    jsFiles,
    jsRequests: jsRequests.sort(),
    cssRaw: Buffer.byteLength(css),
    cssGzip,
    fonts: [...fontPaths].sort(),
    fontBytes,
    eagerImages,
    largestEagerImage: Math.max(0, ...eagerImages.map((i) => i.bytes)),
  };
}

export function overBudget(m: PageMetrics, b: Budgets): string[] {
  const out: string[] = [];
  if (m.jsGzip > b.jsGzipBytes) out.push(`JS gzip ${m.jsGzip} > ${b.jsGzipBytes}`);
  if (m.cssGzip > b.cssGzipBytes) out.push(`CSS gzip ${m.cssGzip} > ${b.cssGzipBytes}`);
  if (m.fonts.length > b.fontFiles) out.push(`font files ${m.fonts.length} > ${b.fontFiles}`);
  if (m.fontBytes > b.fontBytes) out.push(`font bytes ${m.fontBytes} > ${b.fontBytes}`);
  if (m.largestEagerImage > b.eagerImageBytes)
    out.push(`eager image ${m.largestEagerImage} > ${b.eagerImageBytes}`);
  return out;
}
