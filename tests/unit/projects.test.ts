import { describe, expect, it, vi } from 'vitest';
import type { Project } from '../../src/lib/schema';

const rows = [
  { slug: 'a', year: 2018, order: 2 },
  { slug: 'b', year: 2020, order: 2 },
  { slug: 'c', year: 2018, order: 1 },
  { slug: 'd', year: 2020, order: 1 },
  { slug: 'e', year: 2016, order: 3 },
];

vi.mock('astro:content', () => ({
  getCollection: async () => rows.map((data) => ({ id: data.slug, data })),
}));

const { getPublicProjects, neighbors } = await import('../../src/lib/projects');
const as = (slugs: string[]) => slugs.map((slug) => ({ slug }) as Project);

describe('getPublicProjects', () => {
  it('연도 내림차순, 같은 해는 order 오름차순', async () => {
    const list = await getPublicProjects();
    expect(list.map((p) => p.slug)).toEqual(['d', 'b', 'c', 'a', 'e']);
  });
});

describe('neighbors', () => {
  const list = as(['x', 'y', 'z']);
  it('첫 글은 prev가 없다', () => {
    const n = neighbors(list, 'x');
    expect(n.prev).toBeUndefined();
    expect(n.next?.slug).toBe('y');
  });
  it('마지막 글은 next가 없다', () => {
    const n = neighbors(list, 'z');
    expect(n.prev?.slug).toBe('y');
    expect(n.next).toBeUndefined();
  });
  it('가운데 글은 둘 다 있다', () => {
    const n = neighbors(list, 'y');
    expect([n.prev?.slug, n.next?.slug]).toEqual(['x', 'z']);
  });
  it('없는 슬러그는 둘 다 undefined', () => {
    expect(neighbors(list, 'nope')).toEqual({ prev: undefined, next: undefined });
  });
});
