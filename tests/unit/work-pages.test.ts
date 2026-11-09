import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const slugs = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

// Requires `pnpm build` first; skipped when dist/ is absent.
describe.skipIf(!existsSync(dist))('작업 상세 페이지 빌드 결과', () => {
  it('공개 글 24개', () => {
    expect(slugs).toHaveLength(24);
  });
  for (const slug of slugs) {
    it(`/work/${slug}/ 와 /en/work/${slug}/`, () => {
      expect(existsSync(join(dist, 'work', slug, 'index.html'))).toBe(true);
      expect(existsSync(join(dist, 'en', 'work', slug, 'index.html'))).toBe(true);
    });
  }
});
