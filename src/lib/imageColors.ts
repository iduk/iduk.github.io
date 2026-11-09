import images from '../content/images.json';

/** 평균색 `#e9e9e9` → 클래스 이름 `bg-e9e9e9`. 스타일 속성은 CSP가 막으므로 클래스로 칠한다. */
export function colorClass(avgColor: string): string {
  return `bg-${avgColor.slice(1)}`;
}

/** images.json의 모든 평균색에 대한 규칙(중복 제거). Base가 한 번만 낸다. */
export function imageColorCss(): string {
  const colors = [...new Set(Object.values(images).map((i) => i.avgColor))].sort();
  return colors.map((c) => `.${colorClass(c)}{background-color:${c}}`).join('');
}
