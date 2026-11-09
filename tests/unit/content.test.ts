import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasLegacyUrl } from '../../scripts/lib/blocks';
import { scanText } from '../../scripts/lib/privacy';
import { createProjectSchema, imageEntrySchema, tagSchema } from '../../src/lib/schema';

const root = join(import.meta.dirname, '../..');
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const images: Record<string, unknown> = read('src/content/images.json');
const tags: { id: string }[] = read('src/content/tags.json');
const dir = join(root, 'src/content/projects');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const schema = createProjectSchema(new Set(Object.keys(images)));
const projects = files.map((f) => ({ file: f, raw: read(`src/content/projects/${f}`) }));

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out);
  return out;
}

describe('src/content', () => {
  it('공개 글 24개', () => {
    expect(files).toHaveLength(24);
  });
  it('모든 글이 스키마를 통과하고 파일명이 슬러그와 같다', () => {
    for (const { file, raw } of projects) {
      const r = schema.safeParse(raw);
      expect(r.success, `${file}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true);
      expect(`${raw.slug}.json`).toBe(file);
    }
  });
  it('슬러그와 order가 겹치지 않는다', () => {
    const slugs = projects.map((p) => p.raw.slug);
    const orders = projects.map((p) => p.raw.order);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(orders).size).toBe(orders.length);
  });
  it('이미지 항목과 태그가 스키마를 통과한다', () => {
    for (const [k, v] of Object.entries(images)) {
      expect(imageEntrySchema.safeParse(v).success, k).toBe(true);
    }
    for (const t of tags) expect(tagSchema.safeParse(t).success, t.id).toBe(true);
  });
  it('쓰는 태그는 tags.json에 있고, tags.json의 태그는 모두 쓰인다', () => {
    const ids = new Set(tags.map((t) => t.id));
    const used = new Set(projects.flatMap((p) => p.raw.tags as string[]));
    for (const u of used) expect(ids.has(u), u).toBe(true);
    for (const i of ids) expect(used.has(i), i).toBe(true);
  });
  it('대표 작업은 6~8개', () => {
    const n = projects.filter((p) => p.raw.featured).length;
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(8);
  });
  it('데모는 두 글에만 있고 원본 폴더 이름과 맞는다', () => {
    const demos = Object.fromEntries(
      projects.filter((p) => p.raw.demo).map((p) => [p.raw.slug, p.raw.demo]),
    );
    expect(demos).toEqual({
      'engineering-responsive-web': 'atom',
      'telecare-service-website': 'hidea',
    });
  });
  it('긴 캡처는 세로/가로 2.5 초과인 이미지만', () => {
    for (const { raw } of projects) {
      for (const b of raw.blocks) {
        if (b.type !== 'image' && b.type !== 'longshot') continue;
        const e = images[b.image] as { width: number; height: number };
        expect(e.height / e.width > 2.5, `${raw.slug} ${b.image}`).toBe(b.type === 'longshot');
      }
    }
  });
  it('모든 글이 draft-translation 상태', () => {
    for (const { raw } of projects) expect(raw.status).toBe('draft-translation');
  });
  it('옛 주소·개인정보 패턴이 없다', () => {
    const all = strings([projects.map((p) => p.raw), tags]);
    expect(all.filter(hasLegacyUrl)).toEqual([]);
    expect(all.flatMap((s) => scanText(s))).toEqual([]);
  });
  it('참조하는 변환 이미지 파일이 실제로 있다', () => {
    for (const k of Object.keys(images)) {
      expect(existsSync(join(root, 'src/assets/images', `${k}.webp`)), k).toBe(true);
    }
  });
});
