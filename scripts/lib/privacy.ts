/** 개인정보·비밀 값 패턴 검사. 변환 결과 문자열에 하나라도 걸리면 CLI가 멈춘다. */

export type PrivacyHit = {
  kind: 'email' | 'phone' | 'path' | 'secret';
  match: string;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// 국내 휴대폰·지역번호, 국제 표기. 앞뒤가 숫자면 날짜·치수의 일부로 보고 제외한다.
const PHONE_RES = [
  /(?<![\d.-])(?:01[016789]|0[2-6][0-9]?)-\d{3,4}-\d{4}(?![\d-])/g,
  /(?<![\d.-])(?:01[016789])\d{7,8}(?![\d-])/g,
  /(?<![\w])\+\d{1,3}[ -]?\d{1,4}[ -]?\d{3,4}[ -]?\d{4}(?![\d-])/g,
];
const PATH_RE = /(?:\/Users\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)/g;
const SECRET_RES = [
  /\b(?:api[_-]?key|secret|token|passwd|password|pwd)\b\s*[:=]\s*\S+/gi,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
];

function collect(text: string, re: RegExp, kind: PrivacyHit['kind'], out: PrivacyHit[]) {
  for (const m of text.matchAll(re)) out.push({ kind, match: m[0] });
}

export function scanText(text: string): PrivacyHit[] {
  const hits: PrivacyHit[] = [];
  collect(text, EMAIL_RE, 'email', hits);
  for (const re of PHONE_RES) collect(text, re, 'phone', hits);
  collect(text, PATH_RE, 'path', hits);
  for (const re of SECRET_RES) collect(text, re, 'secret', hits);
  return hits;
}
