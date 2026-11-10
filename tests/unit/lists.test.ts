import { describe, expect, it } from 'vitest';
import {
  groupByYear,
  projectsByTag,
  tagDescription,
  tagStaticPaths,
  transitionCss,
  usedTags,
} from '../../src/lib/lists';
import type { Project } from '../../src/lib/schema';

const p = (slug: string, year: number, tags: string[]) => ({ slug, year, tags }) as Project;
const sample = [
  p('a', 2020, ['web']),
  p('b', 2018, ['app', 'web']),
  p('c', 2020, ['app']),
  p('d', 2013, []),
];

describe('groupByYear', () => {
  it('연도 내림차순으로 묶고 같은 해 순서는 유지한다', () => {
    const g = groupByYear(sample);
    expect(g.map((x) => x.year)).toEqual([2020, 2018, 2013]);
    expect(g[0].projects.map((x) => x.slug)).toEqual(['a', 'c']);
  });
  it('입력이 오름차순이어도 내림차순으로 낸다', () => {
    expect(groupByYear([p('x', 2010, []), p('y', 2012, [])]).map((x) => x.year)).toEqual([
      2012, 2010,
    ]);
  });
  it('빈 입력은 빈 배열', () => {
    expect(groupByYear([])).toEqual([]);
  });
});

describe('projectsByTag / usedTags / tagStaticPaths', () => {
  const tags = [{ id: 'web' }, { id: 'unused' }, { id: 'app' }];
  it('태그를 가진 글만 고른다', () => {
    expect(projectsByTag(sample, 'web').map((x) => x.slug)).toEqual(['a', 'b']);
    expect(projectsByTag(sample, 'none')).toEqual([]);
  });
  it('쓰이는 태그만 태그 목록 순서대로 남긴다', () => {
    expect(usedTags(sample, tags).map((t) => t.id)).toEqual(['web', 'app']);
  });
  it('정적 경로는 쓰이는 태그마다 하나, props에 해당 글을 담는다', () => {
    const paths = tagStaticPaths(sample, tags);
    expect(paths.map((x) => x.params.tag)).toEqual(['web', 'app']);
    expect(paths[1].props.projects.map((x) => x.slug)).toEqual(['b', 'c']);
  });
});

describe('transitionCss', () => {
  it('슬러그마다 클래스 규칙을 낸다', () => {
    expect(transitionCss(['a', 'b-c'])).toBe(
      '.vt-a{view-transition-name:work-a}.vt-b-c{view-transition-name:work-b-c}',
    );
  });
});

describe('tagDescription', () => {
  it('이름과 개수를 채운다', () => {
    expect(tagDescription('{name} 작업 {n}개', '웹', 3)).toBe('웹 작업 3개');
    expect(tagDescription('Projects tagged {name}: {n}', 'Web', 12)).toBe(
      'Projects tagged Web: 12',
    );
  });
});
