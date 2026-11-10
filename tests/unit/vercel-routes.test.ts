import { describe, expect, it } from 'vitest';
import { evaluate, type Route, resolve, transform } from '../helpers/vercel-routes';

// 평가기 자체의 시험: 합성 라우트로 규칙을, 실제 변환기 출력으로 Vercel이 만드는 모양을 확인한다.
describe('evaluate (합성 라우트)', () => {
  const routes: Route[] = [
    { src: '^/old/(.+)$', headers: { Location: '/new/$1/' }, status: 301 },
    { src: '^/$', headers: { Location: '/' }, status: 301, has: [{ type: 'query', key: 'p' }] },
    { src: '^(?:/(.*))$', headers: { A: '1' }, continue: true },
    { src: '^/x(?:/(.*))?$', headers: { A: '2', B: 'b' }, continue: true },
    { src: '^/stop$', headers: { C: 'c' } },
    { src: '^/after-stop$', headers: { D: 'd' }, continue: true },
  ];
  it('캡처를 Location에 대입한다', () => {
    expect(evaluate(routes, { path: '/old/foo' }).redirect).toMatchObject({
      status: 301,
      location: '/new/foo/',
    });
  });
  it('리다이렉트 응답에는 앞선 continue 라우트의 헤더만 붙는다(뒤의 헤더 라우트는 건너뜀)', () => {
    expect(evaluate(routes, { path: '/old/foo' }).headers).toEqual({});
  });
  it('요청 쿼리는 Location에 그대로 붙는다(쿼리 없는 Location일 때)', () => {
    const q = new URLSearchParams('p=1&z=2');
    expect(evaluate(routes, { path: '/', query: q }).redirect?.location).toBe('/?p=1&z=2');
    expect(
      evaluate([{ ...routes[0], headers: { Location: '/n/?a=b' } }], { path: '/old/x', query: q })
        .redirect?.location,
    ).toBe('/n/?a=b');
  });
  it('has(query)는 키가 있을 때만', () => {
    expect(
      evaluate(routes, { path: '/', query: new URLSearchParams('q=1') }).redirect,
    ).toBeUndefined();
    expect(evaluate(routes, { path: '/' }).redirect).toBeUndefined();
  });
  it('continue 헤더는 합쳐지고 같은 이름은 뒤가 이긴다', () => {
    expect(evaluate(routes, { path: '/y' }).headers).toEqual({ a: '1' });
    expect(evaluate(routes, { path: '/x/q' }).headers).toEqual({ a: '2', b: 'b' });
  });
  it('continue 없는 라우트는 평가를 멈춘다', () => {
    expect(evaluate(routes, { path: '/stop' }).headers).toEqual({ a: '1', c: 'c' });
    expect(evaluate(routes, { path: '/after-stop' }).headers).toEqual({ a: '1', d: 'd' });
  });
  it('resolve: 반복하는 리다이렉트는 오류', () => {
    const loop: Route[] = [
      { src: '^/a$', headers: { Location: '/b' }, status: 301 },
      { src: '^/b$', headers: { Location: '/a' }, status: 301 },
    ];
    expect(() => resolve(loop, '/a', () => true)).toThrow(/loop/);
  });
});

describe('transform (실제 @vercel/routing-utils 출력)', () => {
  const routes = transform({
    trailingSlash: true,
    redirects: [{ source: '/portfolio/oyedu/', destination: '/work/oyedu/', statusCode: 301 }],
    headers: [{ source: '/(.*)', headers: [{ key: 'X-A', value: '1' }] }],
  });
  const exists = (p: string) => p !== '/missing/';
  it('슬래시 없는 경로는 사용자 리다이렉트보다 먼저 308로 슬래시가 붙는다(두 번 이동)', () => {
    const r = resolve(routes, '/portfolio/oyedu', exists);
    expect(r.hops).toEqual([
      { from: '/portfolio/oyedu', status: 308, location: '/portfolio/oyedu/' },
      { from: '/portfolio/oyedu/', status: 301, location: '/work/oyedu/' },
    ]);
    expect(r.finalStatus).toBe(200);
  });
  it('확장자 있는 경로는 슬래시가 붙지 않고, 파일 경로의 끝 슬래시는 제거된다', () => {
    expect(evaluate(routes, { path: '/robots.txt' }).redirect).toBeUndefined();
    expect(evaluate(routes, { path: '/a/b.html/' }).redirect).toMatchObject({
      status: 308,
      location: '/a/b.html',
    });
  });
  it('헤더 라우트는 리다이렉트보다 뒤라 리다이렉트 응답에는 붙지 않고, 일반 응답과 404에는 붙는다', () => {
    expect(evaluate(routes, { path: '/portfolio/oyedu/' }).headers).toEqual({});
    expect(resolve(routes, '/', exists).headers).toEqual({ 'x-a': '1' });
    expect(resolve(routes, '/missing/', exists)).toMatchObject({
      finalStatus: 404,
      headers: { 'x-a': '1' },
    });
  });
  it('/.well-known은 첫 라우트가 평가를 멈춰 헤더가 붙지 않는다(변환기의 동작)', () => {
    expect(evaluate(routes, { path: '/.well-known/x' }).headers).toEqual({});
  });
});
