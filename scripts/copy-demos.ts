/**
 * 정적 데모 4개를 ../iduk.design/html 에서 public/html 로 복사하고 정화·수리한다. 원본은 읽기만 한다.
 *
 *   pnpm tsx scripts/copy-demos.ts                  # 저장소 밖 치환 목록($TMPDIR/iduk-redact.json)이 있어야 한다
 *   pnpm tsx scripts/copy-demos.ts --no-redact      # 치환 목록 없이(이름·주소가 남는다. 점검용)
 *   pnpm tsx scripts/copy-demos.ts --check-network  # 외부 주소를 요청해 살아 있는지 확인(기본은 네트워크 없음)
 *
 * 옵션: --source <dir> (기본 ../iduk.design), --report <file> (기본 $TMPDIR/iduk-demo-report.json),
 *       --redact <file> (기본 $TMPDIR/iduk-redact.json)
 *
 * 결정적: 같은 입력이면 같은 결과. 순서:
 *  1. public/html 을 비우고 .DS_Store, .vscode, .git, *.map 을 빼고 복사한다.
 *  2. 텍스트 파일(html/css/js 등) 정화: 메일·전화·등록번호 → 예시 값(sanitizeDemoText), 치환 목록(실명·주소),
 *     지도 임베드·길찾기 링크 무력화, PHP 출력 태그 제거, http→https, 외부 이미지 → 자리표시.
 *     지금 쓰지 않는 글꼴 형식(EOT, SVG 글꼴)과 사라진 구글 글꼴 주소는 @font-face 목록에서 뺀다.
 *  3. 파일별 수리(REPAIRS).
 *  4. 정리: index.html 에서 닿지 않는 페이지, 남은 파일이 이름조차 언급하지 않는 파일을 지운다(planKeep).
 *  5. 깨진 내부 참조를 고친다(fixBrokenRefs). 못 고치는 것이 남으면 실패한다.
 *  6. 이미지: 사람·신분·주소가 보이는 것은 같은 크기의 자리표시로 바꾸고, 나머지 JPEG/PNG는 재인코딩 없이 메타데이터를 뺀다.
 *  7. 검사: 개인정보 패턴, 접속 정보(옛 서버 호스트, sftp 설정), 지도 흔적, 이미지 메타데이터. 걸리면 실패(파일과 종류만 출력).
 * 보고서에는 교체 전 값이 들어 있으므로 저장소 안에는 쓰지 않는다. 콘솔에는 값을 찍지 않는다.
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  applyRedactions,
  classifyExternal,
  cssRefs,
  DEMOS,
  filterFontSrc,
  findBrokenRefs,
  fixBrokenRefs,
  hasAccessString,
  hasMapTrace,
  htmlRefs,
  isDeadExternalFontUrl,
  isExcludedName,
  isExternalUrl,
  isLegacyFontUrl,
  isTextFile,
  neutralizeMapEmbeds,
  neutralizeMapLinks,
  OMITTED_IMAGES,
  PLACEHOLDER_SVG,
  parseRedactions,
  planKeep,
  REPAIRS,
  type Redaction,
  replaceExternalImages,
  stripPhpEchoTags,
  upgradeHttps,
} from './lib/demos';
import { metadataMarkers, stripImage, stripSvg } from './lib/imagemeta';
import { sanitizeDemoText, scanDemoText } from './lib/privacy';

/** 고치지 못해 남기는 참조. 정확한 `파일 -> 주소`와 이유. 비어 있어야 정상이다. */
const KNOWN_UNRESOLVED: { from: string; url: string; why: string }[] = [];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outRoot = join(root, 'public/html');

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function walk(dir: string): Promise<string[]> {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

async function removeEmptyDirs(dir: string): Promise<boolean> {
  let empty = true;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (await removeEmptyDirs(full)) await rm(full, { recursive: true });
      else empty = false;
    } else empty = false;
  }
  return empty;
}

/** UTF-8로 읽히면 문자열, 아니면 latin1(바이트 그대로 되돌릴 수 있음). */
function decode(buf: Buffer): { text: string; enc: 'utf8' | 'latin1' } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(buf), enc: 'utf8' };
  } catch {
    return { text: buf.toString('latin1'), enc: 'latin1' };
  }
}

/** 같은 가로세로 비율의 단색 자리표시. 긴 변은 1000px로 줄인다(레이아웃은 비율로 정해지고, 용량을 아낀다). */
async function omittedImage(path: string, origW: number, origH: number): Promise<Buffer> {
  const k = Math.min(1, 1000 / Math.max(origW, origH));
  const w = Math.max(1, Math.round(origW * k));
  const h = Math.max(1, Math.round(origH * k));
  const size = Math.max(12, Math.round(Math.min(w, h * 1.6) / 14));
  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${size}" fill="#8a8a8a">Image omitted</text></svg>`,
  );
  const base = sharp({
    create: { width: w, height: h, channels: 3, background: '#e5e5e5' },
  }).composite([{ input: label }]);
  return path.toLowerCase().endsWith('.png')
    ? base.png({ compressionLevel: 9 }).toBuffer()
    : base.jpeg({ quality: 60 }).toBuffer();
}

type ExternalEntry = {
  url: string;
  kinds: string[];
  files: string[];
  host: string;
  hints: string[];
  status?: string;
};

async function checkStatus(url: string): Promise<string> {
  const full = url.startsWith('//') ? `https:${url}` : url;
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(full, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status < 400 || method === 'GET') return String(res.status);
    } catch (e) {
      if (method === 'GET') return `error: ${(e as Error).message}`;
    }
  }
  return 'unknown';
}

async function main() {
  const source = resolve(root, argValue('--source') ?? '../iduk.design');
  const reportPath = resolve(argValue('--report') ?? join(tmpdir(), 'iduk-demo-report.json'));
  const redactPath = resolve(argValue('--redact') ?? join(tmpdir(), 'iduk-redact.json'));
  const noRedact = process.argv.includes('--no-redact');
  const checkNetwork = process.argv.includes('--check-network');
  for (const p of [reportPath, redactPath]) {
    if (p === root || p.startsWith(`${root}${sep}`)) {
      throw new Error(
        'report and redact files must live outside the repo (they contain real values)',
      );
    }
  }
  let redactions: Redaction[] = [];
  if (!noRedact) {
    try {
      redactions = parseRedactions(await readFile(redactPath, 'utf8'));
    } catch (e) {
      throw new Error(
        `redact file not usable (${(e as Error).message}). Build it outside the repo or pass --no-redact explicitly.`,
      );
    }
  }

  // 1. 복사
  await rm(outRoot, { recursive: true, force: true });
  await mkdir(outRoot, { recursive: true });
  for (const demo of DEMOS) {
    const from = join(source, 'html', demo);
    await stat(from);
    await cp(from, join(outRoot, demo), {
      recursive: true,
      filter: (src) => !isExcludedName(src.split(sep).pop() ?? ''),
    });
  }
  const rel = (full: string) => relative(outRoot, full).split(sep).join('/');
  const copied = (await walk(outRoot)).map(rel);
  const copiedBytes = (await Promise.all(copied.map((f) => stat(join(outRoot, f))))).reduce(
    (n, s) => n + s.size,
    0,
  );

  // 2. 텍스트 정화
  const texts = new Map<string, string>();
  const encs = new Map<string, 'utf8' | 'latin1'>();
  const original = new Map<string, string>();
  for (const f of copied) {
    if (!isTextFile(f)) continue;
    const { text, enc } = decode(await readFile(join(outRoot, f)));
    texts.set(f, text);
    original.set(f, text);
    encs.set(f, enc);
  }
  const perDemo: Record<string, Record<string, number>> = {};
  const bump = (demo: string, key: string, n = 1) => {
    if (n === 0) return;
    const d = perDemo[demo] ?? {};
    perDemo[demo] = d;
    d[key] = (d[key] ?? 0) + n;
  };
  const redactCounts = redactions.map(() => 0);
  const replacements: { file: string; emails: string[]; phones: string[]; regs: string[] }[] = [];

  for (const [f, t0] of [...texts]) {
    const demo = f.split('/')[0] as string;
    const isHtml = /\.html?$/i.test(f);
    const isCss = /\.(?:css|scss)$/i.test(f);
    let t = t0;
    const before = scanDemoText(t);
    const s = sanitizeDemoText(t);
    t = s.text;
    bump(demo, 'emails', s.emails);
    bump(demo, 'phones', s.phones);
    bump(demo, 'regs', s.regs);
    if (s.replaced > 0) {
      replacements.push({
        file: f,
        emails: before.filter((h) => h.kind === 'email').map((h) => h.match),
        phones: before.filter((h) => h.kind === 'phone').map((h) => h.match),
        regs: before.filter((h) => h.kind === 'reg').map((h) => h.match),
      });
    }
    if (redactions.length > 0) {
      const r = applyRedactions(t, redactions);
      t = r.text;
      r.counts.forEach((c, i) => {
        redactCounts[i] = (redactCounts[i] ?? 0) + c;
        bump(demo, 'redactions', c);
      });
    }
    if (isHtml) {
      const maps = neutralizeMapEmbeds(t);
      t = maps.text;
      bump(demo, 'mapEmbeds', maps.replaced);
      const links = neutralizeMapLinks(t);
      t = links.text;
      bump(demo, 'mapLinks', links.replaced);
      const php = stripPhpEchoTags(t);
      t = php.text;
      bump(demo, 'phpTags', php.replaced);
    }
    if (isHtml || /\.js$/i.test(f)) {
      const https = upgradeHttps(t);
      t = https.text;
      bump(demo, 'httpsUpgrades', https.replaced);
    }
    if (isHtml || isCss) {
      const imgs = replaceExternalImages(t, isHtml);
      t = imgs.text;
      bump(demo, 'externalImages', imgs.replaced);
    }
    if (isCss) {
      const fonts = filterFontSrc(t, (u) => isLegacyFontUrl(u) || isDeadExternalFontUrl(u));
      t = fonts.text;
      bump(demo, 'fontEntriesDropped', fonts.removed);
    }
    texts.set(f, t);
  }

  // 3. 파일별 수리
  const repairLog: string[] = [];
  for (const r of REPAIRS) {
    const t = texts.get(r.file);
    if (t === undefined) throw new Error(`repair target missing: ${r.file}`);
    const next = r.apply(t);
    if (next === t) throw new Error(`repair did not apply (source changed?): ${r.file}`);
    texts.set(r.file, next);
    repairLog.push(r.file);
  }

  // 4. 정리
  const plan = planKeep(DEMOS, copied, (f) => texts.get(f));
  for (const f of [...plan.droppedPages, ...plan.droppedAssets]) {
    await rm(join(outRoot, f), { force: true });
    texts.delete(f);
  }
  await removeEmptyDirs(outRoot);
  const keptFiles = new Set(plan.keep);
  keptFiles.add('_placeholder.svg');

  // 5. 깨진 내부 참조
  const fix = fixBrokenRefs(texts, keptFiles);
  const known = new Set(KNOWN_UNRESOLVED.map((k) => `${k.from}\0${k.url}`));
  const remaining = findBrokenRefs(keptFiles, (f) => texts.get(f));
  const unresolved = remaining.filter((b) => !known.has(`${b.from}\0${b.url}`));

  // 파일 쓰기
  for (const [f, t] of texts) {
    if (t !== original.get(f)) await writeFile(join(outRoot, f), Buffer.from(t, encs.get(f)));
  }
  await writeFile(join(outRoot, '_placeholder.svg'), PLACEHOLDER_SVG);

  // 6. 이미지
  const omittedDone: string[] = [];
  for (const f of OMITTED_IMAGES) {
    if (!keptFiles.has(f)) continue; // 정리에서 이미 빠진 파일
    const full = join(outRoot, f);
    const meta = await sharp(await readFile(join(source, 'html', f))).metadata();
    await writeFile(full, await omittedImage(f, meta.width ?? 800, meta.height ?? 600));
    omittedDone.push(f);
  }
  let stripped = 0;
  for (const f of keptFiles) {
    if (f === '_placeholder.svg' || omittedDone.includes(f)) continue;
    const full = join(outRoot, f);
    if (/\.svg$/i.test(f)) {
      const t = texts.get(f) ?? decode(await readFile(full)).text;
      const next = stripSvg(t);
      if (next !== t) await writeFile(full, next);
      continue;
    }
    const buf = await readFile(full).catch(() => undefined);
    if (!buf) continue;
    const out = stripImage(f, buf);
    if (out && !out.equals(buf)) {
      await writeFile(full, out);
      stripped++;
    }
  }

  // 7. 검사
  const problems: string[] = [];
  for (const f of [...keptFiles].filter((x) => x !== '_placeholder.svg').sort()) {
    const full = join(outRoot, f);
    const buf = await readFile(full);
    const latin = buf.toString('latin1');
    if (hasAccessString(latin) || hasAccessString(f)) problems.push(`${f}: access-string`);
    if (isTextFile(f)) {
      const t = decode(buf).text;
      for (const kind of new Set(scanDemoText(t).map((h) => h.kind)))
        problems.push(`${f}: ${kind}`);
      if (hasMapTrace(t)) problems.push(`${f}: map-trace`);
    }
    for (const m of metadataMarkers(f, buf)) problems.push(`${f}: image-metadata ${m}`);
  }
  for (const u of unresolved) problems.push(`${u.from}: unresolved ${u.kind} reference`);

  // 외부 자원 목록
  const external = new Map<string, { kinds: Set<string>; files: Set<string> }>();
  let inlineScripts = 0;
  for (const [f, t] of texts) {
    if (!keptFiles.has(f)) continue;
    const lower = f.toLowerCase();
    let refs = [] as ReturnType<typeof htmlRefs>;
    if (lower.endsWith('.html')) {
      refs = [...htmlRefs(t), ...cssRefs(t)];
      inlineScripts += (t.match(/<script(?![^>]*\bsrc=)[^>]*>/gi) ?? []).length;
    } else if (lower.endsWith('.css')) refs = cssRefs(t);
    for (const ref of refs) {
      if (ref.kind === 'link' || !isExternalUrl(ref.url)) continue;
      const e = external.get(ref.url) ?? { kinds: new Set<string>(), files: new Set<string>() };
      e.kinds.add(ref.kind);
      e.files.add(f);
      external.set(ref.url, e);
    }
  }
  const externals: ExternalEntry[] = [...external.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([url, e]) => {
      const note = classifyExternal(url);
      return {
        url,
        kinds: [...e.kinds].sort(),
        files: [...e.files].sort(),
        host: note.host,
        hints: note.hints,
      };
    });
  if (checkNetwork) for (const e of externals) e.status = await checkStatus(e.url);

  const keptBytes = (
    await Promise.all(
      [...keptFiles].filter((f) => f !== '_placeholder.svg').map((f) => stat(join(outRoot, f))),
    )
  ).reduce((n, s) => n + s.size, 0);

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        note: 'Contains original values. Keep outside the repo. Never commit.',
        perDemo,
        replacements,
        externalUrls: externals,
        omittedImages: omittedDone,
        prune: { pages: plan.droppedPages, assets: plan.droppedAssets },
        unresolved,
      },
      null,
      2,
    )}\n`,
  );

  // 콘솔 요약(값 없음)
  console.log(
    `copied ${copied.length} files (${(copiedBytes / 1e6).toFixed(1)} MB) -> public/html`,
  );
  for (const d of DEMOS) console.log(`  ${d}: ${JSON.stringify(perDemo[d] ?? {})}`);
  console.log(
    `redaction entries: ${redactions.length} (unused: ${redactCounts.filter((c) => c === 0).length}), total replacements ${redactCounts.reduce((a, b) => a + b, 0)}`,
  );
  console.log(
    `repairs applied: ${repairLog.length}; fixBrokenRefs: ${JSON.stringify({ ...fix, unresolved: fix.unresolved.length })}`,
  );
  const sz = async (list: string[]) =>
    (await Promise.all(list.map((f) => stat(join(source, 'html', f)).then((s) => s.size)))).reduce(
      (a, b) => a + b,
      0,
    );
  console.log(
    `pruned: ${plan.droppedPages.length} pages, ${plan.droppedAssets.length} assets (${((await sz(plan.droppedAssets)) / 1e6).toFixed(1)} MB)`,
  );
  console.log(`kept: ${keptFiles.size - 1} files, ${(keptBytes / 1e6).toFixed(1)} MB`);
  console.log(`images omitted (${omittedDone.length}): ${omittedDone.join(', ')}`);
  console.log(`images/svg metadata stripped: ${stripped} files`);
  const hosts = new Map<string, number>();
  for (const e of externals) hosts.set(e.host, (hosts.get(e.host) ?? 0) + 1);
  console.log(
    `external resources: ${externals.length} URL(s), ${hosts.size} host(s), ${externals.filter((e) => e.hints.length > 0).length} flagged`,
  );
  for (const [h, n] of [...hosts.entries()].sort()) console.log(`  ${h || '(none)'}: ${n}`);
  if (checkNetwork)
    console.log(
      `network check: ${externals.filter((e) => !/^[23]\d\d$/.test(e.status ?? '')).length} not reachable`,
    );
  console.log(`inline <script> blocks in kept demo HTML: ${inlineScripts} (info only)`);
  console.log(`report: ${reportPath}`);

  if (problems.length > 0) {
    console.error('FAILED. Remaining issues (file: kind):');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
