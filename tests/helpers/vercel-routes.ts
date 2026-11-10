/**
 * vercel.json을 Vercel이 쓰는 변환기(`@vercel/routing-utils`의 `getTransformedRoutes`)로 라우트 배열로 바꾸고,
 * 그 배열을 순서대로 평가하는 테스트 전용 해석기.
 *
 * 변환은 실제 Vercel 코드다(정규식, 슬래시 308 라우트의 위치, 헤더 라우트의 `continue`). 평가 순서는 Vercel의
 * 라우트 문서를 따라 직접 구현했다(아래 가정). 실제 엣지 라우터가 아니므로 S13 미리보기 배포에서 다시 확인한다.
 *
 * 평가 규칙(가정):
 *  - 라우트를 위에서부터 보고, `src` 정규식(대소문자 구분)이 경로에 맞고 `has`/`missing`이 충족되면 적용한다.
 *  - `status` 3xx + `headers.Location`이면 리다이렉트: 그 시점까지 `continue` 라우트가 모은 헤더와 함께 응답하고
 *    끝낸다. `$1` 같은 캡처는 Location에 대입한다. Location에 쿼리가 없으면 요청의 쿼리를 그대로 붙인다.
 *  - `continue: true` 라우트는 `headers`를 모으고 다음 라우트로 간다. 같은 이름은 뒤의 값이 이긴다.
 *  - `continue`가 없는 라우트(`/.well-known`)는 맞으면 평가를 멈춘다(이후 헤더 라우트는 적용되지 않는다).
 *  - 끝까지 리다이렉트가 없으면 정적 파일 시스템에서 찾고, 없으면 404. 모은 헤더는 200과 404 모두에 붙는다.
 */
import { getTransformedRoutes } from '@vercel/routing-utils';

export type Condition = { type: string; key: string; value?: string };
export type Route = {
  src?: string;
  dest?: string;
  headers?: Record<string, string>;
  status?: number;
  continue?: boolean;
  has?: Condition[];
  missing?: Condition[];
  handle?: string;
};
export type VercelConfig = Record<string, unknown>;

export function transform(config: VercelConfig): Route[] {
  const out = getTransformedRoutes(config as Parameters<typeof getTransformedRoutes>[0]);
  if (out.error) throw new Error(`getTransformedRoutes: ${out.error.message}`);
  return out.routes as Route[];
}

const lower = (h: Record<string, string>) =>
  Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));

function condition(c: Condition, query: URLSearchParams): boolean {
  if (c.type !== 'query') throw new Error(`condition ${c.type} is not supported by the harness`);
  const v = query.get(c.key);
  if (v === null) return false;
  return c.value === undefined || new RegExp(`^(?:${c.value})$`).test(v);
}

export function routeMatches(
  route: Route,
  path: string,
  query = new URLSearchParams(),
): RegExpExecArray | null {
  if (route.handle || route.src === undefined) return null;
  const m = new RegExp(route.src).exec(path);
  if (!m) return null;
  if (!(route.has ?? []).every((c) => condition(c, query))) return null;
  if ((route.missing ?? []).some((c) => condition(c, query))) return null;
  return m;
}

export type Evaluation = {
  redirect?: { status: number; location: string; route: Route };
  headers: Record<string, string>;
  /** 맞은 라우트 전부(순서대로). */
  matched: Route[];
};

export function evaluate(
  routes: Route[],
  req: { path: string; query?: URLSearchParams },
): Evaluation {
  const query = req.query ?? new URLSearchParams();
  let headers: Record<string, string> = {};
  const matched: Route[] = [];
  for (const route of routes) {
    const m = routeMatches(route, req.path, query);
    if (!m) continue;
    if (route.dest)
      throw new Error('route.dest is not supported by the harness (vercel.json has no rewrites)');
    matched.push(route);
    const status = route.status ?? 0;
    const hdr = lower(route.headers ?? {});
    if (status >= 300 && status < 400 && hdr.location) {
      let location = hdr.location.replace(/\$(\d+)/g, (_, n) => m[Number(n)] ?? '');
      const q = query.toString();
      if (q && !location.includes('?')) location += `?${q}`;
      const { location: _l, ...rest } = hdr;
      return { redirect: { status, location, route }, headers: { ...headers, ...rest }, matched };
    }
    headers = { ...headers, ...hdr };
    if (!route.continue) break;
  }
  return { headers, matched };
}

/** 이 경로에서 Content-Security-Policy를 내는 `continue` 헤더 라우트들(리다이렉트 여부와 무관하게 `src`만 본다). */
export function headerRoutesFor(routes: Route[], path: string): Route[] {
  return routes.filter((r) => r.continue && r.headers && routeMatches(r, path) !== null);
}

export type Resolution = {
  hops: { from: string; status: number; location: string }[];
  finalUrl: string;
  finalStatus: number;
  headers: Record<string, string>;
};

/** 리다이렉트를 따라가 최종 응답까지 계산한다. `exists`는 정적 파일 시스템 조회. 반복하면 오류. */
export function resolve(
  routes: Route[],
  start: string,
  exists: (pathname: string) => boolean,
  maxHops = 10,
): Resolution {
  const seen = new Set<string>();
  const hops: Resolution['hops'] = [];
  let url = new URL(start, 'http://site.test');
  for (;;) {
    const key = url.pathname + url.search;
    if (seen.has(key)) throw new Error(`redirect loop: ${[...seen, key].join(' -> ')}`);
    seen.add(key);
    if (hops.length > maxHops) throw new Error(`too many redirects from ${start}`);
    const ev = evaluate(routes, { path: url.pathname, query: url.searchParams });
    if (!ev.redirect) {
      return {
        hops,
        finalUrl: key,
        finalStatus: exists(url.pathname) ? 200 : 404,
        headers: ev.headers,
      };
    }
    hops.push({ from: key, status: ev.redirect.status, location: ev.redirect.location });
    url = new URL(ev.redirect.location, url);
  }
}
