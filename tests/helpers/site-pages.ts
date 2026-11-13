/**
 * 품질 검사(a11y, responsive)가 쓰는 페이지 목록. 빌드 결과가 아니라 콘텐츠 JSON에서 만들고,
 * 사이트맵과 같은지는 a11y.spec이 따로 확인한다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '../..');
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));

export type Kind = 'home' | 'list' | 'tag' | 'detail' | '404';
export type SitePage = { path: string; kind: Kind; loc: 'ko' | 'en'; slug?: string };

type Project = {
  slug: string;
  tags: string[];
  demo?: string;
  title: { ko: string; en: string };
  blocks: { type: string; image?: string }[];
};
const images: Record<string, { height: number; bytes: number }> = read('src/content/images.json');
export const projects: Project[] = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => read(`src/content/projects/${f}`));
const tags: { id: string }[] = read('src/content/tags.json');
export const usedTagIds = tags
  .filter((t) => projects.some((p) => p.tags.includes(t.id)))
  .map((t) => t.id);

const locales = [
  { loc: 'ko', prefix: '' },
  { loc: 'en', prefix: '/en' },
] as const;

/** 두 언어의 모든 페이지: 홈(= 작업 목록), 태그, 상세, 그리고 404. */
export const allPages: SitePage[] = [
  ...locales.flatMap(({ loc, prefix }) => [
    { path: `${prefix}/`, kind: 'home' as const, loc },
    ...usedTagIds.map((id) => ({
      path: `${prefix}/work/tag/${id}/`,
      kind: 'tag' as const,
      loc,
      slug: id,
    })),
    ...projects.map((p) => ({
      path: `${prefix}/work/${p.slug}/`,
      kind: 'detail' as const,
      loc,
      slug: p.slug,
    })),
  ]),
  { path: '/__not-found__/', kind: '404' as const, loc: 'ko' as const },
];

const imageKeys = (p: Project) => [
  ...new Set(p.blocks.map((b) => b.image).filter((k): k is string => k !== undefined)),
];
const tallest = (p: Project) => Math.max(0, ...imageKeys(p).map((k) => images[k]?.height ?? 0));
const longshotSlugs = projects
  .filter((p) => p.blocks.some((b) => b.type === 'longshot'))
  .sort((a, b) => tallest(b) - tallest(a))
  .map((p) => p.slug);
const heaviest = [...projects]
  .sort(
    (a, b) =>
      imageKeys(b).reduce((s, k) => s + (images[k]?.bytes ?? 0), 0) -
      imageKeys(a).reduce((s, k) => s + (images[k]?.bytes ?? 0), 0),
  )
  .map((p) => p.slug);

/** 대표 상세 글: 가장 긴 영문 제목 3개, 가장 긴 캡처 2개, 가장 무거운 글, 데모가 있는 글. */
export const representativeSlugs = [
  ...new Set([
    ...[...projects]
      .sort((a, b) => b.title.en.length - a.title.en.length)
      .slice(0, 3)
      .map((p) => p.slug),
    ...longshotSlugs.slice(0, 2),
    heaviest[0] as string,
    ...projects.filter((p) => p.demo).map((p) => p.slug),
  ]),
];

/** 대표 페이지(두 언어): 홈(= 작업 목록), 가장 큰 태그 둘, 대표 상세, 404. */
export const representativePages: SitePage[] = (() => {
  const tagSize = (id: string) => projects.filter((p) => p.tags.includes(id)).length;
  const bigTags = [...usedTagIds].sort((a, b) => tagSize(b) - tagSize(a)).slice(0, 2);
  const wanted = new Set<string>([
    ...locales.map(({ prefix }) => `${prefix}/`),
    ...locales.flatMap(({ prefix }) => bigTags.map((id) => `${prefix}/work/tag/${id}/`)),
    ...locales.flatMap(({ prefix }) => representativeSlugs.map((s) => `${prefix}/work/${s}/`)),
    '/__not-found__/',
  ]);
  return allPages.filter((p) => wanted.has(p.path));
})();

/** 라이트/다크 쌍으로 도는 더 작은 집합: 홈(= 작업 목록), 상세 하나(가장 긴 캡처), 두 언어. */
export const themePages: SitePage[] = allPages.filter(
  (p) =>
    p.path === '/' ||
    p.path === '/en/' ||
    p.path === `/work/${longshotSlugs[0]}/` ||
    p.path === `/en/work/${longshotSlugs[0]}/` ||
    p.path === '/__not-found__/',
);

/** 데모 첫 페이지(복사한 서드파티 정적 페이지). */
export const demoIndexes = ['atom', 'hidea', 'sprx', 'suwon'].map((d) => `/html/${d}/`);
