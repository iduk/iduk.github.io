/**
 * 정규식 폭주(ReDoS) 점검: scripts/lib 의 모든 정규식 패턴군에 2MB짜리 적대적 입력을 넣고 1초 안에 끝나는지 본다.
 * 입력은 각 패턴이 "거의 맞다가 끝에서 틀리는" 모양(공백·점·괄호·구분자의 반복, 닫는 표식 없는 열기 표식의 반복)이다.
 */
import { describe, expect, it } from 'vitest';
import {
  applyRedactions,
  classifyExternal,
  cssRefs,
  filterFontSrc,
  fixBrokenRefs,
  hasMapTrace,
  htmlRefs,
  neutralizeMapEmbeds,
  neutralizeMapLinks,
  planKeep,
  replaceExternalImages,
  stripPhpEchoTags,
} from '../../scripts/lib/demos';
import { metadataMarkers, stripSvg } from '../../scripts/lib/imagemeta';
import { readPdfMetadata, shownText, withoutStreams } from '../../scripts/lib/pdf';
import { sanitizeDemoText, scanDemoText, scanText } from '../../scripts/lib/privacy';

const N = 2_000_000;
// 정상 처리는 한가할 때 0.65~0.8초, 부하가 있으면 1.0~1.2초다. 정규식이 폭발하면(ReDoS) 2MB에서 분~시간이 걸리므로
// 한도는 부하 변동의 2배 이상으로 넉넉히 잡아도 검출력이 같다(1초는 마진이 없어 간헐 실패했다).
const LIMIT_MS = 3000;
const rep = (unit: string, total = N) =>
  unit.repeat(Math.ceil(total / unit.length)).slice(0, total);
const ws = (n = N) => ' '.repeat(n);

function timed<T>(label: string, fn: () => T, limit = LIMIT_MS): T {
  const t0 = performance.now();
  const out = fn();
  const ms = performance.now() - t0;
  expect(ms, `${label}: ${ms.toFixed(0)}ms`).toBeLessThan(limit);
  return out;
}

/** 메일·전화·등록번호·비밀 값 패턴군(privacy.ts)에 넣는 입력. */
const privacyInputs: Record<string, string> = {
  a: rep('a'),
  'a.': rep('a.'),
  'a@': rep('a@'),
  '@a.': rep('@a.'),
  'x@ + a.': `x@${rep('a.')}`,
  'a (at) ': rep('a (at) '),
  'a AT b DOT ': rep('a AT b DOT '),
  'at ': rep('at '),
  'dot ': rep('dot '),
  'a + spaces': `a${ws()}`,
  'a (at + spaces': `a (at${ws()}`,
  spaces: ws(),
  '0': rep('0'),
  '0 ': rep('0 '),
  '02-': rep('02-'),
  '02 . ': rep('02 . '),
  '+82 ': rep('+82 '),
  '82 ': rep('82 '),
  '82-2-': rep('82-2-'),
  '1588 ': rep('1588 '),
  '1588-': rep('1588-'),
  'M1536 1792 ': rep('M1536 1792 '),
  'tel:': rep('tel:'),
  'tel: ': rep('tel: '),
  'tel: + spaces': `tel:${ws()}1`,
  'T.': rep('T.'),
  'tel.': rep('tel.'),
  '02/3456/': rep('02/3456/'),
  '&#64;': rep('&#64;'),
  '&#': rep('&#'),
  '&#0000': rep('&#0000'),
  '%40': rep('%40'),
  '%': rep('%'),
  '\\u00': rep('\\u00'),
  '통신판매업 신고번호': rep('통신판매업 신고번호'),
  '통신판매업 신고번호.': rep('통신판매업 신고번호.'),
  '통신판매업 신고번호 + spaces': `통신판매업 신고번호${ws()}`,
  '통신판매업 신고번호. + spaces': `통신판매업 신고번호.${ws()}`,
  '통신판매업 신고번호 서울': `통신판매업 신고번호 ${rep('서울가나')}`,
  '123-45-': rep('123-45-'),
  '123-45-6789': rep('123-45-6789 '),
  eyJ: rep('eyJ'),
  'eyJ + a': `eyJ${rep('a')}`,
  'Bearer ': rep('Bearer '),
  'Bearer + spaces': `Bearer${ws()}`,
  password: rep('password'),
  'password + spaces': `password${ws()}`,
  'password: ': rep('password: '),
  '-----BEGIN ': rep('-----BEGIN '),
  '-----BEGIN A': `-----BEGIN ${rep('A ')}`,
  'sk-': rep('sk-'),
  AKIA: rep('AKIA'),
  github_pat_: rep('github_pat_'),
  'fullwidth a': rep('ａ'),
  'fullwidth 1': rep('１'),
  dashes: rep('‐'),
  '/Users/': rep('/Users/'),
  'C:\\Users\\': rep('C:\\Users\\'),
};

describe('ReDoS: privacy.ts (메일·전화·등록번호·비밀 값), 입력 2MB', () => {
  for (const [name, input] of Object.entries(privacyInputs)) {
    it(`"${name}"`, () => {
      timed(`sanitizeDemoText ${name}`, () => sanitizeDemoText(input));
      timed(`scanDemoText ${name}`, () => scanDemoText(input));
      timed(`scanText ${name}`, () => scanText(input));
    });
  }
});

describe('ReDoS: demos.ts, imagemeta.ts, pdf.ts, 입력 2MB', () => {
  it('cssRefs', () => {
    for (const input of [
      rep('url('),
      rep('url("'),
      rep("url('a"),
      rep('url( '),
      `url(${ws()}`,
      rep('@import "'),
      rep('@import '),
      `@import${ws()}`,
      rep('url(a)'),
    ]) {
      timed('cssRefs', () => cssRefs(input));
    }
  });

  it('htmlRefs (parse5)', () => {
    for (const input of [
      rep('<a '),
      rep('<a href="'),
      rep('<img src='),
      rep('<style>url('),
      rep('<!--'),
    ]) {
      timed('htmlRefs', () => htmlRefs(input), 3000);
    }
  });

  it('지도 임베드·링크·좌표 흔적', () => {
    for (const input of [
      rep('<iframe '),
      rep('<iframe src="'),
      `<iframe src=${ws()}`,
      rep('<a '),
      rep('<a href="'),
      `<a href${ws()}`,
      rep('google.'),
      rep('google.a'),
      rep('!1m1'),
      rep('pb=!'),
    ]) {
      timed('neutralizeMapEmbeds', () => neutralizeMapEmbeds(input));
      timed('neutralizeMapLinks', () => neutralizeMapLinks(input));
      timed('hasMapTrace', () => hasMapTrace(input));
    }
  });

  it('PHP 태그, 글꼴 src, 치환 목록', () => {
    const entries = Array.from({ length: 18 }, (_, i) => ({ find: `가나다${i}`, replace: 'OOO' }));
    for (const input of [rep('<?='), rep('<?= '), `<?=${ws()}`, rep('<?=A'), rep('가나다1')]) {
      timed('stripPhpEchoTags', () => stripPhpEchoTags(input));
      timed('applyRedactions', () => applyRedactions(input, entries));
    }
    for (const input of [
      rep('@font-face{'),
      rep('@font-face{src:'),
      `@font-face{${rep('src ')}}`,
      `@font-face{src:${rep('url(')}}`,
      `@font-face{src:${ws()}}`,
      `@font-face${ws()}{src:url(a.eot)}`,
    ]) {
      timed('filterFontSrc', () => filterFontSrc(input, () => true));
    }
  });

  it('주소 분류(classifyExternal)', () => {
    for (const unit of ['bootstrap', 'jquery-', 'font-awesome', 'bootstrap/', 'font-awesome-']) {
      timed('classifyExternal', () => classifyExternal(`https://x.test/${rep(unit)}`));
    }
  });

  it('외부 이미지 치환: 서로 다른 주소 5만 개', () => {
    const html = Array.from(
      { length: 50_000 },
      (_, i) => `<img src="http://h${i % 7}.example.net/${i}.jpg">`,
    ).join('');
    const r = timed('replaceExternalImages', () => replaceExternalImages(html, true), 3000);
    expect(r.replaced).toBe(50_000);
  });

  it('깨진 참조 수리: 서로 다른 깨진 이미지 3만 개', () => {
    const html = Array.from({ length: 30_000 }, (_, i) => `<img src="gone/${i}.png">`).join('');
    const texts = new Map([['d/index.html', html]]);
    const r = timed(
      'fixBrokenRefs',
      () => fixBrokenRefs(texts, new Set(['d/index.html', '_placeholder.svg'])),
      4000,
    );
    expect(r.imagesPlaceholdered).toBe(30_000);
  });

  it('정리(planKeep)의 JS 문자열 탐색', () => {
    const text: Record<string, string> = {
      'd/index.html': '<script src="app.js"></script>',
      'd/app.js': rep("'a."),
    };
    timed('planKeep', () => planKeep(['d'], ['d/index.html', 'd/app.js'], (f) => text[f]), 3000);
  });

  it('SVG 메타데이터 제거와 이미지 표식 검사', () => {
    for (const input of [
      rep('<?xpacket'),
      rep('<metadata'),
      rep('<!--'),
      rep('<!-- generator'),
      rep('<!-- '),
    ]) {
      timed('stripSvg', () => stripSvg(input));
    }
    const buf = Buffer.from(rep('Make Model <?xpacket '), 'latin1');
    timed('metadataMarkers', () =>
      metadataMarkers('x.jpg', Buffer.concat([Buffer.from([0xff, 0xd8]), buf])),
    );
  });

  it('PDF 구조 검사', () => {
    for (const input of [
      rep('['),
      rep('(('),
      rep('[(a'),
      rep('stream\n'),
      rep('endstream'),
      rep('1'),
      rep('/Info '),
      rep('/Creator ('),
      rep('1 0 obj '),
    ]) {
      timed('shownText', () => shownText(input));
      timed('withoutStreams', () => withoutStreams(input));
    }
    for (const input of [rep('1'), rep('/Info 1 0 R '), rep('/Creator '), rep('/Producer ')]) {
      const t0 = performance.now();
      try {
        readPdfMetadata(`%PDF-1.4\n${input}`);
      } catch {
        // 구조 오류로 멈추는 것은 정상이다. 시간만 본다.
      }
      expect(performance.now() - t0, 'readPdfMetadata').toBeLessThan(LIMIT_MS);
    }
  });
});
