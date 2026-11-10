import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { resolveImage } from './masters';
import { OG_HEIGHT, OG_WIDTH } from './ogSize';

const MAX_BYTES = 300 * 1024;

/**
 * 대표 이미지(WebP 마스터)에서 1200x630 JPEG을 만든다(빌드 시, 결정적).
 * 목표보다 세로로 긴 이미지는 위쪽을 자르고, 가로로 긴 이미지는 눈에 띄는 영역을 중심으로 자른다.
 * 메타데이터는 쓰지 않는다(sharp 기본값은 EXIF·ICC·XMP를 내보내지 않는다). 300KB를 넘으면 화질을 낮춘다.
 */
export async function renderOg(imageKey: string): Promise<Buffer> {
  const { entry } = resolveImage(imageKey);
  const input = await readFile(join(process.cwd(), entry.src));
  const tall = entry.height / entry.width > OG_HEIGHT / OG_WIDTH;
  for (const quality of [82, 72, 62, 52]) {
    const out = await sharp(input)
      .flatten({ background: '#ffffff' })
      .resize(OG_WIDTH, OG_HEIGHT, {
        fit: 'cover',
        position: tall ? 'top' : sharp.strategy.attention,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    if (out.length < MAX_BYTES) return out;
  }
  throw new Error(`OG image for ${imageKey} stays above ${MAX_BYTES} bytes`);
}
