/**
 * 이미지의 위치 정보(GPS) 검출. 새 의존성 없이 sharp 메타데이터(EXIF/XMP 원본 바이트)를 직접 읽는다.
 * sharp가 못 읽는 파일은 바이트 검색으로 넘어간다.
 */
import sharp from 'sharp';

export const IMAGE_EXT = /\.(?:jpe?g|png|webp|avif|heic|heif|tiff?|gif)$/i;

/** EXIF(TIFF) 블록의 IFD0에 GPS IFD 포인터(0x8825)가 있고 항목이 하나 이상인가. */
export function exifHasGps(raw: Buffer): boolean {
  const buf = raw.subarray(0, 6).toString('latin1') === 'Exif\0\0' ? raw.subarray(6) : raw;
  if (buf.length < 8) return false;
  const bom = buf.toString('latin1', 0, 2);
  const le = bom === 'II';
  if (!le && bom !== 'MM') return false;
  const u16 = (o: number) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o: number) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  try {
    const ifd0 = u32(4);
    if (ifd0 + 2 > buf.length) return false;
    const n = u16(ifd0);
    for (let i = 0; i < n; i++) {
      const e = ifd0 + 2 + i * 12;
      if (e + 12 > buf.length) return false;
      if (u16(e) === 0x8825) {
        const gps = u32(e + 8);
        return gps + 2 <= buf.length && u16(gps) > 0;
      }
    }
  } catch {
    return false;
  }
  return false;
}

const GPS_BYTES = /GPS(?:Latitude|Longitude|Altitude|Position)|exif:GPS/;

/** 이미지 한 장에 GPS가 들어 있는가. 읽지 못하면 'unreadable'(바이트 검색 결과를 함께 본다). */
export async function imageHasGps(buf: Buffer): Promise<boolean | 'unreadable'> {
  try {
    const meta = await sharp(buf, { failOn: 'none' }).metadata();
    if (meta.exif && exifHasGps(meta.exif)) return true;
    if (meta.xmp && GPS_BYTES.test(meta.xmp.toString('latin1'))) return true;
    return false;
  } catch {
    return GPS_BYTES.test(buf.toString('latin1')) ? true : 'unreadable';
  }
}
