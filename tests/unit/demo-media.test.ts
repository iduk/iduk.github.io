import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { MAX_WIDTH, optimizeImage } from '../../scripts/optimize-demo-media';

const demos = join(import.meta.dirname, '../../public/html');

function images(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return images(p);
    return ['.jpg', '.png'].includes(extname(p).toLowerCase()) ? [p] : [];
  });
}

describe('데모 이미지 최적화', () => {
  it('모든 데모 jpg·png가 1MB 이하이고 가로 1920px 이하다', async () => {
    const list = images(demos);
    expect(list.length).toBeGreaterThan(50);
    for (const f of list) {
      expect(statSync(f).size, f).toBeLessThanOrEqual(1024 * 1024);
      const m = await sharp(readFileSync(f), { failOn: 'none' }).metadata();
      expect(m.width ?? 0, f).toBeLessThanOrEqual(MAX_WIDTH);
    }
  });

  it('큰 이미지는 줄이고, 다시 돌리면 건드리지 않는다', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'demo-media-'));
    const raw = Buffer.alloc(2600 * 1200 * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 7 + ((i / 3000) | 0)) & 255;
    const file = join(dir, 'big.png');
    writeFileSync(
      file,
      await sharp(raw, { raw: { width: 2600, height: 1200, channels: 3 } })
        .png({ compressionLevel: 0 })
        .toBuffer(),
    );
    const first = await optimizeImage(file);
    expect(first.after).toBeLessThan(first.before);
    expect((await sharp(file).metadata()).width).toBe(MAX_WIDTH);
    const again = await optimizeImage(file);
    expect(again.after).toBe(again.before);
  });
});
