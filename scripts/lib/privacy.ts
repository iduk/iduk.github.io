/** 개인정보·비밀 값 패턴 검사. 변환 결과 문자열에 하나라도 걸리면 CLI가 멈춘다. */

export type PrivacyHit = {
  kind: 'email' | 'phone' | 'path' | 'secret';
  match: string;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// `a (at) b.com`, `a[at]b.com` 같은 난독화. 일반 문장의 "at"은 괄호 없이는 걸리지 않는다.
const OBFUSCATED_EMAIL_RE =
  /[A-Za-z0-9._%+-]+\s*[[(<{]\s*at\s*[\])>}]\s*[A-Za-z0-9-]+(?:\s*(?:\.|[[(<{]\s*dot\s*[\])>}])\s*[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/gi;
// 국내 휴대폰·지역번호·인터넷전화(070)·080·0505. 구분은 하이픈·점·공백 또는 없음, 지역번호는 괄호 가능.
// 앞뒤가 숫자·점·하이픈이면 날짜·치수·버전의 일부로 보고 제외한다. 0으로 시작하지 않는 숫자는 해당 없음.
const PHONE_RES = [
  /(?<![\d.-])\(?0(?:1[016789]|2|[3-6][1-5]|70|80|505?)\)?[-. ]?\d{3,4}[-. ]?\d{4}(?![\d-])/g,
  /(?<![\w])\+\d{1,3}[ -]?(?:\(0\)|0)?[ -]?\d{1,4}[-. ]?\d{3,4}[-. ]?\d{4}(?![\d-])/g,
];
const PATH_RE = /(?:\/Users\/[A-Za-z0-9._-]+|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+)/g;
const SECRET_RES = [
  /\b(?:api[_-]?key|secret|token|passwd|password|pwd)\b\s*[:=]\s*\S+/gi,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{22,}/g,
  /\bAIza[0-9A-Za-z_-]{35}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
];

/** 전각 문자(숫자, ＠)를 반각으로, 여러 종류의 대시와 비분리 공백을 하이픈·공백으로 통일한다. */
function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[‐-―−﹘﹣－]/g, '-')
    .replace(/[   　]/g, ' ');
}

function collect(text: string, re: RegExp, kind: PrivacyHit['kind'], out: PrivacyHit[]) {
  for (const m of text.matchAll(re)) out.push({ kind, match: m[0] });
}

export function scanText(raw: string): PrivacyHit[] {
  const text = normalize(raw);
  const hits: PrivacyHit[] = [];
  collect(text, EMAIL_RE, 'email', hits);
  collect(text, OBFUSCATED_EMAIL_RE, 'email', hits);
  for (const re of PHONE_RES) collect(text, re, 'phone', hits);
  collect(text, PATH_RE, 'path', hits);
  for (const re of SECRET_RES) collect(text, re, 'secret', hits);
  return hits;
}
