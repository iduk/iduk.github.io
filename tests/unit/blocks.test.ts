import { describe, expect, it } from 'vitest';
import {
  classifyImage,
  parseContent,
  parsePeriod,
  parseSubject,
  sanitizeBody,
} from '../../scripts/lib/blocks';
import { scanText } from '../../scripts/lib/privacy';

// 개인정보 형태의 문자열은 소스에 그대로 쓰지 않고 실행 시점에 조립한다.
const at = '@';
const email = `someone${at}example.org`;
const mobile = ['010', '1234', '5678'].join('-');
const landline = ['02', '123', '4567'].join('-');
const userPath = `/${'Users'}/someone/project`;

describe('classifyImage', () => {
  it('세로/가로가 2.5를 넘으면 longshot', () => {
    expect(classifyImage(1000, 2501)).toBe('longshot');
  });
  it('경계값 2.5는 일반 이미지', () => {
    expect(classifyImage(1000, 2500)).toBe('image');
  });
  it('가로형은 image', () => {
    expect(classifyImage(2560, 1440)).toBe('image');
  });
});

describe('sanitizeBody', () => {
  it('on* 속성과 style 요소를 제거한다', () => {
    expect(sanitizeBody('<p onclick="x()">a</p><style>b</style>')).toBe('<p>a</p>');
  });
  it('script와 iframe은 내용까지 제거한다', () => {
    expect(
      sanitizeBody('<p>a</p><script>alert(1)</script><iframe src="https://x.test"></iframe>'),
    ).toBe('<p>a</p>');
  });
  it('허용 목록 밖 요소는 풀고 글자는 남긴다', () => {
    expect(sanitizeBody('<div><span class="x">a</span> <small>b</small></div>')).toBe('a b');
  });
  it('허용 요소만 남기고 속성은 지운다', () => {
    expect(
      sanitizeBody(
        '<ul style="x"><li class="y"><strong>a</strong> <em>b</em></li></ul><ol><li>c</li></ol>',
      ),
    ).toBe('<ul><li><strong>a</strong> <em>b</em></li></ul><ol><li>c</li></ol>');
  });
  it('br은 유지한다', () => {
    expect(sanitizeBody('<p>a<br />b</p>')).toBe('<p>a<br>b</p>');
  });
  it('외부 링크에는 noopener를 붙인다', () => {
    expect(sanitizeBody('<a href="https://example.org/x" onclick="x()">go</a>')).toBe(
      '<a href="https://example.org/x" target="_blank" rel="noopener noreferrer">go</a>',
    );
  });
  it('javascript: 주소는 링크를 풀고 글자만 남긴다', () => {
    expect(sanitizeBody('<a href="javascript:alert(1)">go</a>')).toBe('go');
    expect(sanitizeBody('<a href=" jav&#x09;ascript:alert(1)">go</a>')).toBe('go');
    expect(sanitizeBody('<a href="data:text/html,x">go</a>')).toBe('go');
    expect(sanitizeBody(`<a href="mailto:${email}">go</a>`)).toBe('go');
  });
  it('프로토콜 상대 주소와 상대 경로는 허용 주소가 아니면 푼다', () => {
    expect(sanitizeBody('<a href="//evil.test/x">go</a>')).toBe('go');
    expect(sanitizeBody('<a href="page.html">go</a>')).toBe('go');
  });
  it('옛 사이트·CDN 주소의 링크는 푼다', () => {
    const legacy = ['https://example.org', 'wp-con' + 'tent', 'uploads', 'a.png'].join('/');
    expect(sanitizeBody(`<a href="${legacy}">go</a>`)).toBe('go');
    expect(sanitizeBody(`<a href="https://x.${'cafe' + '24'}.com/a">go</a>`)).toBe('go');
  });
  it('텍스트의 꺾쇠는 이스케이프한다', () => {
    expect(sanitizeBody('<p>1 &lt; 2 &amp; 3</p>')).toBe('<p>1 &lt; 2 &amp; 3</p>');
  });
  it('이미 정화된 결과는 다시 정화해도 같다', () => {
    const once = sanitizeBody('<p>a <a href="https://example.org">b</a></p><ul><li>c</li></ul>');
    expect(sanitizeBody(once)).toBe(once);
  });
});

describe('parseSubject', () => {
  const html = `<div class="postWrite"><dl class="subject">
    <dt>2019.05 - 2019.07 Jejuair Mobile Crew</dt>
    <dd>UI Design.</dd>
    <dd>Prototype</dd>
    <dd style="margin-top:24px;"><a href="http://example.org/">http://example.org/</a></dd>
  </dl></div>`;
  it('dt에서 기간과 이름, dd에서 역할과 나머지 줄을 뽑는다', () => {
    const s = parseSubject(html);
    expect(s.period).toBe('2019.05 - 2019.07');
    expect(s.name).toBe('Jejuair Mobile Crew');
    expect(s.role).toBe('UI Design.');
    expect(s.summary).toBe('Prototype');
    expect(s.lines).toEqual(['UI Design.', 'Prototype']);
    expect(s.links).toEqual([{ href: 'http://example.org/', label: 'http://example.org/' }]);
  });
  it('dt 안의 small과 br을 이름에 합친다', () => {
    const s = parseSubject(
      '<dl class="subject"><dt>2017.04. 앱 시안<br /><small>TSP ver3.1</small></dt></dl>',
    );
    expect(s.period).toBe('2017.04.');
    expect(s.name).toBe('앱 시안 TSP ver3.1');
    expect(s.role).toBeUndefined();
  });
  it('dl이 없으면 빈 결과', () => {
    expect(parseSubject('<p>x</p>')).toEqual({ lines: [], links: [] });
  });
});

describe('parsePeriod', () => {
  it.each([
    ['2020.3 ~', { start: '2020-03' }],
    ['2019.05 - 2019.07', { start: '2019-05', end: '2019-07' }],
    ['2018.7-8', { start: '2018-07', end: '2018-08' }],
    ['2016. 09.', { start: '2016-09' }],
    ['2013.', { start: '2013' }],
    ['2018.12 - 2018.12', { start: '2018-12', end: '2018-12' }],
  ])('%s', (raw, expected) => {
    expect(parsePeriod(raw)).toEqual(expected);
  });
  it('연도가 없으면 undefined', () => {
    expect(parsePeriod('abc')).toBeUndefined();
  });
});

describe('parseContent', () => {
  it('이미지·캡션·dl·링크를 등장 순서대로 뽑는다', () => {
    const { tokens, dropped } = parseContent(
      [
        '<img src="/images/original/a.png" alt="x" />',
        '<p class="text-center">Light Ver.</p>',
        '<hr />',
        '<div class="postWrite"><dl class="subject"><dt>2016.5 Name</dt><dd>Role</dd></dl>',
        '<a class="btn" href="/html/atom/index.html">Open</a></div>',
        '<style>.a{color:red}</style>',
      ].join('\n'),
    );
    expect(tokens.map((t) => t.kind)).toEqual(['image', 'caption', 'subject', 'link']);
    expect(tokens[0]).toMatchObject({ kind: 'image', src: '/images/original/a.png', alt: 'x' });
    expect(tokens[1]).toMatchObject({ kind: 'caption', text: 'Light Ver.' });
    expect(tokens[3]).toMatchObject({ kind: 'link', href: '/html/atom/index.html', label: 'Open' });
    expect(dropped).toContain('style');
  });
  it('따옴표가 닫히지 않은 img도 읽는다', () => {
    const { tokens } = parseContent(
      '<a href="/i/a.png"><img src="/i/a.png" alt="" class="aligncenter size-full /></a>\n</div>',
    );
    expect(tokens.filter((t) => t.kind === 'image')).toHaveLength(1);
  });
  it('dl 안의 링크는 subject 바로 뒤에 link 토큰으로 나온다', () => {
    const { tokens } = parseContent(
      '<dl class="subject"><dt>2020.3 N</dt><dd>R</dd><dd><a href="http://example.org/">http://example.org/</a></dd></dl>',
    );
    expect(tokens.map((t) => t.kind)).toEqual(['subject', 'link']);
  });
});

describe('scanText', () => {
  it('이메일을 찾는다', () => {
    expect(scanText(`문의 ${email} 로`)).toEqual([{ kind: 'email', match: email }]);
  });
  it('전화번호를 찾는다', () => {
    const kinds = scanText(`${mobile} / ${landline}`).map((h) => h.kind);
    expect(kinds).toEqual(['phone', 'phone']);
  });
  it('/Users/ 경로를 찾는다', () => {
    expect(scanText(`see ${userPath}/x`).map((h) => h.kind)).toEqual(['path']);
  });
  it('비밀 값을 찾는다', () => {
    const key = `sk-${'a'.repeat(24)}`;
    expect(scanText(`token=${key}`).some((h) => h.kind === 'secret')).toBe(true);
    expect(scanText('password: hunter2').some((h) => h.kind === 'secret')).toBe(true);
  });
  it('연도·기간·버전 같은 숫자는 전화로 보지 않는다', () => {
    expect(scanText('2019.05 - 2019.07, TSP v3.2, 1024x768, 2016-10-20')).toEqual([]);
  });
  it('일반 문장은 통과', () => {
    expect(scanText('Mobile UI design for an IoT service')).toEqual([]);
  });
});
