import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

/** WebP 형식의 한 변 최대 길이. */
export const WEBP_MAX_DIMENSION = 16383;

export type ConvertOptions = { maxWidth?: number; quality?: number };
export type ConvertResult = { width: number; height: number; avgColor: string; bytes: number };

const INPUT_PIXEL_LIMIT = 200_000_000;

const hex = (n: number) => n.toString(16).padStart(2, '0');

/**
 * 이미지 한 장을 WebP 마스터로 변환한다.
 * 가로가 maxWidth(기본 2560)를 넘을 때만 줄이고(확대 없음), 화질은 기본 90이며,
 * 메타데이터는 모두 버린다(EXIF 방향은 픽셀에 먼저 반영). 세로가 16383을 넘으면 던진다.
 */
export async function convertImage(
  src: string,
  dest: string,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  const maxWidth = opts.maxWidth ?? 2560;
  const quality = opts.quality ?? 90;
  const make = () => sharp(src, { limitInputPixels: INPUT_PIXEL_LIMIT }).rotate();

  const meta = await make().metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const srcW = (swap ? meta.height : meta.width) ?? 0;
  const srcH = (swap ? meta.width : meta.height) ?? 0;
  const outH = srcW > maxWidth ? Math.round((srcH * maxWidth) / srcW) : srcH;
  if (outH > WEBP_MAX_DIMENSION) {
    throw new Error(
      `${srcW}x${srcH} would be ${outH}px tall, over the WebP limit of ${WEBP_MAX_DIMENSION}px: ${src}`,
    );
  }

  const { data, info } = await make()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

  if (info.height > WEBP_MAX_DIMENSION || info.width > WEBP_MAX_DIMENSION) {
    throw new Error(
      `${info.width}x${info.height} exceeds the WebP limit of ${WEBP_MAX_DIMENSION}px: ${src}`,
    );
  }

  // 평균색: 최종 이미지를 흰 배경 위에서 1x1로 줄인 값.
  const px = await sharp(data)
    .flatten({ background: '#ffffff' })
    .resize(1, 1, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
  const avgColor = `#${hex(px[0] ?? 0)}${hex(px[1] ?? 0)}${hex(px[2] ?? 0)}`;

  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return { width: info.width, height: info.height, avgColor, bytes: data.byteLength };
}
