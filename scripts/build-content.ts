/**
 * ../iduk.design/data/posts.json 의 공개 글 24개를 src/content/projects/*.json 으로 바꾼다.
 * 일회성 CLI. 원본은 읽기만 하고, 같은 입력이면 항상 같은 출력을 만든다.
 *
 *   pnpm tsx scripts/build-content.ts [--source <dir>]
 *
 * 쓰는 파일: src/content/projects/<slug>.json, src/content/tags.json, docs/manual-todo.md
 * 번역·alt·태그·대표 작업은 scripts/content-data.ts 의 초안이다(모두 draft-translation).
 * 개인정보 패턴(메일·전화·/Users/ 경로·비밀 값)이 결과에 걸리면 아무것도 쓰지 않고 멈춘다.
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectSchema, type Project, tagSchema } from '../src/lib/schema';
import { meta, tags } from './content-data';
import {
  type ContentToken,
  classifyImage,
  hasLegacyUrl,
  parseContent,
  parsePeriod,
  type Subject,
  sanitizeBody,
} from './lib/blocks';
import { coverImagePath, imageKeyMap, isPublic, type Post } from './lib/posts';
import { scanText } from './lib/privacy';

type ImageEntry = { width: number; height: number };
type Block = Project['blocks'][number];
type PostWithArchive = Post & { archive2019?: { contentHtml: string } };

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectsDir = join(root, 'src/content/projects');
const DEMOS: Record<string, string> = {
  'engineering-responsive-web': 'atom',
  'telecare-service-website': 'hidea',
};
const EXPECTED_COUNT = 24;

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function fail(msg: string): never {
  throw new Error(msg);
}

/** 글자 비교용: 태그·기호·공백·대소문자를 지우고 글자와 숫자만 남긴다. */
function norm(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot);/g, ' ')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function hrefsOf(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1] as string);
}

/** sanitizeBody가 http(s) 주소를 URL 직렬화 형태(`http://a.com` → `http://a.com/`)로 바꾸므로 비교 전에 맞춘다. */
function normalizeHref(href: string): string {
  try {
    return /^https?:\/\//i.test(href) ? new URL(href).href : href;
  } catch {
    return href;
  }
}

function periodStartKey(start: string): number {
  const [y, m] = start.split('-');
  return Number(y) * 100 + Number(m ?? 0);
}

type Report = {
  folded: string[];
  droppedElements: Set<string>;
  sourceAltsReplaced: number;
  legacyExtras: { slug: string; lines: string[] }[];
};

function convertPost(
  post: PostWithArchive,
  images: Record<string, ImageEntry>,
  source: string,
  report: Report,
) {
  const m = meta[post.slug] ?? fail(`no content-data entry for ${post.slug}`);
  const slug = m.newSlug ?? post.slug;
  const keyOf = imageKeyMap(post);
  const lookup = (src: string): string => {
    const key = keyOf.get(src.normalize('NFC'));
    if (key === undefined) fail(`${post.slug}: image not referenced by post: ${src}`);
    if (images[key] === undefined) fail(`${post.slug}: image key missing in images.json: ${key}`);
    return key;
  };
  const suffixOf = (key: string) => key.slice(key.indexOf('/') + 1).replace(/^\d+-/, '');

  const coverSrc = coverImagePath(post) ?? fail(`${post.slug}: no featured image`);
  const coverKey = lookup(coverSrc);

  const { tokens, dropped } = parseContent(post.contentHtml);
  for (const d of dropped) report.droppedElements.add(d);
  const subjects = tokens.filter(
    (t): t is Extract<ContentToken, { kind: 'subject' }> => t.kind === 'subject',
  );
  if (subjects.length !== 1)
    fail(`${post.slug}: expected exactly one dl.subject, got ${subjects.length}`);
  const subject: Subject = (subjects[0] as { subject: Subject }).subject;

  // 기간
  const period = subject.period !== undefined ? parsePeriod(subject.period) : undefined;
  if (period === undefined) fail(`${post.slug}: cannot parse period from "${subject.period}"`);
  const year = Number(period.start.slice(0, 4));

  // 본문 텍스트(정화)
  const text = m.text ? { ko: sanitizeBody(m.text.ko), en: sanitizeBody(m.text.en) } : undefined;
  if (text) {
    for (const lang of ['ko', 'en'] as const) {
      if (text[lang] !== sanitizeBody(text[lang]))
        fail(`${post.slug}: text.${lang} is not stable under sanitizeBody`);
      if (hrefsOf(text[lang]).length !== hrefsOf(m.text?.[lang] ?? '').length) {
        fail(`${post.slug}: text.${lang} lost a link while sanitizing`);
      }
    }
  }

  // 원문 줄·이름·링크가 번역 필드에 남아 있는지(손으로 쓴 초안이 원문을 빠뜨리지 않게)
  const hay = norm(
    [m.title, m.role, m.summary, ...(m.text ? [m.text] : [])]
      .flatMap((x) => [x.ko, x.en])
      .join(' '),
  );
  const mustCover = [...(subject.name !== undefined ? [subject.name] : []), ...subject.lines];
  for (const line of mustCover) {
    if (!hay.includes(norm(line)))
      fail(`${post.slug}: source text not covered by content-data: "${line}"`);
  }

  // 블록
  const demoSlug = DEMOS[post.slug];
  const blocks: Block[] = [];
  const usedAlts = new Set<string>();
  const sourceHrefs = new Set<string>();
  for (const t of tokens) {
    if (t.kind === 'image') {
      const key = lookup(t.src);
      const suffix = suffixOf(key);
      const alt = m.alts[suffix] ?? fail(`${post.slug}: no alt draft for ${suffix}`);
      usedAlts.add(suffix);
      if (t.alt !== '') report.sourceAltsReplaced += 1;
      const img = images[key] as ImageEntry;
      blocks.push(
        classifyImage(img.width, img.height) === 'longshot'
          ? { type: 'longshot', image: key, alt }
          : { type: 'image', image: key, alt },
      );
    } else if (t.kind === 'caption') {
      report.folded.push(`${slug}: "${t.text}"`);
    } else if (t.kind === 'subject') {
      if (text) blocks.push({ type: 'text', body: text });
    } else if (t.kind === 'link') {
      const demo = post.demoLinks?.find((d) => d.url === t.href);
      if (demo) {
        if (demo.slug !== demoSlug) fail(`${post.slug}: unexpected demo ${demo.slug}`);
        if (!existsSync(join(source, 'html', demo.slug, 'index.html'))) {
          fail(`${post.slug}: demo target missing in html/${demo.slug}`);
        }
        blocks.push({ type: 'demo', demo: demo.slug });
      } else {
        sourceHrefs.add(t.href);
        if (!text || !hrefsOf(text.ko).map(normalizeHref).includes(normalizeHref(t.href))) {
          fail(`${post.slug}: link not carried into text block: ${t.href}`);
        }
      }
    }
  }
  if (text && !blocks.some((b) => b.type === 'text'))
    fail(`${post.slug}: text defined but no subject`);
  if (demoSlug && !blocks.some((b) => b.type === 'demo')) fail(`${post.slug}: expected demo link`);
  for (const k of Object.keys(m.alts))
    if (!usedAlts.has(k)) fail(`${post.slug}: unused alt draft ${k}`);

  // 쌍: 연속한 이미지 두 장을 pair로 합친다
  for (const [a, b] of m.pairs ?? []) {
    const i = blocks.findIndex((x) => x.type === 'image' && suffixOf(x.image) === a);
    const x = blocks[i];
    const y = blocks[i + 1];
    if (i < 0 || x?.type !== 'image' || y?.type !== 'image' || suffixOf(y.image) !== b) {
      fail(`${post.slug}: pair ${a},${b} is not two consecutive plain images`);
    }
    blocks.splice(i, 2, {
      type: 'pair',
      images: [
        { image: x.image, alt: x.alt },
        { image: y.image, alt: y.alt },
      ],
    });
  }

  // 2019년 본문에만 있는 줄(병합 후보)
  if (post.archive2019) {
    const old = parseContent(post.archive2019.contentHtml);
    const oldSubject = old.tokens.find((t) => t.kind === 'subject');
    if (oldSubject?.kind === 'subject') {
      const current = norm(
        [subject.name ?? '', ...subject.lines, ...subject.links.map((l) => l.label)].join(' '),
      );
      const extra = [
        ...(oldSubject.subject.name ? [oldSubject.subject.name] : []),
        ...oldSubject.subject.lines,
        ...oldSubject.subject.links.map((l) => l.label),
      ].filter((line) => !current.includes(norm(line)));
      const unique = [...new Set(extra)];
      if (unique.length > 0) report.legacyExtras.push({ slug, lines: unique });
    }
  }

  const project = {
    slug,
    year,
    period,
    order: 0, // 정렬 뒤에 채운다
    title: m.title,
    role: m.role,
    summary: m.summary,
    tags: m.tags,
    featured: m.featured,
    cover: { image: coverKey, alt: m.coverAlt },
    blocks,
    ...(demoSlug ? { demo: demoSlug } : {}),
    legacy: {
      id: post.id,
      path: post.legacyPath,
      ...(slug !== post.slug ? { slug: post.slug } : {}),
    },
    status: 'draft-translation' as const,
  };
  return { project, sortKey: periodStartKey(period.start), published: post.publishedAt };
}

function collectStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === 'object') for (const x of Object.values(v)) collectStrings(x, out);
  return out;
}

function manualTodo(args: { report: Report; projects: Project[] }): string {
  const { report, projects } = args;
  const lines: string[] = [];
  lines.push('# 수동 확인 목록', '');
  lines.push(
    '`pnpm tsx scripts/build-content.ts` 가 만든 파일이다. 직접 고치지 말고 `scripts/content-data.ts` 를 고친 뒤 다시 만든다.',
    '',
  );
  lines.push('## 1. 2019년 버전 본문 병합 후보', '');
  lines.push(
    '원본 데이터의 `archive2019`(2019-03 내보내기 본문)에만 있고 현재 본문에는 없는 줄이다. 자동으로 합치지 않았다. 쓸 줄을 고르면 `scripts/content-data.ts` 의 `text`에 옮긴다.',
    '',
  );
  for (const c of report.legacyExtras) {
    lines.push(`- \`${c.slug}\``);
    for (const l of c.lines) lines.push(`  - ${l}`);
  }
  lines.push('', '## 2. 영문 번역·alt 초안 검토', '');
  lines.push(
    `- 모든 글(${projects.length}개)과 태그에 \`status: draft-translation\` 이 붙어 있다. 영문 제목·역할·설명·본문·태그 이름·alt(한글·영문)를 검토하고 확정한 글에서 표시를 지운다. 표시가 남아 있으면 공개 전 검사(Task 11)가 실패한다.`,
    '- alt는 파일명과 맥락에서 쓴 초안이고, 일부(8장)만 실제 화면을 보고 썼다. 이미지 안에 보이는 이름·번호는 자동으로 찾을 수 없으므로 표지 24장과 본문 이미지를 한 번 훑어본다(개인정보 육안 확인). 예: expressway 화면에 사용자 이름 표시 칸이 있다(가상 이름으로 보임).',
    '- 영문 고유명사 표기(예: 7daycomz(이레컴즈), LivOn Silver Care(리본실버케어), Jeju Air)는 원문 표기에서 추정한 것이다.',
    '',
  );
  lines.push('## 3. 원문에 있던 것 중 확인이 필요한 것', '');
  lines.push(
    '- 외부 링크는 원문 그대로 본문 `text` 블록에 남겼다. 오래된 주소는 사라졌거나 다른 주인이 쓸 수 있으니 공개 전에 열어 보고 살아 있는 것만 둔다.',
  );
  const links: string[] = [];
  for (const p of projects) {
    for (const b of p.blocks) {
      if (b.type !== 'text') continue;
      for (const h of hrefsOf(b.body.ko)) links.push(`  - \`${p.slug}\`: ${h}`);
    }
  }
  lines.push(...links);
  lines.push(
    '- `online-ad-company-responsive-web`: 본문 기간이 2017.9로 적혀 있으나 글 작성일은 2016-04이다. 원문(2019년 버전 포함)이 모두 2017.9라 그대로 두었다.',
    '- `exhibition-booth-design`: 이미지 이름의 `w275`, `w375` 뜻을 알 수 없어 alt에 그대로 적었다.',
    '- `jejuair-mobile` 의 이미지 키는 옛 슬러그 그대로 `1812/...` 이다(`src/assets/images/1812/`). 글 슬러그와 달라도 키로만 참조하므로 동작에는 문제 없다.',
    '- 본문에 이미지가 없고 표지만 있는 글: ' +
      projects
        .filter(
          (p) =>
            !p.blocks.some((b) => b.type === 'image' || b.type === 'pair' || b.type === 'longshot'),
        )
        .map((p) => `\`${p.slug}\``)
        .join(', '),
    '',
  );
  lines.push('## 4. 레이아웃 제안(자동 판단 아님)', '');
  lines.push(
    '- 나란히 놓는 `pair` 블록은 원문 순서에서 같은 크기의 연속 이미지로 골랐다: expressway(라이트·다크), healthcare-icon-set(모션·도어 센서), exhibition-brochure(내지 1·2, 3·4), chinese-community(PC 화면 2장).',
    '- 원문의 이미지 설명 글("Light Ver.", "Dark Ver.", 센서 이름)은 해당 이미지의 alt에 합쳤고 별도 글 블록은 만들지 않았다.',
    '',
  );
  lines.push('## 5. 변환하지 않는 이미지', '');
  lines.push(
    '원본 글에 첨부만 되어 있고 본문에는 나오지 않던 이미지(일부는 다른 글의 썸네일)는 변환하지 않는다. 변환 대상은 표지와 본문 이미지뿐이며, `images.json`의 모든 키와 `src/assets/images`의 모든 파일이 글에서 쓰인다(테스트가 검사). 첨부 이미지를 쓰고 싶으면 먼저 원문 본문 규칙(`lib/posts.ts`의 `usedImagePaths`)을 바꿔야 한다.',
    '',
  );
  return `${lines.join('\n')}`;
}

async function main() {
  const source = resolve(root, argValue('--source') ?? '../iduk.design');
  const posts: PostWithArchive[] = JSON.parse(
    await readFile(join(source, 'data/posts.json'), 'utf8'),
  );
  const images: Record<string, ImageEntry> = JSON.parse(
    await readFile(join(root, 'src/content/images.json'), 'utf8'),
  );
  const publicPosts = posts.filter(isPublic);
  if (publicPosts.length !== EXPECTED_COUNT)
    fail(`expected ${EXPECTED_COUNT} public posts, got ${publicPosts.length}`);

  const sourceSlugs = new Set(publicPosts.map((p) => p.slug));
  for (const k of Object.keys(meta))
    if (!sourceSlugs.has(k)) fail(`content-data has an unknown slug: ${k}`);

  const report: Report = {
    folded: [],
    droppedElements: new Set(),
    sourceAltsReplaced: 0,
    legacyExtras: [],
  };
  const converted = publicPosts.map((p) => convertPost(p, images, source, report));
  converted.sort((a, b) => b.sortKey - a.sortKey || (a.published < b.published ? 1 : -1));
  converted.forEach((c, i) => {
    c.project.order = i + 1;
  });

  // 태그
  const tagIds = new Set(tags.map((t) => t.id));
  if (tagIds.size !== tags.length) fail('duplicate tag id');
  const usedTags = new Set(converted.flatMap((c) => c.project.tags));
  for (const t of usedTags) if (!tagIds.has(t)) fail(`unknown tag: ${t}`);
  for (const t of tagIds) if (!usedTags.has(t)) fail(`unused tag: ${t}`);
  const tagRows = tags.map((t) => tagSchema.parse({ ...t, status: 'draft-translation' }));

  // 스키마 검증
  const schema = createProjectSchema(new Set(Object.keys(images)));
  const projects: Project[] = converted.map((c) => {
    const r = schema.safeParse(c.project);
    if (!r.success)
      fail(`${c.project.slug}: schema error\n${JSON.stringify(r.error.issues, null, 2)}`);
    return r.data;
  });
  const slugs = projects.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) fail('duplicate slugs');
  const featured = projects.filter((p) => p.featured).length;
  if (featured < 6 || featured > 8) fail(`featured must be 6-8, got ${featured}`);

  // 개인정보·옛 주소 검사: 걸리면 아무것도 쓰지 않는다.
  const outStrings = collectStrings([projects, tagRows]);
  const hits = outStrings.flatMap((s) => scanText(s).map((h) => ({ ...h, in: s.slice(0, 60) })));
  if (hits.length > 0) {
    console.error('PRIVACY HIT in output. Nothing written.');
    for (const h of hits) console.error(`  ${h.kind}: ${h.match}  (in: ${h.in})`);
    process.exit(2);
  }
  const legacyHits = outStrings.filter(hasLegacyUrl);
  if (legacyHits.length > 0) fail(`legacy host strings in output: ${legacyHits.length}`);
  const sourceHits = publicPosts.flatMap((p) =>
    scanText(p.contentHtml).map((h) => `${p.slug}: ${h.kind}`),
  );

  // 쓰기
  const referenced = new Set(
    projects.flatMap((p) => [
      p.cover.image,
      ...p.blocks.flatMap((b) =>
        b.type === 'image' || b.type === 'longshot'
          ? [b.image]
          : b.type === 'pair'
            ? b.images.map((i) => i.image)
            : [],
      ),
    ]),
  );
  const unreferenced = Object.keys(images).filter((k) => !referenced.has(k));
  if (unreferenced.length > 0)
    fail(`images.json has unreferenced keys: ${unreferenced.length} (re-run convert-images)`);

  await mkdir(projectsDir, { recursive: true });
  for (const f of await readdir(projectsDir)) {
    if (f.endsWith('.json') && !slugs.includes(f.slice(0, -5))) await rm(join(projectsDir, f));
  }
  for (const p of projects) {
    await writeFile(join(projectsDir, `${p.slug}.json`), `${JSON.stringify(p, null, 2)}\n`);
  }
  await writeFile(join(root, 'src/content/tags.json'), `${JSON.stringify(tagRows, null, 2)}\n`);
  await writeFile(join(root, 'docs/manual-todo.md'), manualTodo({ report, projects }));

  // 보고(stdout)
  const count = (p: Project, type: Block['type']) => p.blocks.filter((b) => b.type === type).length;
  console.log(`projects=${projects.length} tags=${tagRows.length} featured=${featured}`);
  console.log('order slug blocks(image/pair/longshot/text/demo) imagesInBlocks demo');
  for (const p of projects) {
    const imgs = p.blocks.reduce(
      (n, b) => n + (b.type === 'pair' ? 2 : b.type === 'image' || b.type === 'longshot' ? 1 : 0),
      0,
    );
    console.log(
      `${String(p.order).padStart(2)} ${p.slug} ${p.blocks.length} (${count(p, 'image')}/${count(p, 'pair')}/${count(p, 'longshot')}/${count(p, 'text')}/${count(p, 'demo')}) ${imgs} ${p.demo ?? '-'}`,
    );
  }
  console.log(`images: ${Object.keys(images).length} (all referenced)`);
  console.log(`dropped elements: ${[...report.droppedElements].join(', ')}`);
  console.log(`captions folded into alt: ${report.folded.length}`);
  for (const f of report.folded) console.log(`  ${f}`);
  console.log(`source alt texts replaced: ${report.sourceAltsReplaced}`);
  console.log(`archive2019 merge candidates: ${report.legacyExtras.map((c) => c.slug).join(', ')}`);
  if (sourceHits.length > 0)
    console.log(`source privacy patterns (not in output): ${sourceHits.join('; ')}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
