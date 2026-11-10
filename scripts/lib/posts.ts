/** posts.json 해석 공통 규칙. convert-images와 build-content가 같은 이미지 키를 만들도록 한 곳에 둔다. */
import { basename } from 'node:path';
import { parseContent } from './blocks';
import { slugifyFileName, uniqueName } from './names';

export type Post = {
  id: number;
  slug: string;
  title: string;
  status: string;
  excerpt?: string;
  contentHtml: string;
  publishedAt: string;
  legacyPath: string;
  categories: { slug: string }[];
  featuredImage?: { url: string } | null;
  images?: { url: string }[];
  contentImages?: string[];
  demoLinks?: { slug: string; title: string; url: string }[];
};

export function isPublic(p: Pick<Post, 'status' | 'categories'>): boolean {
  return p.status === 'publish' && p.categories.some((c) => c.slug === 'portfolio');
}

/** 원본 대표 이미지 대신 본문 첫 이미지를 표지로 쓰는 글(원본 대표 이미지가 세로로 긴 한 장짜리 캡처). */
export const COVER_FROM_CONTENT = new Set(['bed-mattress-website']);

/**
 * 사이트에 실제로 쓰는 이미지의 원본 경로(NFC, 중복 제거, 순서대로): 대표 이미지 다음에 본문 이미지.
 * COVER_FROM_CONTENT 글은 대표 이미지를 쓰지 않고 본문 이미지만 쓴다.
 * 이미지 변환(convert-images)과 콘텐츠 변환(build-content)이 같은 목록을 쓴다.
 * 글에 첨부만 되어 있고 본문에 나오지 않는 이미지는 포함하지 않는다.
 */
export function usedImagePaths(p: Post): string[] {
  const all: string[] = [];
  if (p.featuredImage?.url && !COVER_FROM_CONTENT.has(p.slug)) all.push(p.featuredImage.url);
  for (const t of parseContent(p.contentHtml).tokens)
    if (t.kind === 'image' && t.src) all.push(t.src);
  return [...new Set(all.map((u) => u.normalize('NFC')))];
}

/** `<NN>-<ascii-slug>` 이미지 파일명(확장자 없음). n은 1부터. */
export function imageFileStem(n: number, urlPath: string, taken: Set<string>): string {
  return uniqueName(`${String(n).padStart(2, '0')}-${slugifyFileName(basename(urlPath))}`, taken);
}

/** 원본 경로(NFC) → images.json 키. 키의 접두어는 원본 글 슬러그(이름을 바꾼 글도 그대로). */
/** 표지로 쓸 원본 이미지 경로(NFC). */
export function coverImagePath(p: Post): string | undefined {
  if (COVER_FROM_CONTENT.has(p.slug)) return usedImagePaths(p)[0];
  return p.featuredImage?.url?.normalize('NFC');
}

export function imageKeyMap(p: Post): Map<string, string> {
  const map = new Map<string, string>();
  const taken = new Set<string>();
  let n = 0;
  for (const urlPath of usedImagePaths(p)) {
    n += 1;
    const name = imageFileStem(n, urlPath, taken);
    taken.add(name);
    map.set(urlPath, `${p.slug}/${name}`);
  }
  return map;
}
