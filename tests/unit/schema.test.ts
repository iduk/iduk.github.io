import { describe, expect, it } from 'vitest';
import { createProjectSchema, imageEntrySchema, L, tagSchema } from '../../src/lib/schema';

const keys = new Set(['demo/01-cover', 'demo/02-shot', 'demo/03-tall', 'demo/04-other']);
const schema = createProjectSchema(keys);
const l = (s: string) => ({ ko: `${s} 한글`, en: s });

function valid() {
  return {
    slug: 'demo',
    year: 2020,
    order: 1,
    title: l('Demo'),
    role: l('UI design'),
    summary: l('A demo'),
    tags: ['web'],
    featured: false,
    cover: { image: 'demo/01-cover', alt: l('Cover') },
    blocks: [
      { type: 'image', image: 'demo/02-shot', alt: l('Shot') },
      { type: 'longshot', image: 'demo/03-tall', alt: l('Tall') },
      { type: 'text', body: l('<p>Hi</p>') },
    ],
    legacy: { id: 1, path: '/portfolio/demo/' },
  };
}

describe('L', () => {
  it('en이 빈 문자열이면 실패', () => {
    expect(L.safeParse({ ko: '가', en: '' }).success).toBe(false);
  });
  it('공백만 있어도 실패', () => {
    expect(L.safeParse({ ko: '가', en: '   ' }).success).toBe(false);
    expect(L.safeParse({ ko: '', en: 'a' }).success).toBe(false);
  });
  it('둘 다 있으면 통과', () => {
    expect(L.safeParse({ ko: '가', en: 'a' }).success).toBe(true);
  });
});

describe('projectSchema', () => {
  it('올바른 글은 통과', () => {
    expect(schema.safeParse(valid()).success).toBe(true);
  });
  it('title.en이 비면 실패', () => {
    const p = valid();
    p.title.en = '';
    expect(schema.safeParse(p).success).toBe(false);
  });
  it('alt.en이 비면 실패', () => {
    const p = valid();
    (p.blocks[0] as { alt: { en: string } }).alt.en = '';
    expect(schema.safeParse(p).success).toBe(false);
  });
  it('존재하지 않는 이미지 키면 실패', () => {
    const p = valid();
    p.cover.image = 'demo/99-missing';
    const r = schema.safeParse(p);
    expect(r.success).toBe(false);
    p.cover.image = 'demo/01-cover';
    (p.blocks[0] as { image: string }).image = 'nope/01-x';
    expect(schema.safeParse(p).success).toBe(false);
  });
  it('pair 안의 이미지 키도 검사한다', () => {
    const p = valid();
    p.blocks.push({
      type: 'pair',
      images: [
        { image: 'demo/02-shot', alt: l('a') },
        { image: 'demo/missing', alt: l('b') },
      ],
    } as never);
    expect(schema.safeParse(p).success).toBe(false);
  });
  it('pair는 이미지 2장이어야 한다', () => {
    const p = valid();
    p.blocks.push({ type: 'pair', images: [{ image: 'demo/02-shot', alt: l('a') }] } as never);
    expect(schema.safeParse(p).success).toBe(false);
  });
  it('알 수 없는 블록 종류는 실패', () => {
    const p = valid();
    p.blocks.push({ type: 'video', src: 'x' } as never);
    expect(schema.safeParse(p).success).toBe(false);
  });
  it('status draft-translation은 통과하고 값으로 식별된다', () => {
    const r = schema.safeParse({ ...valid(), status: 'draft-translation' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('draft-translation');
    expect(schema.safeParse({ ...valid(), status: 'other' }).success).toBe(false);
  });
  it('status 없이도 통과하고 undefined', () => {
    const r = schema.safeParse(valid());
    expect(r.success && r.data.status).toBeUndefined();
  });
  it('슬러그는 소문자·숫자·하이픈만', () => {
    expect(schema.safeParse({ ...valid(), slug: 'Bad Slug' }).success).toBe(false);
  });
  it('demo 블록은 project.demo와 같아야 한다', () => {
    const p = { ...valid(), demo: 'atom' };
    p.blocks.push({ type: 'demo', demo: 'atom' } as never);
    expect(schema.safeParse(p).success).toBe(true);
    const q = { ...valid() };
    q.blocks.push({ type: 'demo', demo: 'atom' } as never);
    expect(schema.safeParse(q).success).toBe(false);
  });
  it('기간 형식을 검사한다', () => {
    expect(
      schema.safeParse({ ...valid(), period: { start: '2019-05', end: '2019-07' } }).success,
    ).toBe(true);
    expect(schema.safeParse({ ...valid(), period: { start: '19-5' } }).success).toBe(false);
  });
  it('legacy.path는 /portfolio/ 로 시작한다', () => {
    const p = valid();
    p.legacy.path = '/other/';
    expect(schema.safeParse(p).success).toBe(false);
  });
});

describe('tagSchema / imageEntrySchema', () => {
  it('태그는 키와 {ko,en} 이름', () => {
    expect(tagSchema.safeParse({ id: 'web', name: l('Web') }).success).toBe(true);
    expect(tagSchema.safeParse({ id: 'web', name: { ko: '웹', en: '' } }).success).toBe(false);
  });
  it('이미지 항목은 가로·세로·평균색을 가진다', () => {
    const e = {
      src: '/src/assets/images/a/01-b.webp',
      width: 10,
      height: 10,
      avgColor: '#aabbcc',
      bytes: 1,
      original: 'b.png',
    };
    expect(imageEntrySchema.safeParse(e).success).toBe(true);
    expect(imageEntrySchema.safeParse({ ...e, avgColor: 'red' }).success).toBe(false);
  });
});
