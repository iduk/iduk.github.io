/**
 * docs/07 1절: 서버 주소·계정 이름은 저장소에 두지 않는다. 옛 서버 호스트 이름과 옛 계정 ID는 이 파일에서도
 * 연속된 글자로 쓰지 않고 조각을 이어 만든다. 추적 중인 모든 텍스트 파일(문서, 스크립트, 테스트, 소스)을 검사한다.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const PATTERNS = [
  new RegExp(['iduk', '[.\\\\]+space'].join(''), 'i'),
  new RegExp(['hihat', 'bar'].join(''), 'i'),
  new RegExp(['iduk', '2\\b'].join(''), 'i'),
];

describe('저장소 전체에 옛 서버 호스트·계정 ID 리터럴이 없다', () => {
  it('추적 중인 텍스트 파일', () => {
    const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 1e8 })
      .toString()
      .split('\0')
      .filter((f) => f !== '' && !f.startsWith('public/') && f !== 'pnpm-lock.yaml')
      .filter((f) => /\.(?:md|ts|mjs|js|json|astro|css|yml|yaml|txt|html)$/i.test(f));
    expect(files.length).toBeGreaterThan(50);
    const hits: string[] = [];
    for (const f of files) {
      const text = readFileSync(join(root, f), 'utf8');
      for (const re of PATTERNS)
        if (re.test(text)) hits.push(`${f}: pattern ${PATTERNS.indexOf(re)}`);
    }
    expect(hits).toEqual([]);
  });

  it('패턴 자체는 동작한다', () => {
    expect(PATTERNS[0]?.test(`x ${['iduk', '.space'].join('')} y`)).toBe(true);
    expect(PATTERNS[1]?.test(['HIHAT', 'BAR'].join(''))).toBe(true);
    expect(PATTERNS.some((re) => re.test('ordinary text'))).toBe(false);
  });
});
