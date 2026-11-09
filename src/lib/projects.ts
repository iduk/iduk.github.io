import { getCollection } from 'astro:content';
import type { Project } from './schema';

/** 공개 글 전체. 연도 내림차순, 같은 해는 `order` 오름차순. */
export async function getPublicProjects(): Promise<Project[]> {
  const entries = await getCollection('projects');
  return entries.map((e) => e.data).sort((a, b) => b.year - a.year || a.order - b.order);
}

/** 목록 순서상 앞(prev)·뒤(next) 글. 양끝이나 없는 슬러그는 해당 값이 undefined. */
export function neighbors(projects: Project[], slug: string): { prev?: Project; next?: Project } {
  const i = projects.findIndex((p) => p.slug === slug);
  if (i < 0) return { prev: undefined, next: undefined };
  return { prev: projects[i - 1], next: projects[i + 1] };
}
