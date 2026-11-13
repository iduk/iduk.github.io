/**
 * check-privacy 자체의 시험. 임시 폴더에 작은 저장소·dist를 만들어 규칙마다 실패/통과를 확인한다.
 * 이 파일이 검사 대상이기도 하므로 메일·전화·경로·접속 단어는 조각을 이어 만든다(리터럴 없음).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { parseAllowList, runCheck } from '../../scripts/check-privacy';
import { exifHasGps } from '../../scripts/lib/exif';
import { classify, extractPageRefs, resolveFile } from '../../scripts/lib/links';

const repoRoot = join(import.meta.dirname, '../..');
const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

// 시험 입력은 전부 조각에서 만든다.
const AT = '@';
const personalMail = ['someone', AT, 'corp-example', '.io'].join('');
const placeholderMail = ['contact', AT, 'example', '.com'].join('');
const phone = ['010', '5555', '6666'].join('-');
const homePath = ['', 'Users', 'someone', 'work'].join('/');
const wordMail = ['gmail', '.com'].join('');
const accessWord = ['sf', 'tp'].join('');
const secretLine = `${['api', 'key'].join('_')} = ${'abcdef0123456789'}`;
const PRIV = 'zzfixture[0-9]+';
const PRIV_HIT = 'zzfixture4242';

type Fixture = { root: string; tmp: string; write: (rel: string, body: string | Buffer) => void };

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), 'iduk-cp-'));
  const tmp = mkdtempSync(join(tmpdir(), 'iduk-cp-tmp-'));
  made.push(root, tmp);
  const write = (rel: string, body: string | Buffer) => {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body);
  };
  write('src/readme.txt', 'nothing personal here\n');
  write('dist/index.html', page('<p>hello</p><a href="/work/">work</a>'));
  write('dist/work/index.html', page('<h1 id="top">work</h1><a href="/">home</a>'));
  return { root, tmp, write };
}

const page = (body: string, head = '') =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>t</title>${head}</head><body>${body}</body></html>`;

const run = (f: Fixture, o: Record<string, unknown> = {}, env: Record<string, string> = {}) =>
  runCheck({
    root: f.root,
    env: { TMPDIR: f.tmp, ...env },
    ...o,
  });
const out = (r: { lines: string[] }) => r.lines.join('\n');

let f: Fixture;
beforeEach(() => {
  f = fixture();
});

describe('기준선', () => {
  it('깨끗한 임시 저장소는 통과한다(비공개 패턴 없음은 로컬에서 경고)', async () => {
    const r = await run(f);
    expect(r.code).toBe(0);
    expect(out(r)).toContain('IDUK_PRIVATE_PATTERNS is not set');
  });

  it('dist가 없으면 실패한다', async () => {
    rmSync(join(f.root, 'dist'), { recursive: true });
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[dist]');
  });
});

describe('개인정보 패턴', () => {
  it('메일 모양 문자열은 실패하고, 출력에 값이 없다', async () => {
    f.write('src/note.txt', `contact: ${personalMail}\n`);
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[email] src/note.txt:1');
    expect(out(r)).not.toContain(personalMail);
    expect(out(r)).not.toContain('corp-example');
  });

  it('자리표시 메일은 허용 목록에 있을 때만 통과한다', async () => {
    f.write('src/note.txt', `${placeholderMail}\n`);
    expect((await run(f)).code).toBe(1);
    f.write(
      'scripts/privacy-allow.txt',
      `email | src/note.txt | ${placeholderMail} | 자리표시 메일(시험)\n`,
    );
    const r = await run(f);
    expect(r.code).toBe(0);
    expect(out(r)).not.toContain('unused allow-list');
  });

  it('허용 목록은 값이 정확히 같을 때만 적용한다', async () => {
    f.write('src/note.txt', `${personalMail}\n`);
    f.write(
      'scripts/privacy-allow.txt',
      `email | src/note.txt | ${placeholderMail} | 자리표시 메일(시험)\n`,
    );
    expect((await run(f)).code).toBe(1);
  });

  it('허용 목록은 경로가 맞을 때만 적용한다', async () => {
    f.write('src/note.txt', `${placeholderMail}\n`);
    f.write(
      'scripts/privacy-allow.txt',
      `email | docs/** | ${placeholderMail} | 문서에서만 허용\n`,
    );
    expect((await run(f)).code).toBe(1);
  });

  it('이유 없는 허용 항목은 오류이고, 쓰이지 않는 항목은 경고한다', async () => {
    f.write('src/note.txt', `${placeholderMail}\n`);
    f.write('scripts/privacy-allow.txt', `email | src/note.txt | ${placeholderMail}\n`);
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[allow-list]');
    f.write('scripts/privacy-allow.txt', `email | src/none.txt | ${placeholderMail} | 시험\n`);
    f.write('src/note.txt', 'clean\n');
    const r2 = await run(f);
    expect(r2.code).toBe(0);
    expect(out(r2)).toContain('unused allow-list entry');
  });

  for (const [name, body, rule] of [
    ['전화번호', `call ${phone}`, 'phone'],
    ['/Users/ 경로', `cd ${homePath}`, 'path'],
    ['메일 서비스 이름', `x ${wordMail}`, 'word'],
    ['접속 도구 이름', `config ${accessWord}.json`, 'word'],
    ['비밀 값', secretLine, 'secret'],
  ] as const) {
    it(`${name}은 실패한다`, async () => {
      f.write('src/note.txt', `${body}\n`);
      const r = await run(f);
      expect(r.code).toBe(1);
      expect(out(r)).toContain(`[${rule}] src/note.txt`);
    });
  }

  it('docs에도 같은 패턴을 적용한다', async () => {
    f.write('docs/a.md', `${personalMail}\n`);
    expect((await run(f)).code).toBe(1);
  });

  it('데모 폴더는 확장 패턴(국가번호 표기)으로 검사한다', async () => {
    f.write('dist/html/demo/index.html', page('<p>tel 82 2 5555 6666</p>'));
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[phone] dist/html/demo/index.html');
  });
});

describe('비공개 패턴 ($IDUK_PRIVATE_PATTERNS)', () => {
  const patterns = () => {
    const p = join(f.tmp, 'private.txt');
    writeFileSync(p, `# comment line\n\n${PRIV}\n`);
    return p;
  };

  it('저장소 파일에 걸리면 실패하고 출력에 값이 없다', async () => {
    f.write('docs/anything.md', `see ${PRIV_HIT} here\n`);
    const r = await run(f, {}, { IDUK_PRIVATE_PATTERNS: patterns() });
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[private[0]] docs/anything.md: 1 match');
    expect(out(r)).not.toContain(PRIV_HIT);
    expect(out(r)).not.toContain('zzfixture');
  });

  it('dist(HTML)와 바이너리 파일에도 적용한다', async () => {
    f.write('dist/index.html', page(`<p>${PRIV_HIT}</p>`));
    f.write('src/blob.woff2', Buffer.from(`\u0000\u0001${PRIV_HIT}\u0002`, 'latin1'));
    const r = await run(f, {}, { IDUK_PRIVATE_PATTERNS: patterns() });
    expect(r.code).toBe(1);
    expect(out(r)).toContain('dist/index.html');
    expect(out(r)).toContain('src/blob.woff2');
    expect(out(r)).not.toContain(PRIV_HIT);
  });

  it('파일 이름에도 적용한다', async () => {
    f.write(`src/${PRIV_HIT}.txt`, 'x\n');
    expect((await run(f, {}, { IDUK_PRIVATE_PATTERNS: patterns() })).code).toBe(1);
  });

  it('걸리는 것이 없으면 통과한다', async () => {
    const r = await run(f, {}, { IDUK_PRIVATE_PATTERNS: patterns() });
    expect(r.code).toBe(0);
    expect(out(r)).toContain('private patterns: 1');
  });

  it('잘못된 정규식과 빈 파일은 실패한다(내용은 출력하지 않는다)', async () => {
    const bad = join(f.tmp, 'bad.txt');
    writeFileSync(bad, `${PRIV}\n([unclosed-fixture\n`);
    const r = await run(f, {}, { IDUK_PRIVATE_PATTERNS: bad });
    expect(r.code).toBe(1);
    expect(out(r)).toContain('line 2 is not a valid regex');
    expect(out(r)).not.toContain('unclosed-fixture');
    const empty = join(f.tmp, 'empty.txt');
    writeFileSync(empty, '# only comments\n');
    expect((await run(f, {}, { IDUK_PRIVATE_PATTERNS: empty })).code).toBe(1);
    expect((await run(f, {}, { IDUK_PRIVATE_PATTERNS: join(f.tmp, 'missing.txt') })).code).toBe(1);
  });

  it('CI에서 환경 변수가 없으면 실패한다', async () => {
    const r = await run(f, {}, { CI: 'true' });
    expect(r.code).toBe(1);
    expect(out(r)).toContain('not set in CI');
  });

  it('로컬에서는 경고만, --require-private면 실패한다', async () => {
    expect((await run(f)).code).toBe(0);
    expect((await run(f, { requirePrivate: true })).code).toBe(1);
  });

  it('--allow-missing-private는 CI에서도 크게 경고하고 통과한다(포크 PR 전용)', async () => {
    const r = await run(f, { allowMissingPrivate: true }, { CI: 'true' });
    expect(r.code).toBe(0);
    expect(out(r)).toContain('!!!');
    expect(out(r)).toContain('NOT checked');
  });

  it('--allow-missing-private가 있어도 패턴 파일이 있으면 그대로 적용한다', async () => {
    f.write('docs/x.md', `${PRIV_HIT}\n`);
    const r = await run(
      f,
      { allowMissingPrivate: true },
      { CI: 'true', IDUK_PRIVATE_PATTERNS: patterns() },
    );
    expect(r.code).toBe(1);
  });
});

describe('저장소 밖 목록', () => {
  it('공개 작업 슬러그의 낱말과 같은 비공개 글 슬러그는 식별자로 보지 않는다', async () => {
    const archive = join(f.tmp, 'archive');
    mkdirSync(join(archive, 'data'), { recursive: true });
    writeFileSync(
      join(archive, 'data/posts.json'),
      JSON.stringify([
        { type: 'post', status: 'private', slug: 'dashboard', title: 'Zz', categories: [] },
        {
          type: 'post',
          status: 'private',
          slug: 'zzonly-private-slug',
          title: 'Zz2',
          categories: [],
        },
      ]),
    );
    f.write('src/content/projects/smartfarm-dashboard.json', '{}\n');
    f.write('src/readme.txt', 'a dashboard for the smartfarm\n');
    expect((await run(f, { archive })).code).toBe(0);
    f.write('src/readme.txt', 'see zzonly-private-slug here\n');
    expect((await run(f, { archive })).code).toBe(1);
  });

  it('아카이브의 비공개 글 제목·슬러그를 메모리로만 검사하고 값을 출력하지 않는다', async () => {
    const archive = join(f.tmp, 'archive');
    mkdirSync(join(archive, 'data'), { recursive: true });
    const posts = [
      {
        type: 'post',
        status: 'publish',
        slug: 'public-one',
        title: 'Public One',
        categories: [{ slug: 'portfolio' }],
      },
      {
        type: 'post',
        status: 'private',
        slug: 'zzprivate-slug-fixture',
        title: 'Zzprivate Title Fixture',
        categories: [],
      },
      {
        type: 'page',
        status: 'publish',
        slug: 'contact-fixture',
        title: 'Contact Fixture',
        categories: [],
      },
    ];
    writeFileSync(join(archive, 'data/posts.json'), JSON.stringify(posts));
    f.write('src/readme.txt', 'about the Contact Fixture page and public one\n');
    expect((await run(f, { archive })).code).toBe(0);
    f.write('src/readme.txt', 'mentions zzprivate title FIXTURE here\n');
    const r = await run(f, { archive });
    expect(r.code).toBe(1);
    expect(out(r)).toContain('archive-title');
    expect(out(r)).not.toContain('zzprivate');
    f.write('src/readme.txt', 'see /zzprivate-slug-fixture/ here\n');
    const r2 = await run(f, { archive });
    expect(r2.code).toBe(1);
    expect(out(r2)).toContain('archive-slug');
    expect(out(r2)).not.toContain('zzprivate');
  });

  it('아카이브 경로가 없으면 건너뛴다(CI)', async () => {
    const r = await run(f, { archive: join(f.tmp, 'no-archive') });
    expect(r.code).toBe(0);
    expect(out(r)).toContain('skipped');
  });

  it('치환 원본($TMPDIR/iduk-redact.json)이 저장소에 있으면 실패하고 값을 출력하지 않는다', async () => {
    writeFileSync(
      join(f.tmp, 'iduk-redact.json'),
      JSON.stringify({ entries: [{ find: 'zzredact original', replace: 'x' }] }),
    );
    expect((await run(f)).code).toBe(0);
    f.write('src/note.txt', 'text with zzredact original inside\n');
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('redact-original[0]');
    expect(out(r)).not.toContain('zzredact');
    f.write('src/note.txt', 'url zzredact%20original\n');
    expect((await run(f)).code).toBe(1);
  });
});

describe('dist: 소스맵, 위치 정보, mailto/tel', () => {
  it('.map 파일은 실패한다', async () => {
    f.write('dist/_astro/app.js.map', '{}');
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[source-map] dist/_astro/app.js.map');
  });

  it('JS·CSS의 sourceMappingURL은 실패하고, 데모(복사본)는 건너뛴다', async () => {
    f.write('dist/_astro/app.js', 'console.log(1);\n//# sourceMappingURL=app.js.map\n');
    expect((await run(f)).code).toBe(1);
    rmSync(join(f.root, 'dist/_astro/app.js'));
    f.write('dist/html/demo/lib.js', 'x();\n//# sourceMappingURL=lib.js.map\n');
    f.write('dist/html/demo/index.html', page('<p>demo</p>'));
    expect((await run(f)).code).toBe(0);
  });

  it('데모 CSS에 박힌 base64 소스맵 안의 개인정보도 찾는다(값은 출력하지 않는다)', async () => {
    const map = Buffer.from(
      JSON.stringify({ version: 3, sourcesContent: [`/* ${personalMail} */`] }),
    ).toString('base64');
    f.write(
      'dist/html/demo/a.css',
      `a{}\n/*# sourceMappingURL=data:application/json;base64,${map} */\n`,
    );
    f.write('dist/html/demo/index.html', page('<p>demo</p>'));
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[email] dist/html/demo/a.css');
    expect(out(r)).not.toContain(personalMail);
  });

  it('GPS가 든 이미지는 실패하고 GPS 없는 이미지는 통과한다', async () => {
    const base = sharp({ create: { width: 8, height: 8, channels: 3, background: '#888' } });
    const withGps = await base
      .clone()
      .withExif({
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '37/1 33/1 0/1',
          GPSLongitudeRef: 'E',
          GPSLongitude: '127/1 0/1 0/1',
        },
      })
      .jpeg()
      .toBuffer();
    const plain = await base.clone().jpeg().toBuffer();
    f.write('dist/img/plain.jpg', plain);
    expect((await run(f)).code).toBe(0);
    f.write('src/assets/images/a/photo.jpg', withGps);
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[image-gps] src/assets/images/a/photo.jpg');
    rmSync(join(f.root, 'src/assets/images/a/photo.jpg'));
    f.write(
      'dist/_astro/photo.webp',
      await sharp(withGps)
        .withExif({ IFD3: { GPSLatitudeRef: 'N' } })
        .webp()
        .toBuffer(),
    );
    expect((await run(f)).code).toBe(1);
  });

  it('exifHasGps는 GPS 포인터가 있는 EXIF만 true다', async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } });
    const g = await base
      .clone()
      .withExif({ IFD3: { GPSLatitudeRef: 'S' } })
      .jpeg()
      .toBuffer();
    const c = await base
      .clone()
      .withExif({ IFD0: { Copyright: 'x' } })
      .jpeg()
      .toBuffer();
    expect(exifHasGps((await sharp(g).metadata()).exif as Buffer)).toBe(true);
    expect(exifHasGps((await sharp(c).metadata()).exif as Buffer)).toBe(false);
    expect(exifHasGps(Buffer.from('garbage'))).toBe(false);
  });

  it('dist의 mailto:와 tel: 링크는 실패한다(출력에 값이 없다)', async () => {
    f.write('dist/index.html', page(`<a href="mailto:${personalMail}">m</a>`));
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[mailto-tel] dist/index.html');
    expect(out(r)).not.toContain(personalMail);
    f.write('dist/index.html', page(`<a href="tel:${phone}">t</a>`));
    expect((await run(f)).code).toBe(1);
  });

  it('데모의 mailto:도 허용 목록 없이는 실패한다', async () => {
    f.write('dist/html/demo/index.html', page('<a href="mailto:">x</a>'));
    expect((await run(f)).code).toBe(1);
  });
});

describe('내부 링크', () => {
  it('깨진 내부 href는 실패하고 올바른 링크는 통과한다', async () => {
    f.write('dist/index.html', page('<a href="/work/">ok</a><a href="/work/missing/">bad</a>'));
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[broken-link] dist/index.html: 1');
    f.write('dist/index.html', page('<a href="/work/">ok</a><a href="/work">no slash</a>'));
    expect((await run(f)).code).toBe(0);
  });

  it('src, srcset, action, 스타일시트, 대체 언어 링크도 본다', async () => {
    for (const body of [
      '<img src="/img/none.png">',
      '<img src="/img/a.png" srcset="/img/a.png 1x, /img/none.png 2x">',
      '<form action="/nope/"></form>',
      '<script src="/s/none.js"></script>',
      '<link rel="stylesheet" href="/c/none.css">',
      '<link rel="alternate" hreflang="en" href="https://iduk.co.kr/en/">',
    ]) {
      f.write('dist/img/a.png', 'x');
      f.write('dist/index.html', page(body));
      expect((await run(f)).code, body).toBe(1);
    }
  });

  it('쿼리·프래그먼트·상대 경로·<base>를 해석한다', async () => {
    f.write(
      'dist/a/b/index.html',
      page('<a href="../../work/?x=1#top">w</a><a href="#here" id="here">h</a>'),
    );
    expect((await run(f)).code).toBe(0);
    f.write('dist/a/b/index.html', page('<a href="../../work/#missing">w</a>'));
    expect((await run(f)).code).toBe(1);
    f.write('dist/a/b/index.html', page('<a href="work/">w</a>', '<base href="/">'));
    expect((await run(f)).code).toBe(0);
    f.write('dist/a/b/index.html', page('<a href="work/">w</a>'));
    expect((await run(f)).code).toBe(1);
  });

  it('사이트 자신의 절대 주소는 내부로 해석하고, 외부 주소는 요청하지 않고 목록만 만든다', async () => {
    f.write(
      'dist/index.html',
      page('<a href="https://iduk.co.kr/work/">self</a><a href="https://example.org/x">ext</a>'),
    );
    const r = await run(f, { listExternal: true });
    expect(r.code).toBe(0);
    expect(out(r)).toContain('external example.org x1');
  });

  it('사이트 페이지가 외부 자원(스크립트, 이미지)을 부르면 실패하고, 데모는 허용한다', async () => {
    f.write('dist/index.html', page('<script src="https://cdn.example.org/a.js"></script>'));
    const r = await run(f);
    expect(r.code).toBe(1);
    expect(out(r)).toContain('[external-resource] dist/index.html');
    f.write('dist/index.html', page('<a href="https://example.org/">ok</a>'));
    f.write(
      'dist/html/demo/index.html',
      page('<script src="https://cdn.example.org/a.js"></script>'),
    );
    expect((await run(f)).code).toBe(0);
  });

  it('데모 페이지의 깨진 내부 링크도 실패한다', async () => {
    f.write('dist/html/demo/index.html', page('<a href="missing.html">x</a>'));
    expect((await run(f)).code).toBe(1);
  });

  it('classify / resolveFile 단위', () => {
    const o = 'https://iduk.co.kr';
    expect(classify('mailto:x', '/', o)).toEqual({ kind: 'skip' });
    expect(classify('//cdn.example.org/a', '/', o)).toEqual({
      kind: 'external',
      host: 'cdn.example.org',
    });
    expect(classify('../x/?q=1#f', '/a/b/', o)).toEqual({
      kind: 'internal',
      path: '/a/x/',
      fragment: 'f',
    });
    const files = new Set(['index.html', 'work/index.html', 'a.css']);
    expect(resolveFile('/', files)).toBe('index.html');
    expect(resolveFile('/work', files)).toBe('work/index.html');
    expect(resolveFile('/a.css', files)).toBe('a.css');
    expect(resolveFile('/a.css/', files)).toBeNull();
    expect(
      extractPageRefs('<img srcset="/a.png 1x, /b.png 2x"><a href="/c/">c</a>').refs.map(
        (r) => r.url,
      ),
    ).toEqual(['/a.png', '/b.png', '/c/']);
  });
});

describe('인라인 스타일·스크립트의 외부 자원', () => {
  const inStyle = (css: string) => page('<p>x</p>', `<style>${css}</style>`);
  const inScript = (js: string) => page('<p>x</p>', `<script>${js}</script>`);

  for (const [name, html] of [
    ['인라인 style의 url()', inStyle('a{background:url(https://cdn.example.org/a.png)}')],
    ['인라인 style의 @import 문자열', inStyle('@import "https://cdn.example.org/a.css";')],
    ['인라인 style의 @import url()', inStyle("@import url('//cdn.example.org/a.css');")],
    ['style 속성의 url()', page('<p style="background:url(https://cdn.example.org/a.png)">x</p>')],
    ['인라인 script의 import()', inScript('import("https://cdn.example.org/m.js")')],
    ['인라인 script의 http 주소', inScript("const u='http://cdn.example.org/a.js'")],
    ['인라인 script의 fetch', inScript("fetch('//cdn.example.org/data.json')")],
    [
      '인라인 script의 src 문자열',
      inScript("const s=document.createElement('script');s.src='https://cdn.example.org/a.js'"),
    ],
  ] as const) {
    it(`${name}은 사이트 페이지에서 실패한다(값은 출력하지 않는다)`, async () => {
      f.write('dist/index.html', html);
      const r = await run(f);
      expect(r.code).toBe(1);
      expect(out(r)).toContain('[external-resource] dist/index.html');
      expect(out(r)).not.toContain('cdn.example.org');
    });
  }

  it('데모 페이지, 사이트 자신의 주소, 데이터 블록, data: 주소는 통과한다', async () => {
    f.write('dist/html/demo/index.html', inScript('import("https://cdn.example.org/m.js")'));
    f.write(
      'dist/index.html',
      page(
        '<p style="background:url(data:image/png;base64,AAAA)">x</p>',
        `<style>a{background:url(/work/)}</style><script>fetch("https://iduk.co.kr/work/")</script><script type="application/ld+json">{"url":"https://cdn.example.org/"}</script>`,
      ),
    );
    expect((await run(f)).code).toBe(0);
  });

  it('인라인 스크립트의 깨진 내부 주소는 링크 검사가 잡는다', async () => {
    f.write('dist/index.html', inScript("fetch('//iduk.co.kr/nope/')"));
    expect(out(await run(f))).toContain('[broken-link] dist/index.html');
  });
});

describe('알 수 없는 확장자와 UTF-16', () => {
  for (const ext of ['sql', 'mdx', 'jsonl', 'rss', 'conf', 'env-sample']) {
    it(`.${ext} 파일의 메일·전화도 공개 패턴으로 검사한다`, async () => {
      f.write(`src/data.${ext}`, `row: ${personalMail}\n`);
      const r = await run(f);
      expect(r.code).toBe(1);
      expect(out(r)).toContain(`[email] src/data.${ext}`);
      expect(out(r)).not.toContain(personalMail);
      f.write(`src/data.${ext}`, `call ${phone}\n`);
      expect(out(await run(f))).toContain(`[phone] src/data.${ext}`);
    });
  }

  it('UTF-16 파일(BOM 있음 LE/BE, BOM 없음)도 디코드해서 검사한다', async () => {
    const le = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(`mail ${personalMail}`, 'utf16le'),
    ]);
    const be = Buffer.concat([
      Buffer.from([0xfe, 0xff]),
      Buffer.from(`mail ${personalMail}`, 'utf16le').swap16(),
    ]);
    const bare = Buffer.from(`mail ${personalMail}`, 'utf16le');
    // 한글이 대부분이면 NUL이 적어 BOM이 있어야만 UTF-16임을 알 수 있다.
    const hangul = '가나다라마바사아자차'.repeat(30);
    const leKo = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(`${hangul} ${personalMail}`, 'utf16le'),
    ]);
    const beKo = Buffer.concat([
      Buffer.from([0xfe, 0xff]),
      Buffer.from(`${hangul} ${personalMail}`, 'utf16le').swap16(),
    ]);
    for (const [name, buf] of [
      ['le-ko.txt', leKo],
      ['be-ko.txt', beKo],
      ['le.txt', le],
      ['be.txt', be],
      ['bare.dat', bare],
    ] as const) {
      f.write(`src/${name}`, buf);
      const r = await run(f);
      expect(r.code, name).toBe(1);
      expect(out(r)).toContain(`[email] src/${name}`);
      expect(out(r)).not.toContain(personalMail);
      rmSync(join(f.root, 'src', name));
    }
  });

  it('알려진 바이너리(글꼴, PDF)와 NUL이 많은 진짜 바이너리는 공개 패턴을 건너뛴다', async () => {
    f.write('src/blob.woff2', Buffer.from(`\u0001${personalMail}\u0002`));
    f.write('src/doc.pdf', Buffer.from(`%PDF ${personalMail}`));
    // NUL이 드문(25% 미만) 진짜 바이너리: 텍스트로 읽지 않는다.
    const raw = Buffer.from(`${'abcdefgh'.repeat(300)}${personalMail}`);
    for (let i = 0; i < 400; i += 50) raw[i] = 0;
    f.write('src/raw.dat', raw);
    const r = await run(f);
    expect(r.code).toBe(0);
  });
});

describe('보호 범위 경고', () => {
  it('아카이브가 없으면 출력에 한 줄 경고를 남긴다(실패는 아니다)', async () => {
    const r = await run(f);
    expect(r.code).toBe(0);
    expect(out(r)).toContain('archive needles: 0 - private post titles/slugs are NOT checked');
    expect(out(r)).toContain('--archive ../iduk.design');
  });

  it('아카이브를 쓰면 경고가 없다', async () => {
    const archive = join(f.tmp, 'archive');
    mkdirSync(join(archive, 'data'), { recursive: true });
    writeFileSync(
      join(archive, 'data/posts.json'),
      JSON.stringify([
        {
          type: 'post',
          status: 'private',
          slug: 'zzprivate-slug-fixture',
          title: 'Zzprivate Title Fixture',
        },
      ]),
    );
    expect(out(await run(f, { archive }))).not.toContain('archive needles: 0');
  });
});

describe('--pre-publish', () => {
  const project = (slug: string, extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      slug,
      featured: false,
      tags: ['web'],
      cover: { image: 'a/b', alt: { ko: '가', en: 'a' } },
      blocks: [],
      ...extra,
    });
  const seed = (n: number, draft: boolean, featured = 6) => {
    f.write(
      'src/content/tags.json',
      JSON.stringify([{ id: 'web', name: { ko: '웹', en: 'Web' } }]),
    );
    for (let i = 0; i < n; i++) {
      f.write(
        `src/content/projects/p${i}.json`,
        project(`p${i}`, {
          featured: i < featured,
          ...(draft ? { status: 'draft-translation' } : {}),
        }),
      );
    }
  };

  it('draft-translation이 있으면 실패하고, 기본 모드는 통과한다', async () => {
    seed(8, true);
    const pre = await run(f, { prePublish: true });
    expect(pre.code).toBe(1);
    expect(out(pre)).toContain('[draft-translation] src/content/projects: 8 of 8');
    expect((await run(f)).code).toBe(0);
  });

  it('초안 표시가 없고 개수가 범위 안이면 통과한다', async () => {
    seed(8, false);
    const r = await run(f, { prePublish: true });
    expect(r.code).toBe(0);
    expect(out(r)).toContain('mode=pre-publish');
  });

  it('태그의 초안 표시도 실패시킨다', async () => {
    seed(8, false);
    f.write(
      'src/content/tags.json',
      JSON.stringify([{ id: 'web', name: { ko: '웹', en: 'Web' }, status: 'draft-translation' }]),
    );
    expect((await run(f, { prePublish: true })).code).toBe(1);
  });

  it('대표 작업 개수(6~8), 모르는 태그, 빈 alt를 실패시킨다', async () => {
    seed(8, false, 5);
    expect(out(await run(f, { prePublish: true }))).toContain('[featured-count]');
    seed(10, false, 9);
    expect((await run(f, { prePublish: true })).code).toBe(1);
    seed(8, false, 7);
    f.write('src/content/projects/p0.json', project('p0', { featured: true, tags: ['unknown'] }));
    expect(out(await run(f, { prePublish: true }))).toContain('[tags]');
    f.write(
      'src/content/projects/p0.json',
      project('p0', { featured: true, cover: { image: 'a/b', alt: { ko: '가', en: ' ' } } }),
    );
    expect(out(await run(f, { prePublish: true }))).toContain('[alt]');
  });
});

describe('허용 목록 파일', () => {
  it('저장소의 privacy-allow.txt는 모든 항목에 이유가 있고 형식이 맞다', () => {
    const { allow, errors } = parseAllowList(
      readFileSync(join(repoRoot, 'scripts/privacy-allow.txt'), 'utf8'),
    );
    expect(errors).toEqual([]);
    expect(allow.length).toBeGreaterThan(10);
  });
});

describe('CLI', () => {
  const tsx = join(repoRoot, 'node_modules/.bin/tsx');
  const cli = (args: string[], env: Record<string, string>) =>
    spawnSync(tsx, [join(repoRoot, 'scripts/check-privacy.ts'), ...args], {
      env: { PATH: process.env.PATH ?? '', ...env },
      encoding: 'utf8',
    });

  it('종료 코드 0/1과 CI 모드', () => {
    const ok = cli(['--root', f.root], { TMPDIR: f.tmp });
    expect(ok.status).toBe(0);
    const ci = cli(['--root', f.root], { TMPDIR: f.tmp, CI: 'true' });
    expect(ci.status).toBe(1);
    expect(ci.stdout).toContain('not set in CI');
    f.write('src/note.txt', `${personalMail}\n`);
    const bad = cli(['--root', f.root], { TMPDIR: f.tmp });
    expect(bad.status).toBe(1);
    expect(bad.stdout).not.toContain(personalMail);
    expect(cli(['--root', f.root, '--bogus'], { TMPDIR: f.tmp }).status).toBe(1);
  }, 120_000);
});
