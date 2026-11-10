import type { Locale } from './i18n';
import { getPublicProjects } from './projects';
import type { Project } from './schema';

/** 한 작업의 OG 이미지: 주소 경로와 해당 언어의 대표 이미지 alt. */
export function ogForProject(project: Project, locale: Locale) {
  return { path: `/og/${project.slug}.jpg`, alt: project.cover.alt[locale] };
}

/** 홈·목록·태그 페이지가 쓰는 기본 OG 이미지: 홈의 첫 대표 작업. */
export async function defaultOgSource(): Promise<Project> {
  const projects = await getPublicProjects();
  const first = projects.find((p) => p.featured) ?? projects[0];
  if (!first) throw new Error('no public projects for the default OG image');
  return first;
}

export async function defaultOg(locale: Locale) {
  return { path: '/og/default.jpg', alt: (await defaultOgSource()).cover.alt[locale] };
}
