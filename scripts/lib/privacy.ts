/** 개인정보·비밀 값 패턴 검사. 변환 결과 문자열에 하나라도 걸리면 CLI가 멈춘다. */

export type PrivacyHit = {
  kind: 'email' | 'phone' | 'path' | 'secret';
  match: string;
};

const EMAIL_RE =
  /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// `a (at) b.com`, `a[at]b.com` 같은 난독화. 일반 문장의 "at"은 괄호 없이는 걸리지 않는다.
const OBFUSCATED_EMAIL_RE =
  /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+\s*[[(<{]\s*at\s*[\])>}]\s*[A-Za-z0-9-]+(?:\s*(?:\.|[[(<{]\s*dot\s*[\])>}])\s*[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/gi;
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

// ---------------------------------------------------------------------------
// 데모 정화: 복사본의 메일·전화번호·등록번호를 예시 값으로 바꾼다(docs/07 4절).
// scanText와 같은 패턴에, 데모에서 실제로 빠져나간 표기(국가번호, 대표번호, 접두 표기, 인코딩된 @,
// 사업자·통신판매 등록번호)를 더했다. scanText 자체는 바꾸지 않는다(변환 스크립트가 같이 쓴다).
// ---------------------------------------------------------------------------

export const DEMO_EMAIL_PLACEHOLDER = 'contact@example.com';
export const DEMO_PHONE_PLACEHOLDER = '000-0000-0000';
export const DEMO_BIZ_PLACEHOLDER = '000-00-00000';
export const DEMO_MAILORDER_PLACEHOLDER = '제0000-0000호';

// 예약 도메인과 예약 TLD, 그리고 고해상도 이미지 이름(`logo@2x.png`)만 예시로 본다.
const EXAMPLE_EMAIL_RE =
  /(?:^|[@\])>}])(?:[a-z0-9-]+\.)*example\.(?:com|org|net)$|\.(?:test|invalid|example|localhost)$|@\d+x\.(?:png|jpe?g|gif|webp|svg)$/;

/** 개인정보가 아닌 예시·자리표시 메일인가. */
export function isExampleEmail(match: string): boolean {
  return EXAMPLE_EMAIL_RE.test(normalize(match).toLowerCase().replace(/\s+/g, ''));
}

// 라이브러리 도움말에 실제로 나오는 가짜 번호만 정확히 허용한다(숫자만 비교, 국가번호 82는 0으로 환산).
// 모양이 비슷하다고 예시로 보지 않는다: 실제 번호가 우연히 1234567로 끝나도 교체 대상이다.
const EXAMPLE_PHONES: ReadonlySet<string> = new Set(['01012341234']);

/** 라이브러리 도움말의 가짜 번호(`010-1234-1234`)인가. */
export function isExamplePhone(match: string): boolean {
  let digits = normalize(match).replace(/\D/g, '');
  if (digits.startsWith('82') && digits.length === 12) digits = `0${digits.slice(2)}`;
  return EXAMPLE_PHONES.has(digits);
}

const PHONE_BODY =
  '\\(?0(?:1[016789]|2|[3-6][1-5]|70|80|505?)\\)?[-. ]?\\d{3,4}[-. ]?\\d{4}(?![\\d-])';
// 국가번호가 `+` 없이 쓰인 표기: `82 2 1234 5678`, `82-2-1234-5678`, `82.2.1234.5678`.
const COUNTRY_RE =
  /(?<![\d.+-])82[ .-]\(?0?(?:2|[3-6][1-5]|1[016789]|70)\)?[ .-]\d{3,4}[ .-]\d{4}(?![\d-])/g;
// 대표번호 15xx/16xx/18xx. SVG 경로·좌표 목록(`M1536 1792`, `1280 1536 1792`)이 걸리지 않도록
// 앞이 숫자·영문자·쉼표·점이면 건너뛰고, 뒤에 숫자가 더 이어져도 건너뛴다.
const SERVICE_RE = /(?<![\d.,A-Za-z-]\s?)1[568]\d{2}[- ]\d{4}(?!\s?[\d.,-])/g;
// 슬래시 구분 `02/3456/7890`.
const SLASH_RE = /(?<![\d./-])0(?:1[016789]|2|[3-6][1-5]|70|80)\/\d{3,4}\/\d{4}(?![\d/])/g;
// `T.02-…`, `F: 02…`, `Tel. 02…`: 앞이 `.`이면 날짜·치수로 보고 건너뛰는 기본 패턴이 놓친다.
const LABELED_RE = new RegExp(
  `(?<=(?:^|[^A-Za-z])(?:tel|fax|mobile|[tfmhp])\\s?[.:]\\s{0,2})${PHONE_BODY}`,
  'gi',
);
// `tel:`, `fax:` 링크의 번호는 형태와 상관없이 번호로 본다.
const LINK_RE = /(?<=\b(?:tel|fax|callto|sms):\s{0,8})\+?\d[\d ()./-]{5,}\d/gi;
// 구분자 주변에 공백이 낀 표기: `02 . 3456 . 7890`, `02 - 3456 - 7890`(기본 패턴은 공백 없는 구분만 본다).
const SPACED_RE =
  /(?<![\d.-])\(?0(?:1[016789]|2|[3-6][1-5]|70|80|505?)\)?(?:[ \t]{0,2}[-.][ \t]{0,2}|[ \t])\d{3,4}(?:[ \t]{0,2}[-.][ \t]{0,2}|[ \t])\d{4}(?![\d-])/g;
// 풀어 쓴 메일: `a AT example DOT com`, `a (at) example (dot) com`. 점 단어가 하나 이상 있어야 메일로 본다.
const AT_WORD =
  '(?:[ \\t]{1,3}at[ \\t]{1,3}|[ \\t]{0,3}[[(<{][ \\t]{0,3}at[ \\t]{0,3}[\\])>}][ \\t]{0,3})';
const DOT_WORD =
  '(?:[ \\t]{1,3}dot[ \\t]{1,3}|[ \\t]{0,3}[[(<{][ \\t]{0,3}dot[ \\t]{0,3}[\\])>}][ \\t]{0,3})';
const SPELLED_EMAIL_RE = new RegExp(
  `(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}${AT_WORD}[A-Za-z0-9-]{1,63}(?:${DOT_WORD}[A-Za-z0-9-]{1,63}){0,4}${DOT_WORD}[A-Za-z]{2,24}(?![A-Za-z0-9-])`,
  'gi',
);
const BIZ_RE = /(?<![\d-])\d{3}-\d{2}-\d{5}(?![\d-])/g;
// `통신판매업 신고번호. 서울OO 제0000-0000`: 번호 부분만 잡는다.
const MAILORDER_RE =
  /(통신판매업?[ \t]{0,8}신고[ \t]{0,8}번호[ \t]{0,8}[.:]?[ \t]{0,8})((?:[가-힣]{1,8}[ \t]?)?제[ \t]?\d{4}-\d{3,6}[ \t]?호?)/g;
// `@`의 인코딩(`&#64;`, `&#x40;`, `&commat;`, `%40`)
// 퍼센트 기호 자체가 인코딩된 이중 표기(`&#37;40`, `%2540`)와 JS 이스케이프(`\u0040`, `\x40`)도 같다.
const AT_TOKEN_RE =
  /&#0{0,8}64;|&#x0{0,8}40;|&commat;|(?:%|&#0{0,8}37;|&#x0{0,8}25;|&percnt;)(?:25)?40|\\u0040|\\x40/iy;

/** 인코딩된 `@`를 풀고 전각 등을 정규화한 문자열과, 정규화 위치 → 원문 위치 표. 바꿀 것이 없으면 null. */
function normalizeWithMap(
  raw: string,
): { text: string; starts: Int32Array; ends: Int32Array } | null {
  // 바꿀 것이 없으면 표가 필요 없다: NFKC가 그대로이고, 특수 대시·공백이 없고, 인코딩된 @ 후보가 없다.
  if (
    raw.normalize('NFKC') === raw &&
    !/[‐-―−﹘﹣－   　]/.test(raw) &&
    !/&#|&commat;|&percnt;|%|\\u0040|\\x40/i.test(raw)
  ) {
    return null;
  }
  const parts: string[] = [];
  let cap = raw.length + 16;
  let starts = new Int32Array(cap);
  let ends = new Int32Array(cap);
  let len = 0;
  const push = (text: string, start: number, end: number) => {
    parts.push(text);
    if (len + text.length > cap) {
      cap = (len + text.length) * 2;
      const s2 = new Int32Array(cap);
      s2.set(starts);
      const e2 = new Int32Array(cap);
      e2.set(ends);
      starts = s2;
      ends = e2;
    }
    for (let k = 0; k < text.length; k++) {
      starts[len] = start;
      ends[len] = end;
      len++;
    }
  };
  let i = 0;
  while (i < raw.length) {
    const code = raw.charCodeAt(i);
    if (code === 0x26 || code === 0x25 || code === 0x5c) {
      AT_TOKEN_RE.lastIndex = i;
      const m = AT_TOKEN_RE.exec(raw);
      if (m) {
        push('@', i, i + m[0].length);
        i += m[0].length;
        continue;
      }
    }
    if (code < 0x80) {
      push(raw[i] as string, i, i + 1);
      i++;
      continue;
    }
    const ch = String.fromCodePoint(raw.codePointAt(i) as number);
    push(normalize(ch), i, i + ch.length);
    i += ch.length;
  }
  return { text: parts.join(''), starts: starts.subarray(0, len), ends: ends.subarray(0, len) };
}

type Span = { start: number; end: number };
type Kind = 'email' | 'phone' | 'biz' | 'mailorder';

function spansOf(text: string, res: RegExp[], keep: (m: string) => boolean): Span[] {
  const out: Span[] = [];
  for (const re of res) {
    for (const m of text.matchAll(re)) {
      if (m.index !== undefined && keep(m[0]))
        out.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return out;
}

/** 겹치는 구간은 하나로 합친다. */
function mergeSpans(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) last.end = Math.max(last.end, s.end);
    else out.push({ ...s });
  }
  return out;
}

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;
const isZeros = (m: string) => /^[\D0]*$/.test(m);

/** 정규화된 문자열에서 종류별로 바꿀 구간을 찾는다. sanitizeDemoText와 residual 검사가 같이 쓴다. */
function findSpans(text: string): Record<Kind, Span[]> {
  const email = mergeSpans(
    spansOf(text, [EMAIL_RE, OBFUSCATED_EMAIL_RE, SPELLED_EMAIL_RE], (m) => !isExampleEmail(m)),
  );
  const mailorder: Span[] = [];
  for (const m of text.matchAll(MAILORDER_RE)) {
    const num = m[2] ?? '';
    if (m.index !== undefined && !/제\s?0+-0+/.test(num)) {
      const start = m.index + (m[1] ?? '').length;
      mailorder.push({ start, end: start + num.length });
    }
  }
  const biz = spansOf(text, [BIZ_RE], (m) => !isZeros(m));
  const phone = mergeSpans(
    spansOf(
      text,
      [...PHONE_RES, COUNTRY_RE, SERVICE_RE, SLASH_RE, LABELED_RE, SPACED_RE],
      (m) => !isExamplePhone(m) && !isZeros(m),
    ).concat(spansOf(text, [LINK_RE], (m) => !isExamplePhone(m) && !isZeros(m))),
  ).filter((p) => !email.some((e) => overlaps(p, e)) && !biz.some((b) => overlaps(p, b)));
  return { email, phone, biz, mailorder };
}

export type SanitizeResult = {
  text: string;
  replaced: number;
  emails: number;
  phones: number;
  regs: number;
};

const TO: Record<Kind, string> = {
  email: DEMO_EMAIL_PLACEHOLDER,
  phone: DEMO_PHONE_PLACEHOLDER,
  biz: DEMO_BIZ_PLACEHOLDER,
  mailorder: DEMO_MAILORDER_PLACEHOLDER,
};

/**
 * 메일은 `contact@example.com`, 전화번호는 `000-0000-0000`, 사업자등록번호는 `000-00-00000`,
 * 통신판매업 신고번호는 `제0000-0000호`로 바꾼다. 같은 입력에 두 번 적용해도 두 번째는 0건이다.
 * 예시 값(`example.com` 메일, `010-1234-1234`, `a@2x.png`)은 그대로 둔다.
 * 전각·난독화·인코딩된 `@` 표기도 잡는다.
 */
export function sanitizeDemoText(raw: string): SanitizeResult {
  const map = normalizeWithMap(raw);
  const text = map ? map.text : raw;
  const spans = findSpans(text);
  const edits = (Object.keys(spans) as Kind[])
    .flatMap((k) => spans[k].map((s) => ({ ...s, to: TO[k], kind: k })))
    .sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const e of edits) {
    const start = map ? (map.starts[e.start] ?? 0) : e.start;
    const end = map ? (map.ends[e.end - 1] ?? raw.length) : e.end;
    out += raw.slice(cursor, start) + e.to;
    cursor = end;
  }
  out += raw.slice(cursor);
  return {
    text: out,
    replaced: edits.length,
    emails: spans.email.length,
    phones: spans.phone.length,
    regs: spans.biz.length + spans.mailorder.length,
  };
}

export type DemoHit = { kind: 'email' | 'phone' | 'reg' | 'path' | 'secret'; match: string };

const SECRET_FALSE_POSITIVE_RE =
  /^(?:secret|password|token)\s*(?:[:=]\s*(?:before\b|!\d|\{|this\.|\/|=)|===)/i;

/**
 * 정화 뒤에 남은 후보(파일 검사용). scanText의 모든 종류에 sanitize가 쓰는 확장 패턴을 더하고,
 * 예시 값과 라이브러리 식별자(`secret:before`)는 뺀다. sanitize 결과에는 0건이어야 한다.
 */
export function scanDemoText(raw: string): DemoHit[] {
  const out: DemoHit[] = [];
  const map = normalizeWithMap(raw);
  const text = map ? map.text : raw;
  const spans = findSpans(text);
  for (const k of ['email', 'phone'] as const) {
    for (const s of spans[k]) out.push({ kind: k, match: text.slice(s.start, s.end) });
  }
  for (const k of ['biz', 'mailorder'] as const) {
    for (const s of spans[k]) out.push({ kind: 'reg', match: text.slice(s.start, s.end) });
  }
  for (const h of scanText(raw)) {
    if (h.kind === 'path') out.push({ kind: 'path', match: h.match });
    if (h.kind === 'secret' && !SECRET_FALSE_POSITIVE_RE.test(h.match)) {
      out.push({ kind: 'secret', match: h.match });
    }
  }
  return out;
}
