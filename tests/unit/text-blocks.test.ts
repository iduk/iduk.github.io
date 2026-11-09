import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sanitizeBody } from '../../scripts/lib/blocks';

// TextBlock은 set:html로 그리므로, 저장된 본문이 이미 정화된 상태여야 한다.
const dir = join(import.meta.dirname, '../../src/content/projects');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('text 블록 본문은 정화된 HTML 그대로다', () => {
  it('24개 글', () => expect(files).toHaveLength(24));
  for (const f of files) {
    it(f, () => {
      const p = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      for (const b of p.blocks) {
        if (b.type !== 'text') continue;
        for (const loc of ['ko', 'en'] as const) {
          expect(sanitizeBody(b.body[loc]), `${f} ${loc}`).toBe(b.body[loc]);
        }
      }
    });
  }
  it('정화기가 위험 요소를 실제로 바꾼다(검사 자체의 유효성)', () => {
    expect(sanitizeBody('<p onclick="x()">a</p>')).not.toBe('<p onclick="x()">a</p>');
  });
});
