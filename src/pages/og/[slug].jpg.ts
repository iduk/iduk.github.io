import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../lib/og';
import { getPublicProjects } from '../../lib/projects';
import { defaultOgSource } from '../../lib/seo';

// 빌드 시 정적 파일로만 만든다(요청 시 실행되는 코드 없음). 한글·영문이 같은 이미지를 쓴다.
export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getPublicProjects();
  return [
    ...projects.map((p) => ({ params: { slug: p.slug }, props: { image: p.cover.image } })),
    { params: { slug: 'default' }, props: { image: (await defaultOgSource()).cover.image } },
  ];
};

export const GET: APIRoute = async ({ props }) => {
  const body = await renderOg(props.image as string);
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/jpeg' } });
};
