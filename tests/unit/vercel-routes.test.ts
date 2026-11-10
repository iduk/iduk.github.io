import { describe, expect, it } from 'vitest';
import {
  headersFor,
  matchingHeaderRules,
  matchSource,
  redirectFor,
  type VercelConfig,
} from '../helpers/vercel-routes';

// 해석기 자체의 시험. 사례는 Vercel 문서(vercel.json 절)의 source 예시에서 가져왔다.
describe('matchSource (path-to-regexp 부분집합)', () => {
  it('"/(.*)"는 루트와 모든 경로에 맞는다', () => {
    for (const p of ['/', '/a', '/a/b/c.html', '/en/work/x/'])
      expect(matchSource('/(.*)', p)).not.toBeNull();
  });
  it('"/:path*"는 0개 이상 세그먼트', () => {
    expect(matchSource('/:path*', '/')).not.toBeNull();
    expect(matchSource('/:path*', '/a/b')).toEqual({ path: 'a/b' });
  });
  it('"/html/:path*"는 /html 아래만', () => {
    for (const p of ['/html', '/html/', '/html/atom/', '/html/a/b.html']) {
      expect(matchSource('/html/:path*', p), p).not.toBeNull();
    }
    for (const p of ['/htmlx/', '/work/html/', '/'])
      expect(matchSource('/html/:path*', p), p).toBeNull();
  });
  it('음의 전방탐색 그룹: "/((?!html(?:/|$)).*)"', () => {
    const s = '/((?!html(?:/|$)).*)';
    for (const p of ['/', '/work/oyedu/', '/en/', '/htmlx/', '/robots.txt'])
      expect(matchSource(s, p), p).not.toBeNull();
    for (const p of ['/html', '/html/', '/html/atom/', '/html/atom/index.html'])
      expect(matchSource(s, p), p).toBeNull();
  });
  it('리터럴은 대소문자를 구분하고 끝 슬래시는 있어도 없어도 된다(비엄격)', () => {
    expect(matchSource('/portfolio/oyedu/', '/portfolio/oyedu/')).not.toBeNull();
    expect(matchSource('/portfolio/oyedu', '/portfolio/oyedu/')).not.toBeNull();
    expect(matchSource('/portfolio/oyedu', '/Portfolio/oyedu')).toBeNull();
    // 리터럴이 슬래시로 끝나면 슬래시 없는 경로에는 맞지 않는다: 그래서 두 형태를 모두 둔다.
    expect(matchSource('/portfolio/oyedu/', '/portfolio/oyedu')).toBeNull();
  });
  it('이름 있는 매개변수는 한 세그먼트', () => {
    expect(matchSource('/posts/:id', '/posts/12')).toEqual({ id: '12' });
    expect(matchSource('/posts/:id', '/posts/12/x')).toBeNull();
    expect(matchSource('/posts/:id(\\d+)', '/posts/ab')).toBeNull();
  });
  it('루트 "/"는 루트에만', () => {
    expect(matchSource('/', '/')).not.toBeNull();
    expect(matchSource('/', '/x/')).toBeNull();
  });
});

describe('redirectFor / headersFor', () => {
  const config: VercelConfig = {
    trailingSlash: true,
    redirects: [
      { source: '/old/:slug', destination: '/new/:slug/', statusCode: 301 },
      { source: '/', has: [{ type: 'query', key: 'p' }], destination: '/', statusCode: 301 },
    ],
    headers: [
      { source: '/(.*)', headers: [{ key: 'A', value: '1' }] },
      {
        source: '/x/:p*',
        headers: [
          { key: 'A', value: '2' },
          { key: 'B', value: 'b' },
        ],
      },
    ],
  };
  it('매개변수를 목적지에 대입한다', () => {
    expect(redirectFor(config, { path: '/old/foo' })).toMatchObject({
      status: 301,
      location: '/new/foo/',
    });
  });
  it('has(query)는 키가 있을 때만', () => {
    expect(redirectFor(config, { path: '/', query: new URLSearchParams('p=1') })?.status).toBe(301);
    expect(redirectFor(config, { path: '/', query: new URLSearchParams('q=1') })).toBeNull();
    expect(redirectFor(config, { path: '/' })).toBeNull();
  });
  it('trailingSlash: 확장자 없는 경로만 308, 파일 경로는 그대로', () => {
    expect(redirectFor(config, { path: '/about' })).toMatchObject({
      status: 308,
      location: '/about/',
    });
    expect(redirectFor(config, { path: '/robots.txt' })).toBeNull();
    expect(redirectFor(config, { path: '/a/styles.css' })).toBeNull();
    expect(redirectFor(config, { path: '/about/' })).toBeNull();
  });
  it('헤더는 맞는 규칙을 합치고 같은 이름은 뒤가 이긴다', () => {
    expect(headersFor(config, '/y/')).toEqual({ a: '1' });
    expect(headersFor(config, '/x/q/')).toEqual({ a: '2', b: 'b' });
    expect(matchingHeaderRules(config, '/x/q/')).toHaveLength(2);
  });
});
