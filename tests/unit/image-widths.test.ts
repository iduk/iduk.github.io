import { describe, expect, it } from 'vitest';
import { hasLargerFull, intrinsicSize, srcsetWidths } from '../../src/lib/imageWidths';

describe('srcsetWidths', () => {
  it('원본보다 큰 폭은 만들지 않고 원본 폭을 마지막 후보로 더한다', () => {
    expect(srcsetWidths(1200)).toEqual([640, 960, 1200]);
    expect(srcsetWidths(2560)).toEqual([640, 960, 1280, 1920, 2560]);
  });

  it('maxWidth가 있으면 그보다 큰 후보를 넣지 않는다', () => {
    expect(srcsetWidths(1920, 960)).toEqual([640, 960]);
    expect(Math.max(...srcsetWidths(3000, 960))).toBeLessThanOrEqual(960);
  });

  it('원본이 maxWidth 이하이면 원본 폭이 후보에 남는다', () => {
    expect(srcsetWidths(587, 960)).toEqual([587]);
    expect(srcsetWidths(796, 960)).toEqual([640, 796]);
  });
});

describe('intrinsicSize', () => {
  it('maxWidth가 없으면 원본 크기 그대로', () => {
    expect(intrinsicSize({ width: 1920, height: 8865 })).toEqual({ width: 1920, height: 8865 });
  });

  it('maxWidth를 넘으면 같은 비율로 줄인다', () => {
    expect(intrinsicSize({ width: 1920, height: 8865 }, 960)).toEqual({
      width: 960,
      height: 4433,
    });
  });
});

describe('hasLargerFull', () => {
  it('원본이 표시 폭보다 클 때만 참', () => {
    expect(hasLargerFull(1920, 960)).toBe(true);
    expect(hasLargerFull(961, 960)).toBe(true);
    expect(hasLargerFull(960, 960)).toBe(false);
    expect(hasLargerFull(477, 960)).toBe(false);
  });
});
