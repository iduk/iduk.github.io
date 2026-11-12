/**
 * public/html 데모의 jpg·png를 제자리에서 다시 압축한다(파일명·형식 유지: 데모 HTML이 이름으로 참조한다).
 *
 *   pnpm tsx scripts/optimize-demo-media.ts
 *
 * - 가로 1920px 초과는 1920px로 줄이고, EXIF·방향 정보는 적용 후 제거한다. jpg는 mozjpeg q80, png는 팔레트 q90.
 * - 결과가 원본보다 10% 넘게 작을 때만 쓴다. 이미 작은 파일(100KB 이하이고 1920px 이하)은 건드리지 않고, 10% 넘게 줄 때만 쓴다(다시 돌려도 세대 손실이 쌓이지 않는다).
 * - 사이트 본문 이미지는 이 스크립트와 무관하다(빌드 때 Astro가 avif·webp로 만든다).
 * copy-demos.ts로 데모를 다시 복사했다면 그 뒤에 이 스크립트를 다시 실행한다(tests/unit/demo-media.test.ts가 상한을 지킨다).
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const MAX_WIDTH = 1920;
export const SKIP_BYTES = 100 * 1024;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

export async function optimizeImage(file: string): Promise<{ before: number; after: number }> {
  const ext = extname(file).toLowerCase();
  const buf = await readFile(file);
  if (ext !== '.jpg' && ext !== '.png') return { before: buf.length, after: buf.length };
  const meta = await sharp(buf, { failOn: 'none' }).metadata();
  if (buf.length <= SKIP_BYTES && (meta.width ?? 0) <= MAX_WIDTH) {
    return { before: buf.length, after: buf.length };
  }
  const pipe = sharp(buf, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true });
  const out =
    ext === '.jpg'
      ? await pipe.jpeg({ quality: 80, mozjpeg: true }).toBuffer()
      : await pipe.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toBuffer();
  if (out.length > buf.length * 0.9) return { before: buf.length, after: buf.length };
  await writeFile(file, out);
  return { before: buf.length, after: out.length };
}

async function main() {
  const root = resolve(fileURLToPath(import.meta.url), '../../public/html');
  await stat(root);
  let before = 0;
  let after = 0;
  let n = 0;
  for await (const f of walk(root)) {
    const r = await optimizeImage(f);
    before += r.before;
    after += r.after;
    if (r.after < r.before) n++;
  }
  console.log(`optimize-demo-media: ${n} files rewritten, ${before} -> ${after} bytes`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
