/**
 * 한계(사람이 눈으로 봐야 하는 것): 이 가드는 패턴으로 잡히는 것(메일, 전화, 등록번호, 접속 정보, 메타데이터)만 본다.
 * 실명, 주소, 사람 얼굴 사진, 그림·윤곽선·래스터로 들어간 글자(PDF 안의 연락처, 이미지 속 번호)는 자동으로 알 수 없다.
 * 새 데모·이미지·PDF를 넣을 때는 반드시 사람이 훑어 본다(docs/07 4절, docs/05 S09).
 *
 * 커밋된 public/html, public/files 트리를 직접 검사하는 가드. CLI(copy-demos, copy-pdfs)를 거치지 않고도
 * 개인정보·접속 정보·메타데이터가 들어오면 `pnpm test`에서 걸린다. 실패 메시지에는 파일과 종류만 담는다(값 없음).
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { hasAccessString, hasMapTrace, isTextFile, OMITTED_IMAGES } from '../../scripts/lib/demos';
import { metadataMarkers } from '../../scripts/lib/imagemeta';
import {
  findHeldPdfs,
  HELD_PDF_SHA256,
  REVIEWED_PDFS,
  readPdfMetadata,
  withoutStreams,
} from '../../scripts/lib/pdf';
import { isExamplePhone, scanDemoText, scanText } from '../../scripts/lib/privacy';

const root = join(import.meta.dirname, '../..');
const htmlDir = join(root, 'public/html');
const filesDir = join(root, 'public/files');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const rel = (full: string) => relative(root, full).split(sep).join('/');
const htmlFiles = walk(htmlDir);
const pdfFiles = existsSync(filesDir) ? walk(filesDir) : [];
const read = (f: string) => readFileSync(f);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/** 메일·전화를 가리려고 흩뜨린 표기를 풀어 쓴다: 이중 인코딩된 @, `(at)`/`AT`, `(dot)`/`DOT`. */
function loosen(raw: string): string {
  let t = raw;
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/&#0{0,8}37;|&#x0{0,8}25;|&percnt;/gi, '%')
      .replace(/%25/gi, '%')
      .replace(/&#0{0,8}64;|&#x0{0,8}40;|&commat;|%40|\\u0040|\\x40/gi, '@');
  }
  return t
    .replace(/[ \t]{0,3}[[(<{][ \t]{0,3}at[ \t]{0,3}[\])>}][ \t]{0,3}/gi, '@')
    .replace(/[ \t]{1,3}at[ \t]{1,3}(?=[\w-]{1,63}[ \t]{1,3}dot[ \t])/gi, '@')
    .replace(/[ \t]{0,3}[[(<{][ \t]{0,3}dot[ \t]{0,3}[\])>}][ \t]{0,3}/gi, '.')
    .replace(/[ \t]{1,3}dot[ \t]{1,3}/gi, '.');
}

describe('public/html 텍스트', () => {
  const texts = htmlFiles.filter((f) => isTextFile(f));

  it('텍스트 파일이 있다', () => {
    expect(texts.length).toBeGreaterThan(20);
  });

  it('개인정보 후보(메일, 전화, 등록번호, 경로, 비밀 값)가 없다', () => {
    const found: string[] = [];
    for (const f of texts) {
      for (const k of new Set(scanDemoText(read(f).toString('utf8')).map((h) => h.kind))) {
        found.push(`${rel(f)}: ${k}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('메일은 contact@example.com 뿐이다(고해상도 이미지 이름 제외)', () => {
    const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
    const found: string[] = [];
    for (const f of texts) {
      for (const m of read(f).toString('utf8').matchAll(re)) {
        if (m[0] !== 'contact@example.com' && !/@\d+x\.(?:png|jpe?g|gif|webp|svg)$/i.test(m[0])) {
          found.push(`${rel(f)}: email`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('전화번호는 예시 값(010-1234-1234)뿐이다', () => {
    const found: string[] = [];
    for (const f of texts) {
      for (const h of scanText(read(f).toString('utf8'))) {
        if (h.kind === 'phone' && !isExamplePhone(h.match)) found.push(`${rel(f)}: phone`);
      }
    }
    expect(found).toEqual([]);
  });

  it('공백·엔티티·퍼센트·AT/DOT로 흩뜨린 표기를 풀어도 메일·전화가 없다(scanDemoText와 별개 구현)', () => {
    const found: string[] = [];
    for (const f of texts) {
      const t = loosen(read(f).toString('utf8'));
      for (const m of t.matchAll(EMAIL)) {
        if (m[0] !== 'contact@example.com' && !/@\d+x\.(?:png|jpe?g|gif|webp|svg)$/i.test(m[0])) {
          found.push(`${rel(f)}: email`);
        }
      }
      for (const h of scanText(t.replace(/(?<=\d)[ \t]{0,3}([-.])[ \t]{0,3}(?=\d)/g, '$1'))) {
        if (h.kind === 'phone' && !isExamplePhone(h.match)) found.push(`${rel(f)}: phone`);
      }
    }
    expect(found).toEqual([]);
  });

  it('접속 정보(옛 서버 호스트, sftp 설정)가 어느 파일의 바이트에도, 어느 경로에도 없다', () => {
    const found = htmlFiles
      .concat(pdfFiles)
      .filter((f) => hasAccessString(read(f).toString('latin1')) || hasAccessString(rel(f)))
      .map(rel);
    expect(found).toEqual([]);
  });

  it('지도 임베드 좌표 흔적(pb=…)이 없다', () => {
    const found = texts.filter((f) => hasMapTrace(read(f).toString('utf8'))).map(rel);
    expect(found).toEqual([]);
  });

  it('소스맵, .DS_Store, .vscode가 없다', () => {
    const found = htmlFiles
      .concat(pdfFiles)
      .filter((f) => /\.map$|(?:^|\/)\.DS_Store$|\/\.vscode\//.test(rel(f)))
      .map(rel);
    expect(found).toEqual([]);
  });
});

describe('public/html 이미지', () => {
  const images = htmlFiles.filter((f) => /\.(?:jpe?g|png|svg|ico|webp|gif)$/i.test(f));

  it('JPEG, PNG, SVG, ICO, WebP, GIF에 EXIF, XMP, 텍스트 청크, 작성자·도구 표식, 남는 바이트가 없다', () => {
    const found: string[] = [];
    for (const f of images)
      for (const m of metadataMarkers(f, read(f))) found.push(`${rel(f)}: ${m}`);
    expect(found).toEqual([]);
  });

  it('증서(license-*)·대표 사진(ceo-*) 파일은 자리표시 이미지뿐이다', () => {
    const names = htmlFiles
      .filter((f) => /\/(?:license-|ceo)[^/]*$/i.test(rel(f)))
      .map((f) => rel(f).replace('public/html/', ''));
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(OMITTED_IMAGES, n).toContain(n);
  });

  it('가려 둔 이미지는 단색에 가까운 작은 자리표시다(원본이 아니다)', async () => {
    const present = OMITTED_IMAGES.filter((n) => htmlFiles.includes(join(htmlDir, n)));
    expect(present.length).toBeGreaterThanOrEqual(15);
    for (const n of present) {
      const full = join(htmlDir, n);
      expect(statSync(full).size, n).toBeLessThan(60_000);
      const stats = await sharp(full).stats();
      for (const c of stats.channels.slice(0, 3)) {
        expect(c.mean, n).toBeGreaterThan(200); // 밝은 회색
        expect(c.stdev, n).toBeLessThan(30); // 거의 단색
      }
    }
  });
});

describe('public/files PDF (지금은 공개하는 PDF가 없다)', () => {
  const pdfs = pdfFiles.filter((f) => f.toLowerCase().endsWith('.pdf'));

  it('PDF가 아닌 파일이 없고, 눈으로 검토를 마친 이름(REVIEWED_PDFS)만 있다', () => {
    expect(pdfFiles).toEqual(pdfs);
    const names = pdfs.map((f) => rel(f).replace('public/files/', ''));
    expect(names.filter((n) => !REVIEWED_PDFS.includes(n))).toEqual([]);
  });

  it('보류 목록(sha256)에 있는 PDF가 없다: 원본이든 속성만 지운 사본이든', () => {
    const files = new Map(pdfs.map((f) => [rel(f), read(f)] as const));
    expect(findHeldPdfs(files)).toEqual([]);
  });

  it('보류 판별 자체가 동작한다: 보류 해시와 같은 내용이 public/files에 복사되면 걸린다', () => {
    const content = Buffer.from('%PDF-1.4 fake held content');
    const sha = createHash('sha256').update(content).digest('hex');
    const files = new Map([
      ['public/files/copied-back.pdf', content],
      ['public/files/other.pdf', Buffer.from('different')],
    ]);
    expect(findHeldPdfs(files, new Set([sha]))).toEqual(['public/files/copied-back.pdf']);
    expect(findHeldPdfs(files, new Set())).toEqual([]);
    // 실제 목록은 해시 4개(원본 3개와 속성만 지운 결과물 1개)이고 모두 64자리 16진수다.
    expect(HELD_PDF_SHA256.size).toBe(4);
    for (const h of HELD_PDF_SHA256) expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('존재하는 PDF가 있다면 Info, XMP, 도구 이름 문자열에 값이 남아 있지 않다', () => {
    for (const f of pdfs) {
      const s = read(f).toString('latin1');
      expect(readPdfMetadata(s), rel(f)).toEqual({
        infoKeys: [],
        xmpWithContent: 0,
        creatorStrings: 0,
      });
      const structural = withoutStreams(s);
      for (const key of [
        'Author',
        'Creator',
        'Producer',
        'Subject',
        'Keywords',
        'CreationDate',
        'ModDate',
      ]) {
        const m = new RegExp(`/${key}(?![A-Za-z])\\s*[(<]\\s*[^)>\\s]`).exec(structural);
        expect(m, `${rel(f)}: ${key} has a value`).toBeNull();
      }
    }
  });

  it('존재하는 PDF가 있다면 구조 텍스트에 개인정보 후보가 없다(그림으로 든 글자는 사람이 본다)', () => {
    for (const f of pdfs)
      expect(scanDemoText(withoutStreams(read(f).toString('latin1'))), rel(f)).toEqual([]);
  });
});
