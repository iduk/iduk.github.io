/**
 * PDF 문서 속성 제거(순수 함수, 파일 입출력 없음). 외부 도구 없이 바이트 길이를 그대로 두고 덮어쓴다.
 * 그래서 xref 오프셋, 선형화 정보, 내용은 바뀌지 않는다.
 *
 * 지우는 것: Info 사전(Author, Creator, Producer, Title, Subject, Keywords, 날짜 등 모든 키),
 *           XMP 메타데이터 스트림, `/Creator (...)` 형태의 도구 이름 문자열.
 * 지원 범위: Info가 일반 객체이고 XMP가 압축되지 않은 PDF. 그 밖의 구조(객체 스트림 안의 Info,
 *           압축된 XMP, 암호화)는 조용히 남기지 않고 예외로 멈춘다.
 *
 * 입력은 latin1로 읽은 문자열(바이트 1:1)이다. 결과도 `Buffer.from(text, 'latin1')`로 되돌린다.
 */

import { createHash } from 'node:crypto';

const EMPTY_XMP =
  '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta><?xpacket end="w"?>';

/** `(...)` 리터럴 문자열의 끝(닫는 괄호 다음 위치). 중첩 괄호와 `\` 이스케이프를 처리한다. */
function literalEnd(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') i++;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i + 1;
  }
  throw new Error('unterminated PDF string');
}

/** `<<`로 시작하는 사전의 끝(`>>` 다음 위치). 문자열 안의 `>>`는 무시한다. */
function dictEnd(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') i = literalEnd(s, i) - 1;
    else if (s.startsWith('<<', i)) {
      depth++;
      i++;
    } else if (s[i] === '<') {
      // 16진 문자열 `<4142>`. 닫는 `>`를 건너뛰어야 뒤따르는 `>>`(사전 끝)와 섞이지 않는다.
      const close = s.indexOf('>', i);
      if (close < 0) throw new Error('unterminated PDF hex string');
      i = close;
    } else if (s.startsWith('>>', i)) {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('unterminated PDF dictionary');
}

function spaces(n: number): string {
  return ' '.repeat(n);
}

function replaceRange(s: string, start: number, end: number, text: string): string {
  if (text.length !== end - start) throw new Error('length must be preserved');
  return s.slice(0, start) + text + s.slice(end);
}

/** 스트림 본문 구간(`stream` 줄바꿈 다음부터 `endstream` 앞까지). 문자열 검색에서 건너뛰는 데 쓴다. */
function streamRanges(s: string): [number, number][] {
  const out: [number, number][] = [];
  let pos = 0;
  for (;;) {
    const m = /(?<!end)stream\r?\n/g;
    m.lastIndex = pos;
    const hit = m.exec(s);
    if (!hit) return out;
    const start = hit.index + hit[0].length;
    const end = s.indexOf('endstream', start);
    if (end < 0) return out;
    out.push([start, end]);
    pos = end + 9;
  }
}

function inRanges(ranges: [number, number][], at: number): boolean {
  return ranges.some(([a, b]) => at >= a && at < b);
}

/** 트레일러가 가리키는 Info 객체 번호들(선형화 PDF는 두 번 나온다). */
function infoRefs(s: string): string[] {
  return [...new Set([...s.matchAll(/\/Info\s+(\d+)\s+\d+\s+R/g)].map((m) => m[1] as string))];
}

/** `N G obj` 뒤 사전의 [start, end). 없으면 null. */
function objectDicts(s: string, num: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of s.matchAll(new RegExp(`(?<![0-9])${num}\\s+\\d+\\s+obj\\s*`, 'g'))) {
    const start = m.index + m[0].length;
    if (s.startsWith('<<', start)) out.push([start, dictEnd(s, start)]);
  }
  return out;
}

/** XMP 스트림(`/Type /Metadata` + `/Subtype /XML`)의 본문 구간들. */
function xmpStreams(s: string): { start: number; end: number; filtered: boolean }[] {
  const out: { start: number; end: number; filtered: boolean }[] = [];
  for (const m of s.matchAll(/(?<![0-9])\d+\s+\d+\s+obj\s*<</g)) {
    const open = m.index + m[0].length - 2;
    const end = dictEnd(s, open);
    const dict = s.slice(open, end);
    if (!/\/Type\s*\/Metadata/.test(dict) || !/\/Subtype\s*\/XML/.test(dict)) continue;
    const body = /^\s*stream\r?\n/.exec(s.slice(end, end + 16));
    const len = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict)?.[1];
    if (!body || len === undefined) throw new Error('XMP stream with indirect or missing /Length');
    const start = end + body[0].length;
    out.push({ start, end: start + Number(len), filtered: /\/Filter/.test(dict) });
  }
  return out;
}

const INFO_LIKE_RE = /\/(?:Producer|Author|CreationDate|ModDate|Keywords|Subject)\s*[(<]/;

/** 트레일러의 /Info가 가리키지 않는데 문서 속성처럼 생긴 객체가 있으면 예외(조용히 남기지 않는다). */
function assertNoStrayInfo(s: string, referenced: string[]): void {
  const ranges = streamRanges(s);
  for (const m of s.matchAll(/(?<![0-9])(\d+)\s+\d+\s+obj\s*<</g)) {
    if (inRanges(ranges, m.index)) continue;
    const open = m.index + m[0].length - 2;
    const dict = s.slice(open, dictEnd(s, open));
    if (INFO_LIKE_RE.test(dict) && !referenced.includes(m[1] as string)) {
      throw new Error(`Info-like dictionary object ${m[1]} is not referenced by the trailer`);
    }
  }
  // 객체 스트림 안은 풀지 않으므로, 압축 스트림이 있는데 Info가 없으면 확인할 수 없다.
  if (referenced.length === 0 && /\/Type\s*\/ObjStm/.test(s)) {
    throw new Error(
      'object streams present but no /Info reference: cannot verify document properties',
    );
  }
}

export type PdfMetadata = {
  /** 값이 있는 Info 키 이름(값은 담지 않는다). */
  infoKeys: string[];
  /** XMP 스트림 중 내용(rdf)이 남은 개수. */
  xmpWithContent: number;
  /** 내용이 남은 `/Creator (...)` 문자열 개수(문서 속성 밖). */
  creatorStrings: number;
};

export function readPdfMetadata(s: string): PdfMetadata {
  assertNoStrayInfo(s, infoRefs(s));
  const keys = new Set<string>();
  for (const num of infoRefs(s)) {
    const dicts = objectDicts(s, num);
    if (dicts.length === 0)
      throw new Error(`Info object ${num} is not a plain object (unsupported PDF layout)`);
    for (const [a, b] of dicts) {
      const body = s.slice(a + 2, b - 2);
      for (const k of body.matchAll(/\/([A-Za-z]+)\s*(?=[(<[/\d])/g)) {
        const after = body.slice((k.index ?? 0) + k[0].length);
        const empty = /^\(\s*\)|^<\s*>/.test(after);
        if (!empty) keys.add(k[1] as string);
      }
    }
  }
  const ranges = streamRanges(s);
  let creatorStrings = 0;
  for (const m of s.matchAll(/\/Creator(?![A-Za-z])\s*\(/g)) {
    if (inRanges(ranges, m.index)) continue;
    const open = m.index + m[0].length - 1;
    if (s.slice(open + 1, literalEnd(s, open) - 1).trim() !== '') creatorStrings++;
  }
  const xmpWithContent = xmpStreams(s).filter((x) =>
    /<rdf:|<dc:|<xmp:|<pdf:/.test(s.slice(x.start, x.end)),
  ).length;
  return { infoKeys: [...keys].sort(), xmpWithContent, creatorStrings };
}

/** 문서 속성을 지운 새 문자열(길이 동일). 지원하지 않는 구조면 예외. */
export function stripPdfMetadata(input: string): string {
  let s = input;
  if (/\/Encrypt\b/.test(s)) throw new Error('encrypted PDF is not supported');
  assertNoStrayInfo(s, infoRefs(s));

  for (const num of infoRefs(s)) {
    const dicts = objectDicts(s, num);
    if (dicts.length === 0)
      throw new Error(`Info object ${num} is not a plain object (unsupported PDF layout)`);
    for (const [a, b] of dicts) s = replaceRange(s, a, b, `<<${spaces(b - a - 4)}>>`);
  }

  for (const x of xmpStreams(s)) {
    if (x.filtered) throw new Error('compressed XMP stream is not supported');
    const len = x.end - x.start;
    if (EMPTY_XMP.length > len) throw new Error('XMP stream too short to blank');
    s = replaceRange(s, x.start, x.end, EMPTY_XMP + spaces(len - EMPTY_XMP.length));
  }

  const ranges = streamRanges(s);
  const spans: [number, number][] = [];
  for (const m of s.matchAll(/\/Creator(?![A-Za-z])\s*\(/g)) {
    if (inRanges(ranges, m.index)) continue;
    const open = m.index + m[0].length - 1;
    spans.push([open + 1, literalEnd(s, open) - 1]);
  }
  for (const [a, b] of spans) s = replaceRange(s, a, b, spaces(b - a));

  return s;
}

/** 스트림 본문(이미지·글꼴·압축 데이터)을 뺀 나머지. 사전, 문서 속성 같은 구조 텍스트만 남는다. */
export function withoutStreams(s: string): string {
  let out = '';
  let pos = 0;
  for (const [a, b] of streamRanges(s)) {
    out += s.slice(pos, a);
    pos = b;
  }
  return out + s.slice(pos);
}

/** 내용 스트림에서 `(...) Tj`, `[(...) 12 (...)] TJ`의 리터럴 문자열만 이어 붙인다. */
export function shownText(content: string): string {
  let out = '';
  for (const m of content.matchAll(
    /\[((?:[^[\]\\]|\\.)*)\]\s*TJ|(\((?:[^()\\]|\\.)*\))\s*(?:Tj|'|")/g,
  )) {
    const body = m[1] ?? m[2] ?? '';
    for (const lit of body.matchAll(/\(((?:[^()\\]|\\.)*)\)/g))
      out += (lit[1] ?? '').replace(/\\(.)/g, '$1');
    out += '\n';
  }
  return out;
}

// ---------------------------------------------------------------- 보류·검토 목록

/**
 * 공개하지 않기로 한 PDF의 sha256(원본, 그리고 문서 속성을 지운 결과물). 이름이나 내용 설명은 두지 않는다.
 * 윤곽선(outline)이나 래스터로 들어간 글자는 텍스트 추출과 패턴 검사에 잡히지 않으므로,
 * PDF는 사람이 페이지를 눈으로 훑어 본 뒤에만 REVIEWED_PDFS에 올린다.
 */
export const HELD_PDF_SHA256: ReadonlySet<string> = new Set([
  '32917db9281b209084190ff0aa0559bf060e64ae9d38c3e97d0a29e0ace7244e', // 눈으로 보니 제3자 연락처가 그림으로 들어 있음
  '841abdbb628012a7e9712fd6fd39c98461c33eeb4a5c00683ce6c7b24f8abefa', // 위 파일에서 문서 속성만 지운 결과물
  '52fd394fd4a2571c3898b00b4883ee3dc03b7e01f8e1a48a2c446017dd1ea2a0',
  'e45486896aa3893604033b9cfe4f1ac4d3eb6bf6376c835d74653b8d80404c98',
]);

/** 사람이 모든 페이지를 눈으로 검토해 공개해도 된다고 확인한 PDF의 `public/files` 파일 이름. 지금은 없다. */
export const REVIEWED_PDFS: readonly string[] = [];

/** 보류 목록에 해당하는 파일(해시로 판별). `files`는 이름 → 내용. */
export function findHeldPdfs(
  files: ReadonlyMap<string, Buffer>,
  held: ReadonlySet<string> = HELD_PDF_SHA256,
): string[] {
  const out: string[] = [];
  for (const [name, buf] of files) {
    if (held.has(createHash('sha256').update(buf).digest('hex'))) out.push(name);
  }
  return out.sort();
}
