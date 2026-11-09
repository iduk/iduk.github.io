import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { convertImage } from '../../scripts/lib/convert';

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'iduk-convert-'));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function make(name: string, width: number, height: number, withExif = false) {
  const file = join(dir, name);
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } },
  });
  if (withExif) img = img.withExif({ IFD0: { Copyright: 'someone' } });
  await img.png().toFile(file);
  return file;
}

describe('convertImage', () => {
  it('가로 2560 초과는 줄인다 (4000x1000 -> 2560x640)', async () => {
    const src = await make('wide.png', 4000, 1000);
    const out = join(dir, 'wide.webp');
    const r = await convertImage(src, out);
    expect(r.width).toBe(2560);
    expect(r.height).toBe(640);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(2560);
  });

  it('작은 이미지는 확대하지 않는다', async () => {
    const src = await make('small.png', 1000, 1000);
    const r = await convertImage(src, join(dir, 'small.webp'));
    expect(r.width).toBe(1000);
    expect(r.height).toBe(1000);
  });

  it('1600x9000 긴 캡처가 변환된다', async () => {
    const src = await make('long.png', 1600, 9000);
    const out = join(dir, 'long.webp');
    const r = await convertImage(src, out);
    expect(r.height).toBe(9000);
    expect((await sharp(out).metadata()).height).toBe(9000);
  });

  it('세로가 16383을 넘으면 던진다', async () => {
    const src = await make('tall.png', 200, 16384);
    await expect(convertImage(src, join(dir, 'tall.webp'))).rejects.toThrow(/16383/);
  });

  it('EXIF를 제거한다', async () => {
    const src = await make('exif.png', 300, 300, true);
    expect((await sharp(src).metadata()).exif).toBeDefined();
    const out = join(dir, 'exif.webp');
    await convertImage(src, out);
    const meta = await sharp(out).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
  });

  it('avgColor는 #rrggbb 형식이고 bytes는 파일 크기와 같다', async () => {
    const src = await make('color.png', 300, 300);
    const out = join(dir, 'color.webp');
    const r = await convertImage(src, out);
    expect(r.avgColor).toMatch(/^#[0-9a-f]{6}$/);
    expect(r.bytes).toBe((await readFile(out)).byteLength);
  });

  it('같은 입력은 같은 바이트를 만든다 (결정적)', async () => {
    const src = await make('det.png', 500, 300);
    const a = join(dir, 'det-a.webp');
    const b = join(dir, 'det-b.webp');
    await convertImage(src, a);
    await convertImage(src, b);
    expect((await readFile(a)).equals(await readFile(b))).toBe(true);
  });
});
