/** posts.json 해석 공통 규칙. convert-images와 build-content가 같은 이미지 키를 만들도록 한 곳에 둔다. */
import { basename } from 'node:path';
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

/** 글이 참조하는 원본 경로를 NFC로 정규화하고 중복을 없애 순서대로 돌려준다. */
export function referencedPaths(p: Post): string[] {
  const all = [
    p.featuredImage?.url,
    ...(p.images ?? []).map((i) => i.url),
    ...(p.contentImages ?? []),
  ];
  const seen = new Set<string>();
  for (const u of all) if (typeof u === 'string' && u !== '') seen.add(u.normalize('NFC'));
  return [...seen];
}

/** `<NN>-<ascii-slug>` 이미지 파일명(확장자 없음). n은 1부터. */
export function imageFileStem(n: number, urlPath: string, taken: Set<string>): string {
  return uniqueName(`${String(n).padStart(2, '0')}-${slugifyFileName(basename(urlPath))}`, taken);
}

/** 원본 경로(NFC) → images.json 키. 키의 접두어는 원본 글 슬러그(이름을 바꾼 글도 그대로). */
export function imageKeyMap(p: Post): Map<string, string> {
  const map = new Map<string, string>();
  const taken = new Set<string>();
  let n = 0;
  for (const urlPath of referencedPaths(p)) {
    n += 1;
    const name = imageFileStem(n, urlPath, taken);
    taken.add(name);
    map.set(urlPath, `${p.slug}/${name}`);
  }
  return map;
}
