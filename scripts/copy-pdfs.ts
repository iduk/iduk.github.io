/**
 * PDF를 ../iduk.design/images/other/pdf 에서 public/files 로 복사한다. 이름은 ASCII로 정리하고 문서 속성을 지운다.
 * 원본은 읽기만 한다. 링크는 걸지 않는다(걸 곳은 사용자가 정한다).
 *
 *   pnpm tsx scripts/copy-pdfs.ts
 *
 * 파일은 이름이 아니라 sha256으로 구분한다.
 *  - HELD_PDF_SHA256(lib/pdf.ts): 복사하지 않는다. public/files 에 있는 다른 파일(복사본 포함)은 모두 지운다.
 *  - PUBLISH: 사람이 모든 페이지를 눈으로 훑어 공개해도 된다고 확인한 파일. 문서 속성을 지워 복사한다.
 *    윤곽선·래스터로 들어간 글자(연락처 등)는 텍스트 검사에 잡히지 않으므로 자동 검사만으로는 올리지 않는다.
 *  - 둘 다 아닌 새 PDF가 나타나면 검토 전이므로 실패한다.
 * 복사하는 파일은 구조 텍스트와 내용 스트림의 표시 문자열에 개인정보 검사를 돌려 걸리면 실패한다.
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import {
  HELD_PDF_SHA256,
  readPdfMetadata,
  shownText,
  stripPdfMetadata,
  withoutStreams,
} from './lib/pdf';
import { scanDemoText } from './lib/privacy';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/files');

/** 눈으로 검토를 마친 PDF: sha256 → 출력 파일 이름. 지금은 없다(전부 보류). */
const PUBLISH: Record<string, string> = {};

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** 구조 텍스트(스트림 제외)와, 압축을 푼 내용 스트림이 화면에 그리는 문자열을 검사한다. 걸린 종류만 반환. */
function leakKinds(buf: Buffer): string[] {
  const kinds = new Set<string>();
  const latin = buf.toString('latin1');
  for (const h of scanDemoText(withoutStreams(latin))) kinds.add(h.kind);
  for (const m of latin.matchAll(/(?<!end)stream\r?\n/g)) {
    const start = m.index + m[0].length;
    const end = latin.indexOf('endstream', start);
    if (end < 0) continue;
    let content: string;
    try {
      content = inflateSync(buf.subarray(start, end), { finishFlush: 2 }).toString('latin1');
    } catch {
      continue; // 압축 스트림이 아니다(이미지, 글꼴 등).
    }
    if (content.includes('BT')) for (const h of scanDemoText(shownText(content))) kinds.add(h.kind);
  }
  return [...kinds];
}

async function main() {
  const source = join(resolve(root, argValue('--source') ?? '../iduk.design'), 'images/other/pdf');
  await mkdir(outDir, { recursive: true });
  const written = new Set<string>();
  let failed = false;
  let held = 0;
  for (const name of (await readdir(source))
    .filter((n) => n.toLowerCase().endsWith('.pdf'))
    .sort()) {
    const buf = await readFile(join(source, name));
    const sha = createHash('sha256').update(buf).digest('hex');
    if (HELD_PDF_SHA256.has(sha)) {
      held++;
      continue;
    }
    const to = PUBLISH[sha];
    if (to === undefined) {
      console.error(
        `FAILED: unreviewed PDF (sha256 ${sha.slice(0, 12)}); review its text, then add it to PUBLISH or HOLD`,
      );
      failed = true;
      continue;
    }
    const before = readPdfMetadata(buf.toString('latin1'));
    const stripped = Buffer.from(stripPdfMetadata(buf.toString('latin1')), 'latin1');
    const after = readPdfMetadata(stripped.toString('latin1'));
    const leaks = leakKinds(stripped);
    console.log(
      `${to}: ${stripped.length} bytes; metadata before [${before.infoKeys.join(', ')}] xmp ${before.xmpWithContent} creator-strings ${before.creatorStrings}; ` +
        `after [${after.infoKeys.join(', ')}] xmp ${after.xmpWithContent} creator-strings ${after.creatorStrings}; leak-kinds [${leaks.join(', ')}]`,
    );
    if (
      after.infoKeys.length > 0 ||
      after.xmpWithContent > 0 ||
      after.creatorStrings > 0 ||
      leaks.length > 0
    ) {
      console.error(`FAILED ${to}: metadata or personal info remains`);
      failed = true;
      continue;
    }
    await writeFile(join(outDir, to), stripped);
    written.add(to);
  }
  // 허용한 결과물 말고는 public/files 에 두지 않는다(보류한 PDF의 복사본 포함).
  for (const name of await readdir(outDir)) {
    if (!written.has(name)) await rm(join(outDir, name), { recursive: true, force: true });
  }
  console.log(`held (not copied): ${held}`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
