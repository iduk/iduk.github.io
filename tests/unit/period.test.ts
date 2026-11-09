import { describe, expect, it } from 'vitest';
import { formatPeriod } from '../../src/lib/period';

describe('formatPeriod', () => {
  it('월 단위', () => {
    expect(formatPeriod({ start: '2017-09' }, 'ko')).toBe('2017년 9월');
    expect(formatPeriod({ start: '2017-09' }, 'en')).toBe('September 2017');
  });
  it('연도만', () => {
    expect(formatPeriod({ start: '2013' }, 'ko')).toBe('2013년');
    expect(formatPeriod({ start: '2013' }, 'en')).toBe('2013');
  });
  it('범위', () => {
    expect(formatPeriod({ start: '2019-05', end: '2019-07' }, 'ko')).toBe(
      '2019년 5월 – 2019년 7월',
    );
    expect(formatPeriod({ start: '2018-07', end: '2018-08' }, 'en')).toBe(
      'July 2018 – August 2018',
    );
  });
  it('시작과 끝이 같으면 한 번만', () => {
    expect(formatPeriod({ start: '2019-05', end: '2019-05' }, 'en')).toBe('May 2019');
  });
  it('1월·12월 경계(UTC)', () => {
    expect(formatPeriod({ start: '2020-01', end: '2020-12' }, 'en')).toBe(
      'January 2020 – December 2020',
    );
  });
});
