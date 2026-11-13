/**
 * 브랜드 캐릭터(16x16 픽셀 아트) 자산을 만든다: `pnpm exec tsx scripts/make-brand-assets.ts`.
 * 원본(scripts/brand-source/pixelduk.source.svg)은 픽셀 하나마다 <rect>를 옮긴 24KB짜리라서,
 * 같은 색으로 이어진 가로 줄을 하나의 path로 합쳐 줄이고 눈 깜빡임 애니메이션은 그대로 둔다.
 * 겹침 순서(아래 층, 깜빡이는 층, 위 층)를 지킨다. 결과는 모두 커밋한다.
 *  - public/brand/pixelduk.svg  : 깜빡이는 로고(헤더 등). 모션 줄임 설정에서는 멈춘다.
 *  - public/favicon.svg         : 정지 상태
 *  - public/favicon.ico         : 16, 32, 48px
 *  - public/apple-touch-icon.png: 180px
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'scripts/brand-source/pixelduk.source.svg'), 'utf8');

type Layer = Map<string, string>; // "x,y" -> color

const norm = (c: string) => {
  const h = c.toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
};
const short = (c: string) => (/^#(.)\1(.)\2(.)\3$/.test(c) ? `#${c[1]}${c[3]}${c[5]}` : c);

function readLayer(text: string): Layer {
  const layer: Layer = new Map();
  for (const m of text.matchAll(/<rect\b[^>]*?>/g)) {
    const tag = m[0];
    const pos = /translate\((\d+)[ ,](\d+)\)/.exec(tag);
    if (!pos) throw new Error(`rect without translate: ${tag}`);
    const fill = /fill="(#[0-9a-fA-F]+)"/.exec(tag);
    layer.set(`${pos[1]},${pos[2]}`, norm(fill?.[1] ?? '#000'));
  }
  return layer;
}

// 원본 구조: [아래 층 g들] <g id="blinkMotion">…</g> [위 층 g들]
const blinkStart = src.indexOf('<g id="blinkMotion"');
if (blinkStart < 0) throw new Error('blinkMotion group not found');
const firstClose = src.indexOf('</g>', blinkStart);
const blinkEnd = src.indexOf('</g>', firstClose + 4) + 4; // 안쪽 g, 바깥 g 순서로 닫힌다
const bodyStart = src.indexOf('</style>') + '</style>'.length;
const below = readLayer(src.slice(bodyStart, blinkStart));
const blink = readLayer(src.slice(blinkStart, blinkEnd));
const above = readLayer(src.slice(blinkEnd));

function paths(layer: Layer): string {
  const byColor = new Map<string, string[]>();
  const rows = new Map<number, [number, string][]>();
  for (const [k, color] of layer) {
    const [x, y] = k.split(',').map(Number);
    rows.set(y, [...(rows.get(y) ?? []), [x, color]]);
  }
  for (const y of [...rows.keys()].sort((a, b) => a - b)) {
    const cells = rows.get(y)?.sort((a, b) => a[0] - b[0]) ?? [];
    for (let i = 0; i < cells.length; ) {
      let j = i;
      while (
        j + 1 < cells.length &&
        cells[j + 1][0] === cells[j][0] + 1 &&
        cells[j + 1][1] === cells[i][1]
      )
        j++;
      const w = j - i + 1;
      const d = `M${cells[i][0]} ${y}h${w}v1h-${w}z`;
      byColor.set(cells[i][1], [...(byColor.get(cells[i][1]) ?? []), d]);
      i = j + 1;
    }
  }
  return [...byColor]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([c, ds]) => `<path fill="${short(c)}" d="${ds.join('')}"/>`)
    .join('');
}

const head =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><title>iduk</title>';
const style =
  '<style>.b{animation:k 2s linear infinite}@keyframes k{0%,45%,55%,100%{transform:translateY(0)}50%{transform:translateY(1px)}}@media(prefers-reduced-motion:reduce){.b{animation:none}}</style>';
const animated = `${head}${style}${paths(below)}<g class="b">${paths(blink)}</g>${paths(above)}</svg>\n`;
const still = `${head}${paths(below)}${paths(blink)}${paths(above)}</svg>\n`;

mkdirSync(join(root, 'public/brand'), { recursive: true });
writeFileSync(join(root, 'public/brand/pixelduk.svg'), animated);
writeFileSync(join(root, 'public/favicon.svg'), still);

// 정지 상태의 픽셀을 그대로 키운다(nearest). 16의 배수 크기만 쓴다.
async function png(size: number, pad = 0, background?: string): Promise<Buffer> {
  const inner = size - pad * 2;
  const big = await sharp(Buffer.from(still), { density: 72 * 24 })
    .png()
    .toBuffer();
  const scaled = await sharp(big).resize(inner, inner, { kernel: 'nearest' }).png().toBuffer();
  return sharp(scaled)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function ico(images: { size: number; data: Buffer }[]): Buffer {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dirs = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...dirs, ...images.map((i) => i.data)]);
}

writeFileSync(
  join(root, 'public/favicon.ico'),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })))),
);
writeFileSync(join(root, 'public/apple-touch-icon.png'), await png(180, 2, '#fafaf8'));

console.log(
  `pixelduk.svg ${animated.length}B (source ${src.length}B), favicon.svg ${still.length}B; pixels ${below.size}+${blink.size}+${above.size}`,
);
