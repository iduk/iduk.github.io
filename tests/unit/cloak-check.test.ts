import { describe, expect, it } from 'vitest';
import {
  externalRefs,
  type FetchLike,
  isAllowed,
  parseAllow,
  runCloakCheck,
  similarity,
} from '../../scripts/cloak-check';

const SITE = 'https://site.example.org';
const page = (body: string, head = '') =>
  `<!doctype html><html><head><title>t</title>${head}</head><body>${body}</body></html>`;

type Route = (
  ua: string,
  referer: string | undefined,
) => { status?: number; body?: string; location?: string };
const stub =
  (route: Route): FetchLike =>
  async (url, init) => {
    const r = route(init.headers['user-agent'] ?? '', init.headers.referer);
    void url;
    return {
      status: r.status ?? 200,
      headers: {
        get: (n: string) => (n.toLowerCase() === 'location' ? (r.location ?? null) : null),
      },
      text: async () => r.body ?? '',
    };
  };
const run = (route: Route, extra: { allowText?: string; siteUrl?: string | undefined } = {}) =>
  runCloakCheck({
    siteUrl: 'siteUrl' in extra ? extra.siteUrl : SITE,
    allowText: extra.allowText ?? '',
    fetcher: stub(route),
    paths: ['/'],
  });

const clean = page(
  '<h1>hello</h1><a href="/work/">work</a>',
  '<link rel="stylesheet" href="/_astro/a.css"><script src="/theme-init.js"></script>',
);

describe('은폐 검사', () => {
  it('세 응답이 같고 외부 자원이 없으면 통과한다', async () => {
    const r = await run(() => ({ body: clean }));
    expect(r.code).toBe(0);
    expect(r.lines.join('\n')).toContain('OK: no cloaking detected');
  });

  it('SITE_URL이 없으면 알림만 남기고 성공한다', async () => {
    const r = await run(() => ({ body: clean }), { siteUrl: undefined });
    expect(r.code).toBe(0);
    expect(r.lines[0]).toContain('::notice::');
    expect((await run(() => ({ body: clean }), { siteUrl: '  ' })).code).toBe(0);
  });

  it('https가 아닌 주소는 실패한다', async () => {
    expect((await run(() => ({ body: clean }), { siteUrl: 'http://site.example.org' })).code).toBe(
      1,
    );
  });

  it('로봇에게만 다른 본문을 보이면 실패한다', async () => {
    const spam = page(`${'<h1>cheap pills</h1>'.repeat(5)}<a href="https://spam.example/x">x</a>`);
    const r = await run((ua) => ({ body: /Googlebot/.test(ua) ? spam : clean }));
    expect(r.code).toBe(1);
    expect(r.lines.join('\n')).toContain('crawler body differs materially');
  });

  it('검색 결과에서 온 방문자(Referer)에게만 다른 본문을 보이면 실패한다', async () => {
    const other = page('<h1>other</h1><p>different</p><p>content</p>');
    const r = await run((_ua, ref) => ({ body: ref ? other : clean }));
    expect(r.code).toBe(1);
    expect(r.lines.join('\n')).toContain('visitor-2 body differs materially');
  });

  it('공백만 다른 본문은 같다고 본다', async () => {
    const r = await run((ua) => ({
      body: /Googlebot/.test(ua) ? clean.replace(/></g, '>\n  <') : clean,
    }));
    expect(r.code).toBe(0);
  });

  it('허용 목록 밖의 외부 스크립트, 스타일, iframe은 실패하고 허용 목록에 있으면 통과한다', async () => {
    for (const tag of [
      '<script src="https://evil.example.net/a.js"></script>',
      '<link rel="stylesheet" href="//evil.example.net/a.css">',
      '<iframe src="https://evil.example.net/f"></iframe>',
    ]) {
      const body = page('<p>x</p>', tag);
      const r = await run(() => ({ body }));
      expect(r.code, tag).toBe(1);
      expect(r.lines.join('\n')).toContain('outside the allow-list');
      expect(
        (await run(() => ({ body }), { allowText: '# ok\nevil.example.net\n' })).code,
        tag,
      ).toBe(0);
    }
  });

  it('본문이 거의 같아도(유사도 통과) 로봇에게만 넣은 외부 스크립트는 허용 목록 검사가 잡는다', async () => {
    const big = page(Array.from({ length: 200 }, (_, i) => `<p>paragraph ${i}</p>`).join(''));
    const injected = big.replace(
      '</body>',
      '<script src="https://evil.example.net/a.js"></script></body>',
    );
    const r = await run((ua) => ({ body: /Googlebot/.test(ua) ? injected : big }));
    expect(r.lines.join('\n')).not.toContain('differs materially');
    expect(r.lines.join('\n')).toContain(
      '[crawler]: 1 script/style/iframe URL(s) outside the allow-list',
    );
    expect(r.code).toBe(1);
  });

  it('다른 호스트로의 리다이렉트와 200이 아닌 응답은 실패한다', async () => {
    const r = await run(() => ({ status: 302, location: 'https://elsewhere.example.net/' }));
    expect(r.code).toBe(1);
    expect(r.lines.join('\n')).toContain('redirects to another host');
    expect((await run(() => ({ status: 503 }))).code).toBe(1);
  });

  it('같은 호스트 안의 리다이렉트는 따라간다', async () => {
    let n = 0;
    const r = await run(() =>
      n++ % 2 === 0 ? { status: 301, location: '/en/' } : { body: clean },
    );
    expect(r.code).toBe(0);
  });

  it('요청이 던지면(네트워크 오류) 실패한다', async () => {
    const r = await runCloakCheck({
      siteUrl: SITE,
      allowText: '',
      paths: ['/'],
      fetcher: async () => {
        throw new Error('boom');
      },
    });
    expect(r.code).toBe(1);
  });
});

describe('순수 함수', () => {
  it('externalRefs: script src, stylesheet, preload, iframe만 모은다', () => {
    const html = page(
      '<a href="https://a.example/x">a</a><img src="https://img.example/i.png"><iframe src="https://f.example/"></iframe><script>var x=1</script><script type="application/json">{}</script>',
      '<script src="/a.js"></script><link rel="stylesheet" href="https://s.example/c.css"><link rel="preload" as="style" href="/p.css"><link rel="preload" as="font" href="/f.woff2"><link rel="icon" href="/favicon.svg">',
    );
    expect(externalRefs(html, `${SITE}/`).sort()).toEqual(
      [`${SITE}/a.js`, 'https://s.example/c.css', `${SITE}/p.css`, 'https://f.example/'].sort(),
    );
  });

  it('isAllowed: 같은 호스트, 호스트 이름, URL 접두', () => {
    const allow = parseAllow('# c\ncdn.example.org  # trailing\nhttps://lib.example.org/v1/\n');
    expect(allow).toEqual(['cdn.example.org', 'https://lib.example.org/v1/']);
    expect(isAllowed(`${SITE}/a.js`, 'site.example.org', allow)).toBe(true);
    expect(isAllowed('https://cdn.example.org/a.js', 'site.example.org', allow)).toBe(true);
    expect(isAllowed('https://lib.example.org/v1/a.js', 'site.example.org', allow)).toBe(true);
    expect(isAllowed('https://lib.example.org/v2/a.js', 'site.example.org', allow)).toBe(false);
    expect(isAllowed('https://evil.example.net/a.js', 'site.example.org', allow)).toBe(false);
    expect(isAllowed('javascript:alert(1)', 'site.example.org', allow)).toBe(false);
  });

  it('similarity', () => {
    expect(similarity('<p>a</p>', '<p>a</p>')).toBe(1);
    expect(similarity('<p>a</p> <p>b</p>', '<p>a</p>\n<p>b</p>')).toBe(1);
    expect(similarity('<p>a</p><p>b</p>', '<p>x</p><p>y</p>')).toBeLessThan(0.5);
  });
});
