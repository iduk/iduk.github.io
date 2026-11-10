import { describe, expect, it } from 'vitest';
import {
  readPdfMetadata,
  shownText,
  stripPdfMetadata,
  withoutStreams,
} from '../../scripts/lib/pdf';

/** 문서 속성이 든 최소 PDF(실제 렌더링용이 아니라 구조 검사용). 값은 모두 가짜. */
function sample(): string {
  const xmp =
    '<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><dc:creator>Someone</dc:creator></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';
  return [
    '%PDF-1.6',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R /Metadata 5 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [] /Count 0 >>',
    'endobj',
    '3 0 obj',
    '<< /Title (Fake Title \\(draft\\)) /Author (A. Writer) /Creator (Fake Editor 1.0) /Producer (Fake Lib) /CreationDate (D:20200101000000Z) >>',
    'endobj',
    '4 0 obj',
    '<< /CreatorInfo << /Creator (Fake Editor 1.0) /Subtype /Artwork >> >>',
    'endobj',
    `5 0 obj\n<</Length ${xmp.length}/Subtype/XML/Type/Metadata>>\nstream\n${xmp}\nendstream\nendobj`,
    '6 0 obj',
    '<< /Length 20 >>',
    'stream',
    '/Creator (kept: binary) ',
    'endstream',
    'endobj',
    'trailer',
    '<< /Root 1 0 R /Info 3 0 R /Size 7 >>',
    '%%EOF',
    '',
  ].join('\n');
}

describe('readPdfMetadata / stripPdfMetadata', () => {
  it('제거 전에는 속성 키, XMP, 도구 이름이 보인다', () => {
    const m = readPdfMetadata(sample());
    expect(m.infoKeys).toEqual(['Author', 'CreationDate', 'Creator', 'Producer', 'Title']);
    expect(m.xmpWithContent).toBe(1);
    expect(m.creatorStrings).toBe(2);
  });

  it('제거 뒤에는 모두 비고 길이가 그대로다', () => {
    const src = sample();
    const out = stripPdfMetadata(src);
    expect(out.length).toBe(src.length);
    expect(readPdfMetadata(out)).toEqual({ infoKeys: [], xmpWithContent: 0, creatorStrings: 0 });
    for (const v of ['Fake Title', 'A. Writer', 'Fake Editor', 'Fake Lib', 'Someone', '2020']) {
      expect(out, v).not.toContain(v);
    }
  });

  it('구조(카탈로그, 트레일러, 객체 번호)와 스트림 본문은 그대로다', () => {
    const out = stripPdfMetadata(sample());
    expect(out).toContain('/Type /Catalog /Pages 2 0 R /Metadata 5 0 R');
    expect(out).toContain('/Root 1 0 R /Info 3 0 R /Size 7');
    expect(out).toContain('/Creator (kept: binary) ');
  });

  it('멱등: 두 번 적용해도 같다', () => {
    const once = stripPdfMetadata(sample());
    expect(stripPdfMetadata(once)).toBe(once);
  });

  it('Info가 객체 스트림 안에 있어 지울 수 없으면 조용히 넘어가지 않고 멈춘다', () => {
    const s = '%PDF-1.6\ntrailer\n<< /Root 1 0 R /Info 9 0 R >>\n%%EOF\n';
    expect(() => stripPdfMetadata(s)).toThrow(/unsupported/);
    expect(() => readPdfMetadata(s)).toThrow(/unsupported/);
  });

  it('암호화, 압축된 XMP는 멈춘다', () => {
    expect(() => stripPdfMetadata(`${sample()}\n/Encrypt 8 0 R`)).toThrow(/encrypted/);
    const compressed = sample().replace('/Subtype/XML', '/Filter/FlateDecode/Subtype/XML');
    expect(() => stripPdfMetadata(compressed)).toThrow(/compressed XMP/);
  });
});

describe('본문 검사 보조', () => {
  it('withoutStreams는 스트림 본문만 뺀다', () => {
    const out = withoutStreams(sample());
    expect(out).toContain('/Producer (Fake Lib)');
    expect(out).not.toContain('kept: binary');
    expect(out).not.toContain('Someone');
  });
  it('shownText는 Tj와 TJ의 문자열만 이어 붙인다', () => {
    const t = shownText('BT /F1 12 Tf (Hello ) Tj [(Wor) -20 (ld\\))] TJ ET 0 0 m 10 10 l S');
    expect(t).toContain('Hello ');
    expect(t).toContain('World)');
    expect(t).not.toContain('0 0 m');
  });
});

describe('사전 끝 계산(16진 문자열)과 떠도는 Info', () => {
  const withHex = (info: string) =>
    [
      '%PDF-1.6',
      '1 0 obj',
      '<< /Type /Catalog /Pages 2 0 R >>',
      'endobj',
      '3 0 obj',
      info,
      'endobj',
      '4 0 obj',
      '<< /Marker (kept) >>',
      'endobj',
      'trailer',
      '<< /Root 1 0 R /Info 3 0 R /Size 5 >>',
      '%%EOF',
      '',
    ].join('\n');

  it('16진 문자열이 `>>` 바로 앞에 와도(<4142>>>) 사전 끝을 올바로 찾는다', () => {
    const src = withHex('<< /Producer <4142> /Title (T) /Id <4142>>>');
    expect(readPdfMetadata(src).infoKeys).toEqual(['Id', 'Producer', 'Title']);
    const out = stripPdfMetadata(src);
    expect(out.length).toBe(src.length);
    expect(out).toContain('<< /Marker (kept) >>'); // 뒤 객체는 그대로
    expect(readPdfMetadata(out).infoKeys).toEqual([]);
    expect(out).not.toContain('<4142>');
    expect(out).toMatch(/3 0 obj\n<< +>>\nendobj/); // 사전이 정확히 `<<  …  >>` 한 덩어리로 비워진다
  });

  it('중첩 사전과 문자열 안의 >> 도 견딘다', () => {
    const src = withHex('<< /Producer (a >> b) /Extra << /K <00>>> /Title (T) >>');
    const out = stripPdfMetadata(src);
    expect(readPdfMetadata(out).infoKeys).toEqual([]);
    expect(out).toContain('<< /Marker (kept) >>');
    expect(out).toMatch(/3 0 obj\n<< +>>\nendobj/);
  });

  it('트레일러가 가리키지 않는 Info 모양 객체가 있으면 조용히 넘기지 않고 멈춘다', () => {
    const src = `${withHex('<< /Title (T) >>')}`.replace(
      '4 0 obj\n<< /Marker (kept) >>',
      '4 0 obj\n<< /Producer (Stray Tool) /CreationDate (D:20200101000000Z) >>',
    );
    expect(() => stripPdfMetadata(src)).toThrow(/not referenced by the trailer/);
    expect(() => readPdfMetadata(src)).toThrow(/not referenced by the trailer/);
  });

  it('객체 스트림만 있고 /Info가 없으면 확인할 수 없으므로 멈춘다', () => {
    const src =
      '%PDF-1.6\n1 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Length 0 >>\nstream\n\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
    expect(() => readPdfMetadata(src)).toThrow(/object streams/);
  });
});
