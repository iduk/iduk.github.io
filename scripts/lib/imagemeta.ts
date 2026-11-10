/**
 * 이미지 메타데이터 무손실 제거(재인코딩 없음, 순수 Node). 픽셀 데이터는 바이트 그대로 복사한다.
 *  - JPEG: APP1(EXIF, XMP), APP13(Photoshop), COM 세그먼트를 뺀다. ICC(APP2)와 APP14(Adobe 색 변환)는 색 재현에 필요해 남긴다.
 *  - PNG: tEXt, zTXt, iTXt, eXIf, tIME 청크를 뺀다. iCCP 등 색 청크는 남긴다.
 *  - SVG: <metadata>, xpacket, 생성 도구 주석을 뺀다.
 */

const JPEG_DROP = new Set([0xe1, 0xed, 0xfe]);
const PNG_DROP = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

export function stripJpeg(buf: Buffer): Buffer {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('not a JPEG');
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error(`bad JPEG marker at ${i}`);
    let m = buf[i + 1] as number;
    while (m === 0xff) {
      i++;
      m = buf[i + 1] as number;
    }
    if (m === 0xd9 || m === 0x01 || (m >= 0xd0 && m <= 0xd8)) {
      // 길이 없는 마커
      parts.push(buf.subarray(i, i + 2));
      i += 2;
      if (m === 0xd9) break;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (m === 0xda) {
      // 스캔 데이터: 나머지는 그대로(뒤에 오는 마커까지 포함)
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
    if (!JPEG_DROP.has(m)) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  if (i < buf.length) parts.push(buf.subarray(i));
  return Buffer.concat(parts);
}

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function stripPng(buf: Buffer): Buffer {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG');
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let i = 8;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const end = i + 12 + len;
    if (!PNG_DROP.has(type)) parts.push(buf.subarray(i, end));
    i = end;
  }
  return Buffer.concat(parts);
}

/** `open`부터 `close`까지를 지운다. 닫는 표식이 없으면 그대로 둔다. indexOf로만 훑어 입력 길이에 비례한다. */
function removeBlocks(
  text: string,
  open: string,
  close: string,
  wanted?: (rest: string) => boolean,
): string {
  let out = '';
  let pos = 0;
  for (;;) {
    const i = text.indexOf(open, pos);
    if (i < 0) break;
    const end = text.indexOf(close, i + open.length);
    if (end < 0) break;
    if (wanted && !wanted(text.slice(i + open.length, i + open.length + 24))) {
      out += text.slice(pos, i + open.length);
      pos = i + open.length;
      continue;
    }
    out += text.slice(pos, i);
    pos = end + close.length;
  }
  return out + text.slice(pos);
}

export function stripSvg(text: string): string {
  let t = removeBlocks(text, '<?xpacket', '?>');
  t = removeBlocks(t, '<metadata', '</metadata>');
  t = removeBlocks(t, '<!--', '-->', (rest) =>
    /^[ \t\r\n]{0,8}(?:generator|created with)/i.test(rest),
  );
  return t;
}

/** 확장자에 맞는 제거기를 적용한다. 대상이 아니면 null. */
export function stripImage(path: string, buf: Buffer): Buffer | null {
  const lower = path.toLowerCase();
  if (/\.jpe?g$/.test(lower)) return stripJpeg(buf);
  if (lower.endsWith('.png')) return stripPng(buf);
  return null;
}

/** JPEG 헤더(스캔 이전) 세그먼트 마커 목록. */
function jpegMarkers(buf: Buffer): number[] {
  const out: number[] = [];
  let i = 2;
  while (i + 3 < buf.length && buf[i] === 0xff) {
    const m = buf[i + 1] as number;
    if (m === 0xda || m === 0xd9) break;
    out.push(m);
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return out;
}

function pngChunkTypes(buf: Buffer): string[] {
  const out: string[] = [];
  let i = 8;
  while (i + 8 <= buf.length) {
    out.push(buf.toString('latin1', i + 4, i + 8));
    i += 12 + buf.readUInt32BE(i);
  }
  return out;
}

/** SVG에 남은 작성자·도구 표식(구조 검사). 남은 표식 이름을 돌려준다. */
export function svgMarkers(text: string): string[] {
  const found = new Set<string>();
  const checks: [string, RegExp][] = [
    ['svg-metadata-element', /<metadata\b/i],
    ['svg-xpacket', /<\?xpacket/i],
    ['svg-rdf', /\brdf:/i],
    ['svg-dc-field', /\bdc:[a-z]+/i],
    ['svg-cc-field', /\bcc:[a-z]+/i],
    ['svg-inkscape', /\binkscape:/i],
    ['svg-sodipodi', /\bsodipodi:/i],
  ];
  for (const [name, re] of checks) if (re.test(text)) found.add(name);
  // 주석: 작성자·도구·저작권 문구가 든 것. indexOf로만 훑는다.
  let pos = 0;
  for (;;) {
    const i = text.indexOf('<!--', pos);
    if (i < 0) break;
    const end = text.indexOf('-->', i + 4);
    if (end < 0) break;
    if (
      /author|creator|generator|created|copyright|exported|inkscape|illustrator|sketch|figma/i.test(
        text.slice(i + 4, Math.min(end, i + 2000)),
      )
    ) {
      found.add('svg-comment-with-author-or-tool');
    }
    pos = end + 3;
  }
  return [...found];
}

/** ICO: 헤더가 선언한 구조의 끝 뒤에 남은 바이트(트레일러·숨긴 데이터)가 있는가. */
function icoMarkers(buf: Buffer): string[] {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || ![1, 2].includes(buf.readUInt16LE(2))) {
    return ['ico-bad-header'];
  }
  const n = buf.readUInt16LE(4);
  let end = 6 + n * 16;
  for (let k = 0; k < n; k++) {
    const o = 6 + k * 16;
    if (o + 16 > buf.length) return ['ico-bad-directory'];
    end = Math.max(end, buf.readUInt32LE(o + 12) + buf.readUInt32LE(o + 8));
  }
  return buf.length > end ? ['ico-trailing-data'] : [];
}

/** WebP: EXIF, XMP 청크와, RIFF 크기 뒤에 남은 바이트. */
function webpMarkers(buf: Buffer): string[] {
  if (
    buf.length < 12 ||
    buf.toString('latin1', 0, 4) !== 'RIFF' ||
    buf.toString('latin1', 8, 12) !== 'WEBP'
  ) {
    return ['webp-bad-header'];
  }
  const found: string[] = [];
  const riffEnd = 8 + buf.readUInt32LE(4);
  let i = 12;
  while (i + 8 <= Math.min(riffEnd, buf.length)) {
    const type = buf.toString('latin1', i, i + 4);
    if (type === 'EXIF' || type === 'XMP ') found.push(`webp-chunk-${type.trim()}`);
    i += 8 + buf.readUInt32LE(i + 4) + (buf.readUInt32LE(i + 4) % 2);
  }
  if (buf.length > riffEnd) found.push('webp-trailing-data');
  return found;
}

/** GIF: 주석·XMP 응용 확장 블록 표식(문자열 검사). */
function gifMarkers(buf: Buffer): string[] {
  return buf.includes('XMP DataXMP', 0, 'latin1') ? ['gif-xmp'] : [];
}

/** 이미지에 메타데이터 표식이 남아 있는가(구조 검사 + 바이트 검사). 남은 표식 이름을 돌려준다. */
export function metadataMarkers(path: string, buf: Buffer): string[] {
  const found: string[] = [];
  const lower = path.toLowerCase();
  if (/\.jpe?g$/.test(lower)) {
    for (const m of jpegMarkers(buf))
      if (JPEG_DROP.has(m)) found.push(`jpeg-segment-0x${m.toString(16)}`);
  } else if (lower.endsWith('.png')) {
    for (const t of pngChunkTypes(buf)) if (PNG_DROP.has(t)) found.push(`png-chunk-${t}`);
  } else if (lower.endsWith('.svg')) {
    return svgMarkers(buf.toString('utf8'));
  } else if (lower.endsWith('.ico')) {
    found.push(...icoMarkers(buf));
  } else if (lower.endsWith('.webp')) {
    found.push(...webpMarkers(buf));
  } else if (lower.endsWith('.gif')) {
    found.push(...gifMarkers(buf));
  } else {
    return found;
  }
  const s = buf.toString('latin1');
  for (const [name, re] of [
    ['xpacket', /<\?xpacket/],
    ['adobe-ns', /ns\.adobe\.com/],
    ['CreatorTool', /CreatorTool/],
    ['DocumentID', /DocumentID/],
    ['Make', /\bMake\b/],
    ['Model', /\bModel\b/],
  ] as const) {
    if (re.test(s)) found.push(name);
  }
  return found;
}
