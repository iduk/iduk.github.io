import type { Project } from './schema';

export interface YearGroup {
  year: number;
  projects: Project[];
}

/** 연도별 묶음. 연도 내림차순, 같은 해 안의 순서는 입력 그대로. */
export function groupByYear(projects: Project[]): YearGroup[] {
  const groups = new Map<number, Project[]>();
  for (const p of projects) {
    const list = groups.get(p.year);
    if (list) list.push(p);
    else groups.set(p.year, [p]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({ year, projects: list }));
}

/** 태그를 가진 글만, 입력 순서대로. */
export function projectsByTag(projects: Project[], tagId: string): Project[] {
  return projects.filter((p) => p.tags.includes(tagId));
}

/** 실제로 쓰이는 태그만, 태그 목록의 순서대로. 쓰이지 않는 태그는 페이지를 만들지 않는다. */
export function usedTags<T extends { id: string }>(projects: Project[], tags: T[]): T[] {
  const used = new Set(projects.flatMap((p) => p.tags));
  return tags.filter((t) => used.has(t.id));
}

/** `/work/tag/[tag]/` 정적 경로(두 언어 공용). */
export function tagStaticPaths<T extends { id: string }>(projects: Project[], tags: T[]) {
  return usedTags(projects, tags).map((tag) => ({
    params: { tag: tag.id },
    props: { tag, projects: projectsByTag(projects, tag.id) },
  }));
}

/** `{name}`, `{n}` 자리표시자를 채운 태그 페이지 설명. */
export function tagDescription(template: string, name: string, count: number): string {
  return template.replace('{name}', name).replace('{n}', String(count));
}

/** 목록 행과 상세 대표 이미지를 잇는 view-transition 이름과 그 클래스. */
export function transitionName(slug: string): string {
  return `work-${slug}`;
}
export function transitionClass(slug: string): string {
  return `vt-${slug}`;
}

/** style 속성은 CSP가 막으므로 슬러그별 클래스 규칙으로 내보낸다. */
export function transitionCss(slugs: string[]): string {
  return slugs
    .map((s) => `.${transitionClass(s)}{view-transition-name:${transitionName(s)}}`)
    .join('');
}
