/** 출력 파일명 규칙: 한글(NFC/NFD 혼재) 파일명을 ASCII 슬러그로 만든다. */

const FALLBACK = 'image';

/** 확장자를 떼고 NFC 정규화한 뒤 ASCII 소문자·숫자·하이픈만 남긴다. 남는 게 없으면 `image`. */
export function slugifyFileName(name: string): string {
  const base = name.normalize('NFC').replace(/\.[A-Za-z0-9]+$/, '');
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug === '' ? FALLBACK : slug;
}

/** `base`가 `taken`에 있으면 `-2`, `-3`을 붙여 비어 있는 이름을 돌려준다. `taken`은 바꾸지 않는다. */
export function uniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
