import { describe, expect, it } from 'vitest';
import {
  metadataMarkers,
  stripImage,
  stripJpeg,
  stripPng,
  stripSvg,
  svgMarkers,
} from '../../scripts/lib/imagemeta';

const seg = (marker: number, payload: Buffer) => {
  const len = Buffer.alloc(2);
  len.writeUInt16BE(payload.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), len, payload]);
};

/** 가짜 JPEG: SOI, APP0(JFIF), APP1(EXIF), APP1(XMP), APP2(ICC), APP13, COM, DQT, SOS + 스캔 데이터, EOI. */
function fakeJpeg(): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')),
    seg(0xe1, Buffer.from('Exif\0\0Make\0Model\0')),
    seg(
      0xe1,
      Buffer.from(
        'http://ns.adobe.com/xap/1.0/\0<?xpacket begin?><x:CreatorTool>t</x:CreatorTool>DocumentID',
      ),
    ),
    seg(0xe2, Buffer.from('ICC_PROFILE\0\x01\x01profile-bytes')),
    seg(0xed, Buffer.from('Photoshop 3.0\0')),
    seg(0xfe, Buffer.from('a comment')),
    seg(0xdb, Buffer.from([0, 1, 2, 3])),
    seg(0xda, Buffer.from([1, 1, 0, 0, 63, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56]), // 스캔 데이터(바이트 스터핑 포함)
    Buffer.from([0xff, 0xd9]),
  ]);
}

const crcless = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
};

function fakePng(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    crcless('IHDR', Buffer.alloc(13)),
    crcless('tEXt', Buffer.from('Software\0Fake Editor')),
    crcless('iTXt', Buffer.from('XML:com.adobe.xmp\0<?xpacket?>CreatorTool')),
    crcless('eXIf', Buffer.from('Make Model')),
    crcless('tIME', Buffer.alloc(7)),
    crcless('iCCP', Buffer.from('icc\0\0data')),
    crcless('IDAT', Buffer.from([1, 2, 3, 4])),
    crcless('IEND', Buffer.alloc(0)),
  ]);
}

describe('JPEG', () => {
  it('EXIF, XMP, Photoshop, 주석 세그먼트를 빼고 나머지는 바이트 그대로 둔다', () => {
    const src = fakeJpeg();
    expect(metadataMarkers('a.jpg', src).length).toBeGreaterThan(0);
    const out = stripJpeg(src);
    expect(metadataMarkers('a.jpg', out)).toEqual([]);
    const s = out.toString('latin1');
    for (const gone of ['Exif', 'CreatorTool', 'DocumentID', 'xpacket', 'Photoshop', 'a comment']) {
      expect(s).not.toContain(gone);
    }
    expect(s).toContain('JFIF'); // APP0 유지
    expect(s).toContain('ICC_PROFILE'); // 색 프로필 유지
    // 스캔 데이터 이후(SOS부터 끝)는 한 바이트도 달라지지 않는다.
    const tail = (b: Buffer) => b.subarray(b.indexOf(Buffer.from([0xff, 0xda])));
    expect(tail(out).equals(tail(src))).toBe(true);
  });
  it('이미 깨끗하면 같은 바이트', () => {
    const once = stripJpeg(fakeJpeg());
    expect(stripJpeg(once).equals(once)).toBe(true);
  });
  it('JPEG가 아니면 예외', () => {
    expect(() => stripJpeg(Buffer.from('nope'))).toThrow();
  });
});

describe('PNG', () => {
  it('tEXt, iTXt, eXIf, tIME 청크를 빼고 IHDR, iCCP, IDAT는 둔다', () => {
    const src = fakePng();
    expect(metadataMarkers('a.png', src).length).toBeGreaterThan(0);
    const out = stripPng(src);
    expect(metadataMarkers('a.png', out)).toEqual([]);
    const s = out.toString('latin1');
    for (const keep of ['IHDR', 'iCCP', 'IDAT', 'IEND']) expect(s).toContain(keep);
    for (const gone of ['tEXt', 'iTXt', 'eXIf', 'tIME', 'CreatorTool', 'Fake Editor']) {
      expect(s).not.toContain(gone);
    }
  });
  it('stripImage는 확장자로 고르고, 대상이 아니면 null', () => {
    expect(stripImage('x.JPG', fakeJpeg())).not.toBeNull();
    expect(stripImage('x.png', fakePng())).not.toBeNull();
    expect(stripImage('x.woff2', Buffer.alloc(4))).toBeNull();
  });
});

describe('SVG', () => {
  it('metadata, xpacket, 생성 도구 주석을 뺀다', () => {
    const svg =
      '<?xpacket begin="" id="x"?><!-- Generator: Adobe Illustrator 1 --><svg><metadata><x:xmpmeta>CreatorTool</x:xmpmeta></metadata><path d="M0 0"/></svg>';
    expect(stripSvg(svg)).toBe('<svg><path d="M0 0"/></svg>');
  });
});

describe('SVG 표식', () => {
  it('작성자·도구 표식을 찾는다', () => {
    const bad: Record<string, string> = {
      'svg-metadata-element': '<svg><metadata></metadata></svg>',
      'svg-xpacket': '<?xpacket begin=""?><svg/>',
      'svg-rdf': '<svg xmlns:rdf="x"><rdf:RDF/></svg>',
      'svg-dc-field': '<svg><dc:creator>x</dc:creator></svg>',
      'svg-inkscape': '<svg inkscape:version="1"/>',
      'svg-sodipodi': '<svg sodipodi:docname="a.svg"/>',
      'svg-comment-with-author-or-tool': '<svg><!-- Created by Someone --></svg>',
    };
    for (const [name, svg] of Object.entries(bad)) expect(svgMarkers(svg), name).toContain(name);
    expect(svgMarkers('<svg><!-- Generator: Some Tool --></svg>')).toContain(
      'svg-comment-with-author-or-tool',
    );
  });
  it('깨끗한 SVG와 무해한 주석은 통과한다', () => {
    expect(
      svgMarkers('<svg xmlns="http://www.w3.org/2000/svg"><!-- icon --><path d="M0 0"/></svg>'),
    ).toEqual([]);
    expect(metadataMarkers('a.svg', Buffer.from('<svg><path/></svg>'))).toEqual([]);
  });
});

describe('ICO, WebP, GIF 표식', () => {
  const ico = (trailing = Buffer.alloc(0)) => {
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2); // 아이콘
    header.writeUInt16LE(1, 4); // 1개
    header.writeUInt32LE(4, 14); // 이미지 크기
    header.writeUInt32LE(22, 18); // 오프셋
    return Buffer.concat([header, Buffer.from([1, 2, 3, 4]), trailing]);
  };
  it('ICO: 선언된 구조 뒤의 남는 바이트를 찾는다', () => {
    expect(metadataMarkers('a.ico', ico())).toEqual([]);
    expect(metadataMarkers('a.ico', ico(Buffer.from('Exif hidden')))).toContain(
      'ico-trailing-data',
    );
    expect(metadataMarkers('a.ico', Buffer.from('nope'))).toContain('ico-bad-header');
  });
  const webp = (chunks: [string, Buffer][], trailing = Buffer.alloc(0)) => {
    const body = Buffer.concat(
      chunks.map(([t, d]) => {
        const h = Buffer.alloc(8);
        h.write(t, 0, 'latin1');
        h.writeUInt32LE(d.length, 4);
        return Buffer.concat([h, d, d.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
      }),
    );
    const riff = Buffer.alloc(12);
    riff.write('RIFF', 0, 'latin1');
    riff.writeUInt32LE(4 + body.length, 4);
    riff.write('WEBP', 8, 'latin1');
    return Buffer.concat([riff, body, trailing]);
  };
  it('WebP: EXIF, XMP 청크와 뒤에 남은 바이트를 찾는다', () => {
    expect(metadataMarkers('a.webp', webp([['VP8 ', Buffer.alloc(10)]]))).toEqual([]);
    expect(
      metadataMarkers(
        'a.webp',
        webp([
          ['VP8 ', Buffer.alloc(10)],
          ['EXIF', Buffer.alloc(6)],
        ]),
      ),
    ).toContain('webp-chunk-EXIF');
    expect(
      metadataMarkers(
        'a.webp',
        webp([
          ['VP8 ', Buffer.alloc(10)],
          ['XMP ', Buffer.alloc(6)],
        ]),
      ),
    ).toContain('webp-chunk-XMP');
    expect(
      metadataMarkers('a.webp', webp([['VP8 ', Buffer.alloc(10)]], Buffer.from('tail'))),
    ).toContain('webp-trailing-data');
  });
  it('GIF: XMP 응용 확장', () => {
    expect(metadataMarkers('a.gif', Buffer.from('GIF89a XMP DataXMP'))).toContain('gif-xmp');
    expect(metadataMarkers('a.gif', Buffer.from('GIF89a'))).toEqual([]);
  });
});
