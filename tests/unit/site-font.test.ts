import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFontFaces } from '../../scripts/lib/budgets';

const root = join(import.meta.dirname, '../..');
const dist = join(root, 'dist');
const css = readFileSync(join(root, 'src/styles/fonts.css'), 'utf8');
const faces = parseFontFaces(css);
const site = faces.find((f) => f.urls[0]?.endsWith('PretendardVariable.site.woff2'));
const inRanges = (cp: number, r: [number, number][]) => r.some(([a, b]) => cp >= a && cp <= b);

describe('사이트 전용 글꼴', () => {
  it('사이트 글꼴 파일이 있고 60KB 이하다', () => {
    expect(site).toBeDefined();
    const file = join(root, 'public/fonts/PretendardVariable.site.woff2');
    expect(statSync(file).size).toBeLessThan(60 * 1024);
  });

  it('@font-face는 사이트 글꼴 하나뿐이고 굵기 범위가 400~800이다', () => {
    expect(faces).toHaveLength(1);
    expect(css).toContain('font-weight: 400 800');
  });

  // 빌드 뒤에만 돈다. 새 글자가 생기면 `make-site-font.py`를 다시 돌리라고 알려 준다.
  describe.skipIf(!existsSync(join(dist, 'index.html')))('빌드 결과 글자', () => {
    it('사이트 페이지의 모든 글자를 사이트 글꼴이 담고 있다', () => {
      const own = site?.ranges as [number, number][];
      const missing = new Set<string>();
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) {
            if (full === join(dist, 'html')) continue; // 데모는 자기 글꼴을 쓴다
            walk(full);
          } else if (name.endsWith('.html')) {
            const text = readFileSync(full, 'utf8')
              .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m) => {
                const t = document_entity(m);
                return t;
              });
            for (const ch of text) {
              const cp = ch.codePointAt(0) as number;
              if (cp > 0x20 && !inRanges(cp, own)) missing.add(ch);
            }
          }
        }
      };
      walk(dist);
      expect(
        [...missing].join(''),
        'dist에 사이트 글꼴에 없는 글자가 있다. pnpm build 후 scripts/make-site-font.py를 다시 실행(파일 머리말 참고)',
      ).toBe('');
    });
  });
});

function document_entity(m: string): string {
  const num = /^&#(x?)([0-9a-f]+);$/i.exec(m);
  if (num) return String.fromCodePoint(Number.parseInt(num[2] as string, num[1] ? 16 : 10));
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  };
  return named[m.slice(1, -1)] ?? ' ';
}
