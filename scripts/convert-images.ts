/**
 * 공개 글(24개)이 쓰는 이미지(대표 + 본문)를 WebP 마스터로 변환하고 src/content/images.json을 만든다.
 * 사이트 번들에는 들어가지 않는 일회성 CLI. 원본(../iduk.design)은 읽기만 한다.
 *
 *   pnpm tsx scripts/convert-images.ts --only oyedu   # 한 글만 시험
 *   pnpm tsx scripts/convert-images.ts                # 전체
 *
 * 옵션: --source <dir> (기본 ../iduk.design), --report <file> (기본 $TMPDIR/iduk-convert-report.json)
 *
 * images.json 형식: Record<imageKey, { src, width, height, avgColor, bytes, original }>
 *   imageKey  `<글 슬러그>/<NN>-<ASCII 슬러그>`. src/assets/images 아래 경로에서 `.webp`를 뺀 값.
 *             NN은 글 안에서 대표 이미지, 본문 이미지 순서로 매긴 두 자리 번호(중복 제거 후).
 *             변환 대상은 사이트에서 실제로 쓰는 이미지(대표 + 본문)뿐이다(lib/posts.ts usedImagePaths).
 *   src       `/src/assets/images/<imageKey>.webp` (import.meta.glob 키와 같은 형태)
 *   original  원본 파일의 이름만(NFC). 경로는 넣지 않는다.
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { convertImage } from './lib/convert';
import { imageFileStem, isPublic, type Post, usedImagePaths } from './lib/posts';

type ImageEntry = {
  src: string;
  width: number;
  height: number;
  avgColor: string;
  bytes: number;
  original: string;
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'src/assets/images');
const jsonPath = join(root, 'src/content/images.json');
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** 디스크 이름이 NFD여도 NFC 경로로 찾는다. 원본 폴더 밖은 거부한다. */
async function resolveSource(originalDir: string, urlPath: string): Promise<string> {
  const rel = urlPath.replace(/^\/images\/original\//, '');
  if (rel === urlPath || rel.split('/').includes('..')) {
    throw new Error(`unexpected image path: ${urlPath}`);
  }
  let cur = originalDir;
  for (const part of rel.split('/')) {
    const names = await readdir(cur);
    const hit = names.find((n) => n.normalize('NFC') === part.normalize('NFC'));
    if (hit === undefined) throw new Error(`source not found: ${urlPath}`);
    cur = join(cur, hit);
  }
  return cur;
}

async function main() {
  const only = argValue('--only');
  const source = resolve(root, argValue('--source') ?? '../iduk.design');
  const reportPath = resolve(argValue('--report') ?? join(tmpdir(), 'iduk-convert-report.json'));
  if (reportPath.startsWith(`${root}/`)) throw new Error('report must be written outside the repo');

  const originalDir = join(source, 'images/original');
  const posts: Post[] = JSON.parse(await readFile(join(source, 'data/posts.json'), 'utf8'));
  const publicPosts = posts.filter(isPublic);
  const targets = only === undefined ? publicPosts : publicPosts.filter((p) => p.slug === only);
  if (targets.length === 0) throw new Error(`no public post matches --only ${only}`);

  const previous: Record<string, ImageEntry> =
    only !== undefined && existsSync(jsonPath) ? JSON.parse(await readFile(jsonPath, 'utf8')) : {};
  const manifest: Record<string, ImageEntry> = { ...previous };

  const rows: {
    key: string;
    originalBytes: number;
    webpBytes: number;
    originalWidth: number;
    originalHeight: number;
    width: number;
    height: number;
  }[] = [];
  const failures: { post: string; image: string; error: string }[] = [];
  let expected = 0;

  for (const post of targets) {
    if (!SLUG_RE.test(post.slug)) throw new Error(`unsafe post slug: ${post.slug}`);
    for (const k of Object.keys(manifest)) if (k.startsWith(`${post.slug}/`)) delete manifest[k];
    await rm(join(outRoot, post.slug), { recursive: true, force: true });

    const taken = new Set<string>();
    const paths = usedImagePaths(post);
    expected += paths.length;
    let n = 0;
    for (const urlPath of paths) {
      n += 1;
      const original = basename(urlPath);
      try {
        const file = await resolveSource(originalDir, urlPath);
        const name = imageFileStem(n, urlPath, taken);
        taken.add(name);
        const key = `${post.slug}/${name}`;
        const res = await convertImage(file, join(outRoot, `${key}.webp`));
        const meta = await sharp(file).metadata();
        manifest[key] = {
          src: `/src/assets/images/${key}.webp`,
          width: res.width,
          height: res.height,
          avgColor: res.avgColor,
          bytes: res.bytes,
          original: original.normalize('NFC'),
        };
        rows.push({
          key,
          originalBytes: (await stat(file)).size,
          webpBytes: res.bytes,
          originalWidth: meta.width ?? 0,
          originalHeight: meta.height ?? 0,
          width: res.width,
          height: res.height,
        });
      } catch (e) {
        failures.push({
          post: post.slug,
          image: original,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => (a < b ? -1 : 1)));
  await mkdir(dirname(jsonPath), { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(sorted, null, 2)}\n`);

  const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
  const report = {
    scope: only ?? 'all',
    expectedCount: expected,
    convertedCount: rows.length,
    failureCount: failures.length,
    failures,
    originalBytes: sum((r) => r.originalBytes),
    webpBytes: sum((r) => r.webpBytes),
    widerThan2560: rows.filter((r) => r.originalWidth > 2560).length,
    downscaled: rows.filter((r) => r.width < r.originalWidth).length,
    images: rows,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  const mb = (b: number) => `${(b / 1e6).toFixed(2)}MB`;
  console.log(
    `scope=${report.scope} expected=${expected} converted=${rows.length} failures=${failures.length}`,
  );
  console.log(
    `original=${mb(report.originalBytes)} webp=${mb(report.webpBytes)} wider2560=${report.widerThan2560}`,
  );
  console.log(`report: ${reportPath}`);
  for (const f of failures) console.error(`FAIL ${f.post}/${f.image}: ${f.error}`);
  if (failures.length > 0 || rows.length !== expected) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
