import { describe, expect, it } from 'vitest';
import { slugifyFileName, uniqueName } from '../../scripts/lib/names';

describe('slugifyFileName', () => {
  it('NFC와 NFD로 분해된 한글 이름이 같은 결과를 낸다', () => {
    const nfc = '주문-서비스.PNG'.normalize('NFC');
    const nfd = '주문-서비스.PNG'.normalize('NFD');
    expect(nfc).not.toBe(nfd);
    expect(slugifyFileName(nfd)).toBe(slugifyFileName(nfc));
  });

  it('확장자를 떼고 ASCII 소문자·숫자·하이픈만 남긴다', () => {
    expect(slugifyFileName('OYEdu_mockup (final)-e1586531633658.PNG')).toBe(
      'oyedu-mockup-final-e1586531633658',
    );
  });

  it('남는 글자가 없으면 image로 대체한다', () => {
    expect(slugifyFileName('주문-서비스.PNG')).toBe('image');
  });

  it('앞뒤·연속 하이픈을 정리한다', () => {
    expect(slugifyFileName('--a---b--.jpg')).toBe('a-b');
  });
});

describe('uniqueName', () => {
  it('겹치면 -2, -3을 붙인다', () => {
    expect(uniqueName('a', new Set())).toBe('a');
    expect(uniqueName('a', new Set(['a']))).toBe('a-2');
    expect(uniqueName('a', new Set(['a', 'a-2']))).toBe('a-3');
  });

  it('taken 집합을 바꾸지 않는다', () => {
    const taken = new Set(['a']);
    uniqueName('a', taken);
    expect(taken.size).toBe(1);
  });
});
