const WIDTHS = [640, 960, 1280, 1920, 2560];

/** srcset 후보 폭. 원본보다 큰 폭은 만들지 않고, 목록에 없는 원본 폭(예: 1200)은 마지막 후보로 더한다.
 *  maxWidth를 주면 그보다 큰 후보는 넣지 않는다(긴 캡처가 큰 변형을 미리 받지 않게). */
export function srcsetWidths(naturalWidth: number, maxWidth = Number.POSITIVE_INFINITY): number[] {
  const widths = WIDTHS.filter((w) => w <= naturalWidth && w <= maxWidth);
  if (naturalWidth <= maxWidth && !widths.includes(naturalWidth)) widths.push(naturalWidth);
  return widths;
}

/** img의 width/height 속성과 폴백 src 크기. maxWidth를 넘으면 같은 비율로 줄인다. */
export function intrinsicSize(
  natural: { width: number; height: number },
  maxWidth = Number.POSITIVE_INFINITY,
): { width: number; height: number } {
  const width = Math.min(natural.width, maxWidth);
  return { width, height: Math.round((natural.height * width) / natural.width) };
}

/** "원본 크기로 보기" 파일이 틀 안에 보이는 폭(displayWidth, CSS px)보다 클 때만 의미가 있다. */
export function hasLargerFull(naturalWidth: number, displayWidth: number): boolean {
  return naturalWidth > displayWidth;
}
