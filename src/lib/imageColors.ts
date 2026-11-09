import images from '../content/images.json';

/** 평균색 `#e9e9e9` → 클래스 이름 `bg-e9e9e9`. 스타일 속성은 CSP가 막으므로 클래스로 칠한다. */
export function colorClass(avgColor: string): string {
  return `bg-${avgColor.slice(1)}`;
}

/** 원본 폭 `388` → 클래스 `mw-388`. 원본보다 크게 늘리지 않으려고 max-width로 제한한다. */
export function widthClass(width: number): string {
  return `mw-${width}`;
}

/** images.json의 모든 평균색·원본 폭에 대한 규칙(중복 제거). Base가 한 번만 낸다. */
export function imageColorCss(): string {
  const list = Object.values(images);
  const colors = [...new Set(list.map((i) => i.avgColor))].sort();
  const widths = [...new Set(list.map((i) => i.width))].sort((a, b) => a - b);
  return (
    colors.map((c) => `.${colorClass(c)}{background-color:${c}}`).join('') +
    widths.map((w) => `.${widthClass(w)}{max-width:${w}px}`).join('')
  );
}
