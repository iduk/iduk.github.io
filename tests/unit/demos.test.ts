import { describe, expect, it } from 'vitest';
import {
  applyRedactions,
  classifyExternal,
  cssRefs,
  filterFontSrc,
  findBrokenRefs,
  fixBrokenRefs,
  hasAccessString,
  hasMapTrace,
  htmlRefs,
  IMAGE_PLACEHOLDER_URL,
  isDeadExternalFontUrl,
  isExcludedName,
  isExternalUrl,
  isLegacyFontUrl,
  isSkippableUrl,
  isTextFile,
  neutralizeMapEmbeds,
  neutralizeMapLinks,
  parseRedactions,
  planKeep,
  REPAIRS,
  replaceExternalImages,
  stripPhpEchoTags,
  upgradeHttps,
} from '../../scripts/lib/demos';

describe('복사 제외 규칙', () => {
  it('.DS_Store, .vscode, .git, *.map 을 뺀다', () => {
    for (const n of ['.DS_Store', '.vscode', '.git', 'bootstrap.js.map', 'a.min.css.map']) {
      expect(isExcludedName(n), n).toBe(true);
    }
  });
  it('일반 파일·폴더와 .map 을 이름 끝에만 가진 것이 아닌 경우는 남긴다', () => {
    for (const n of [
      'index.html',
      'map.png',
      'sitemap.html',
      'maps',
      '.gitignore',
      'vscode',
      'style.css',
    ]) {
      expect(isExcludedName(n), n).toBe(false);
    }
  });
});

describe('정화 대상 판별', () => {
  it('html/css/js 등 텍스트만 대상, 글꼴·이미지·PDF는 아니다', () => {
    for (const p of ['a/index.html', 'a/B.HTM', 'x.css', 'x.min.js', 'x.json', 'i.svg']) {
      expect(isTextFile(p), p).toBe(true);
    }
    for (const p of ['f.woff2', 'f.ttf', 'f.eot', 'i.png', 'i.jpg', 'i.ico', 'a.pdf', 'noext']) {
      expect(isTextFile(p), p).toBe(false);
    }
  });
});

describe('참조 추출', () => {
  it('HTML에서 자원과 이동 링크를 구분한다', () => {
    const html = `<!doctype html><html><head>
      <link rel="stylesheet" href="css/a.css"><link rel="icon" href="//cdn.test/x.ico">
      <link rel="preload" as="font" href="f.woff2"><link rel="canonical" href="/x/">
      <script src="https://cdn.test/j.js"></script><script>var a = 1;</script>
      <style>@import "b.css"; .x{background:url(img/bg.png)}</style></head>
      <body style="background:url('i/s.jpg')"><a href="p.html">p</a><a href="#top">t</a>
      <a href="mailto:a@b.test">m</a><a href="javascript:void(0)">j</a>
      <img src="a.png" srcset="b.png 1x, c.png 2x"><video poster="v.jpg"><source src="v.mp4"></video>
      <iframe src="https://www.example.com/embed"></iframe></body></html>`;
    const refs = htmlRefs(html);
    const has = (url: string, kind: string) =>
      expect(refs, `${kind} ${url}`).toContainEqual({ url, kind });
    has('css/a.css', 'style');
    has('//cdn.test/x.ico', 'image');
    has('f.woff2', 'font');
    has('https://cdn.test/j.js', 'script');
    has('b.css', 'style');
    has('img/bg.png', 'image');
    has('i/s.jpg', 'image');
    has('p.html', 'link');
    has('a.png', 'image');
    has('b.png', 'image');
    has('c.png', 'image');
    has('v.jpg', 'image');
    has('v.mp4', 'media');
    has('https://www.example.com/embed', 'frame');
    const urls = refs.map((r) => r.url);
    for (const skipped of ['#top', 'mailto:a@b.test', 'javascript:void(0)', '/x/']) {
      expect(urls).not.toContain(skipped);
    }
  });

  it('CSS의 url()과 @import, data: 는 제외', () => {
    const refs = cssRefs(
      `@import url("x.css"); @import 'y.css'; @font-face{src:url(f.eot?#iefix) format("embedded-opentype"),url('//fonts.test/f.woff2')}
       .a{background:url(data:image/png;base64,AAAA)} .b{fill:url(#grad)} .c{background:url( "i/a.JPG" )}`,
    );
    expect(refs).toContainEqual({ url: 'x.css', kind: 'style' });
    expect(refs).toContainEqual({ url: 'y.css', kind: 'style' });
    expect(refs).toContainEqual({ url: 'f.eot?#iefix', kind: 'font' });
    expect(refs).toContainEqual({ url: '//fonts.test/f.woff2', kind: 'font' });
    expect(refs).toContainEqual({ url: 'i/a.JPG', kind: 'image' });
    expect(refs.some((r) => r.url.startsWith('data:') || r.url.startsWith('#'))).toBe(false);
  });

  it('외부·건너뛸 주소 판별', () => {
    expect(isExternalUrl('https://a.test/x')).toBe(true);
    expect(isExternalUrl('http://a.test')).toBe(true);
    expect(isExternalUrl('//a.test/x')).toBe(true);
    expect(isExternalUrl('/html/atom/')).toBe(false);
    expect(isExternalUrl('img/a.png')).toBe(false);
    expect(isSkippableUrl('#')).toBe(true);
    expect(isSkippableUrl('tel:0000')).toBe(true);
    expect(isSkippableUrl('a.html#x')).toBe(false);
  });
});

describe('외부 주소 분류', () => {
  it('http 전용은 혼합 콘텐츠로 표시한다', () => {
    const n = classifyExternal('http://img.example.net/a.png');
    expect(n.insecure).toBe(true);
    expect(n.host).toBe('img.example.net');
    expect(n.hints.join()).toMatch(/http-only/);
  });
  it('오래된 라이브러리 버전과 폐쇄된 호스트를 표시한다', () => {
    expect(
      classifyExternal(
        'https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js',
      ).hints.join(),
    ).toMatch(/jQuery < 3/);
    expect(classifyExternal('https://cdn.rawgit.com/x/y/z.js').hints).toContain('retired-host');
    expect(
      classifyExternal(
        'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
      ).hints.join(),
    ).toMatch(/Bootstrap < 4/);
  });
  it('문제 없는 주소는 표시가 없다', () => {
    expect(classifyExternal('//fonts.gstatic.com/s/a.woff2').hints).toEqual([]);
    expect(
      classifyExternal('https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js').hints,
    ).toEqual([]);
  });
});

describe('접속 정보', () => {
  it('접속 정보 문자열을 찾는다', () => {
    expect(hasAccessString(`host: ${['IDUK', '.SPACE'].join('')}`)).toBe(true);
    expect(hasAccessString('"sftp": {}')).toBe(true);
    expect(hasAccessString('plain demo')).toBe(false);
  });
});

describe('지도 임베드', () => {
  const pb = '!1m18!1m12!1m3!1d1794.2!2d127.1!3d37.4!2m3!1f0!2f0!3f0';
  it('구글 지도 iframe의 src를 about:blank로 바꾸고 나머지 속성은 둔다', () => {
    const html = `<iframe src="https://www.google.com/maps/embed?pb=${pb}" width="100%" height="450" allowfullscreen></iframe>`;
    const r = neutralizeMapEmbeds(html);
    expect(r.replaced).toBe(1);
    expect(r.text).toBe(
      '<iframe src="about:blank" width="100%" height="450" allowfullscreen></iframe>',
    );
    expect(hasMapTrace(html)).toBe(true);
    expect(hasMapTrace(r.text)).toBe(false);
  });
  it('지도가 아닌 iframe(유튜브)은 그대로 둔다', () => {
    const html = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    expect(neutralizeMapEmbeds(html)).toEqual({ text: html, replaced: 0 });
  });
  it('지도 길찾기 링크는 #으로 바꾼다', () => {
    const r = neutralizeMapLinks(
      '<a href="https://map.kakao.com/?busStopId=1&amp;from=roughmap" target="_blank">301</a><a href="/work/">w</a>',
    );
    expect(r.text).toBe('<a href="#" target="_blank">301</a><a href="/work/">w</a>');
    expect(r.replaced).toBe(1);
  });
});

describe('치환 목록(실명·주소)', () => {
  const entries = [
    { find: '가나다', replace: 'OOO' },
    { find: '가나다라', replace: 'XXXX' },
    { find: '서울시 OO구 샘플로 1', replace: '서울시 OO구 OO로 0' },
  ];
  it('긴 것부터 바꾸고 횟수를 센다', () => {
    const r = applyRedactions('대표 가나다라, 가나다 / 서울시 OO구 샘플로 1', entries);
    expect(r.text).toBe('대표 XXXX, OOO / 서울시 OO구 OO로 0');
    expect(r.counts).toEqual([1, 1, 1]);
  });
  it('URL 인코딩, 숫자 엔티티, JS 이스케이프 형태도 바꾼다', () => {
    const t = `${encodeURIComponent('가나다')} &#44032;&#45208;&#45796; &#xac00;&#xb098;&#xb2e4; \\uac00\\ub098\\ub2e4`;
    const r = applyRedactions(t, [{ find: '가나다', replace: 'OOO' }]);
    expect(r.text).toBe('OOO OOO OOO OOO');
  });
  it('해당 없으면 그대로', () => {
    expect(applyRedactions('abc', entries)).toEqual({ text: 'abc', counts: [0, 0, 0] });
  });
  it('JSON 검증: entries 배열과 길이 2 이상 find가 필요하다', () => {
    expect(parseRedactions('{"entries":[{"find":"가나","replace":"OO"}]}')).toHaveLength(1);
    expect(() => parseRedactions('{}')).toThrow();
    expect(() => parseRedactions('{"entries":[{"find":"a","replace":"b"}]}')).toThrow();
  });
});

describe('PHP 태그, https, 외부 이미지', () => {
  it('<?=GML_THEME_URL ?>/assets/ → assets/', () => {
    const r = stripPhpEchoTags('<img src="<?=GML_THEME_URL ?>/assets/a.png"><a href="x.html">');
    expect(r.text).toBe('<img src="assets/a.png"><a href="x.html">');
    expect(r.replaced).toBe(1);
  });
  it('http → https는 열리는 호스트만', () => {
    const r = upgradeHttps(
      '<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script><img src="http://img.example.net/a.png">',
    );
    expect(r.text).toContain('https://ajax.googleapis.com/');
    expect(r.text).toContain('http://img.example.net/a.png');
    expect(r.replaced).toBe(1);
  });
  it('외부 이미지는 자리표시로, 스톡 사진 호스트는 그대로', () => {
    const html =
      '<img src="http://press.example.net/a.jpg?x=1&amp;y=2" alt="기사"><img src="https://images.unsplash.com/photo-1?w=2"><div style="background:url(//cdn.example.net/b.png)"></div>';
    const r = replaceExternalImages(html, true);
    expect(r.text).toBe(
      `<img src="${IMAGE_PLACEHOLDER_URL}" alt="기사"><img src="https://images.unsplash.com/photo-1?w=2"><div style="background:url(${IMAGE_PLACEHOLDER_URL})"></div>`,
    );
    expect(r.replaced).toBe(2);
  });
});

describe('글꼴 src 정리', () => {
  const css = `@font-face{font-family:A;src:url(a.eot);src:url(a.eot?#iefix) format("embedded-opentype"),url(a.woff2) format("woff2"),url(a.svg#a) format("svg")}
@font-face{font-family:B;src:url(//fonts.gstatic.com/ea/x/B.woff2) format("woff2"),url(//fonts.gstatic.com/ea/x/B.otf)}
@font-face{font-family:C;src:local(C),url(c.ttf)}
.x{background:url(a.eot)}`;
  it('EOT·SVG 글꼴과 사라진 얼리 액세스 주소를 뺀다', () => {
    const r = filterFontSrc(css, (u) => isLegacyFontUrl(u) || isDeadExternalFontUrl(u));
    expect(r.text).toContain('src:url(a.woff2) format("woff2")}');
    expect(r.text).not.toContain('a.eot?#iefix');
    expect(r.text).not.toContain('a.svg');
    expect(r.text).not.toContain('font-family:B');
    expect(r.text).toContain('@font-face{font-family:C;src:local(C),url(c.ttf)}');
    expect(r.text).toContain('.x{background:url(a.eot)}');
    expect(r.removed).toBe(5);
  });
});

describe('정리(planKeep)', () => {
  const files = [
    'd/index.html',
    'd/about.html',
    'd/orphan.html',
    'd/css/a.css',
    'd/css/unused.css',
    'd/img/used.png',
    'd/img/via-css.png',
    'd/img/unused.png',
    'd/js/app.js',
    'e/index.html',
  ];
  const text: Record<string, string> = {
    'd/index.html':
      '<link rel="stylesheet" href="css/a.css"><script src="js/app.js"></script><img src="img/used.png"><a href="about.html">a</a>',
    'd/about.html': '<a href="index.html">home</a>',
    'd/orphan.html': '<img src="img/unused.png">',
    'd/css/a.css': '.a{background:url(../img/via-css.png)}',
    'd/css/unused.css': 'x',
    'd/js/app.js': 'console.log(1)',
    'e/index.html': '<p>e</p>',
  };
  const read = (f: string) => text[f];
  it('index에서 링크로 닿는 페이지와, 남은 파일이 이름을 언급하는 파일만 남긴다', () => {
    const r = planKeep(['d', 'e'], files, read);
    expect([...r.keep].sort()).toEqual(
      [
        'd/index.html',
        'd/about.html',
        'd/css/a.css',
        'd/img/used.png',
        'd/img/via-css.png',
        'd/js/app.js',
        'e/index.html',
      ].sort(),
    );
    expect(r.droppedPages).toEqual(['d/orphan.html']);
    expect(r.droppedAssets).toEqual(['d/css/unused.css', 'd/img/unused.png']);
  });
  it('고아 페이지만 언급하는 파일은 남지 않는다', () => {
    const r = planKeep(['d'], files, read);
    expect(r.keep.has('d/img/unused.png')).toBe(false);
  });
});

describe('깨진 참조', () => {
  const texts = new Map<string, string>([
    [
      'd/index.html',
      '<link rel="stylesheet" href="css/a.css"><img src="/assets/x.png"><img src="img/missing.png"><a href="gone.html">g</a><a href="/">home</a><video><source src="v.mp4"></video>',
    ],
    [
      'd/css/a.css',
      '@font-face{font-family:F;src:url(../font/f.woff2) format("woff2"),url(../font/gone.woff) format("woff")}.a{background:url(/img/b.png)}',
    ],
  ]);
  const files = new Set([
    'd/index.html',
    'd/css/a.css',
    'd/assets/x.png',
    'd/font/f.woff2',
    'd/img/b.png',
    '_placeholder.svg',
  ]);
  it('findBrokenRefs는 닿지 않는 내부 참조를 찾고 루트(/)는 허용한다', () => {
    const urls = findBrokenRefs(files, (f) => texts.get(f)).map((b) => b.url);
    expect(urls).toContain('/assets/x.png');
    expect(urls).toContain('img/missing.png');
    expect(urls).toContain('gone.html');
    expect(urls).toContain('../font/gone.woff');
    expect(urls).toContain('v.mp4');
    expect(urls).not.toContain('/');
  });
  it('fixBrokenRefs: 이름이 하나뿐이면 옮기고, 없는 링크·글꼴·영상·이미지는 규칙대로 처리한다', () => {
    const t = new Map(texts);
    const r = fixBrokenRefs(t, files);
    const html = t.get('d/index.html') as string;
    const css = t.get('d/css/a.css') as string;
    expect(html).toContain('src="/html/d/assets/x.png"'); // 루트 기준 절대 경로는 /html/<데모>/ 아래로 옮긴다
    expect(html).toContain(`src="${IMAGE_PLACEHOLDER_URL}"`);
    expect(html).toContain('<a href="#">g</a>');
    expect(html).not.toContain('<source');
    expect(css).not.toContain('gone.woff');
    expect(css).toContain('url(../font/f.woff2)');
    expect(css).toContain('url(/html/d/img/b.png)');
    expect(r.unresolved).toEqual([]);
    expect(findBrokenRefs(files, (f) => t.get(f))).toEqual([]);
  });
  it('주소 일부만 겹치는 다른 주소를 건드리지 않는다(경계 치환)', () => {
    const t = new Map([
      ['d/css/a.css', '.a{background:url(../x/f.woff)}.b{background:url(../x/f.woff2)}'],
    ]);
    const all = new Set(['d/css/a.css', 'd/y/f.woff', 'd/y/f.woff2']);
    fixBrokenRefs(t, all);
    expect(t.get('d/css/a.css')).toBe(
      '.a{background:url(../y/f.woff)}.b{background:url(../y/f.woff2)}',
    );
  });
});

describe('수리(REPAIRS)', () => {
  it('popper ES 모듈 빌드를 일반 스크립트로 바꾼다', () => {
    const r = REPAIRS.find((x) => x.file.endsWith('popper.min.js')) as (typeof REPAIRS)[number];
    const out = r.apply('const e=1;export default ve;\n//# sourceMappingURL=popper.min.js.map');
    expect(out).toContain('window.Popper=ve;');
    expect(out).not.toContain('export');
    expect(out).not.toContain('sourceMappingURL');
    expect(r.apply('already plain')).toBe('already plain');
  });
  it('원문이 바뀌어 적용되지 않으면 같은 문자열을 돌려준다(CLI가 실패로 처리)', () => {
    for (const r of REPAIRS) expect(r.apply('unrelated')).toBe('unrelated');
  });
});
