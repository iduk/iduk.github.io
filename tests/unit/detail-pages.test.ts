import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'parse5';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const dist = process.env.DIST_DIR ?? join(root, 'dist');
const slugs = readdirSync(join(root, 'src/content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));
const SITE = 'https://iduk.co.kr';

type Node = { nodeName: string; attrs?: { name: string; value: string }[]; childNodes?: Node[] };
function find(n: Node, name: string, out: Node[] = []): Node[] {
  if (n.nodeName === name) out.push(n);
  for (const c of n.childNodes ?? []) find(c, name, out);
  return out;
}
const attr = (n: Node, k: string) => n.attrs?.find((a) => a.name === k)?.value;

// Requires `pnpm build` first; skipped when dist/ is absent.
describe.skipIf(!existsSync(dist))('작업 상세 48개 페이지 계약', () => {
  for (const [locale, prefix] of [
    ['ko', ''],
    ['en', '/en'],
  ] as const) {
    for (const slug of slugs) {
      const url = `${prefix}/work/${slug}/`;
      it(url, () => {
        const html = readFileSync(join(dist, url, 'index.html'), 'utf8');
        const doc = parse(html) as unknown as Node;
        expect(find(doc, 'h1')).toHaveLength(1);
        // 헤더의 로고는 옆 글자(iduk)가 이름이라 alt가 비어 있는 장식 이미지다. 본문 이미지만 계약을 본다.
        const imgs = find(doc, 'img').filter((i) => attr(i, 'class') !== 'logo-mark');
        expect(imgs.length).toBeGreaterThan(0);
        for (const img of imgs) {
          expect(attr(img, 'alt')?.trim(), 'alt').toBeTruthy();
          expect(attr(img, 'width'), 'width').toMatch(/^\d+$/);
          expect(attr(img, 'height'), 'height').toMatch(/^\d+$/);
        }
        expect(imgs.filter((i) => attr(i, 'loading') === 'eager')).toHaveLength(1);

        const links = find(doc, 'link');
        const rel = (r: string, hl?: string) =>
          links.filter((l) => attr(l, 'rel') === r && (!hl || attr(l, 'hreflang') === hl));
        const ko = `${SITE}/work/${slug}/`;
        const en = `${SITE}/en/work/${slug}/`;
        expect(rel('canonical').map((l) => attr(l, 'href'))).toEqual([locale === 'ko' ? ko : en]);
        expect(rel('alternate', 'ko').map((l) => attr(l, 'href'))).toEqual([ko]);
        expect(rel('alternate', 'en').map((l) => attr(l, 'href'))).toEqual([en]);
        expect(rel('alternate', 'x-default').map((l) => attr(l, 'href'))).toEqual([ko]);
        const og = find(doc, 'meta').find((m) => attr(m, 'property') === 'og:url');
        expect(attr(og as Node, 'content')).toBe(locale === 'ko' ? ko : en);
      });
    }
  }
  it('hreflang 쌍이 상호 연결(양쪽 페이지가 서로를 가리킨다)', () => {
    for (const slug of slugs) {
      for (const p of [`/work/${slug}/`, `/en/work/${slug}/`]) {
        const html = readFileSync(join(dist, p, 'index.html'), 'utf8');
        expect(html).toContain(`hreflang="ko" href="${SITE}/work/${slug}/"`);
        expect(html).toContain(`hreflang="en" href="${SITE}/en/work/${slug}/"`);
      }
    }
  });
});
