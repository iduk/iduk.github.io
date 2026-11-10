/**
 * vercel.json의 `headers`·`redirects`·`trailingSlash`를 로컬에서 평가하는 작은 해석기(테스트 전용).
 *
 * `astro preview`는 vercel.json을 적용하지 않으므로, 실제 Vercel 대신 문서에 적힌 규칙을 흉내 낸다.
 * 이것은 Vercel의 구현이 아니다. 아래 가정이 실제 배포와 다르면 S13 미리보기 배포에서만 드러난다.
 *
 *  - `source`는 path-to-regexp(v6) 문법의 부분집합: 리터럴, `:이름`, `:이름*`/`+`/`?`, `(정규식)`.
 *    대소문자를 구분하고, 끝의 슬래시는 있어도 없어도 된다(비엄격 모드). `source`는 쿼리를 뺀 경로에 맞춘다.
 *  - 사용자 `redirects`가 `trailingSlash` 이동보다 먼저 평가된다(어느 쪽이 먼저인지 문서에 없다. 두 경우 모두
 *    최종 주소가 같도록 vercel.json에 슬래시 있는/없는 `source`를 둘 다 둔다).
 *  - 리다이렉트 목적지에는 들어온 쿼리를 붙이지 않는다(문서에 명시 없음, S13에서 확인).
 *  - `headers`는 맞는 규칙 전부를 순서대로 합치고, 같은 이름이면 뒤의 값이 이긴다(문서에 명시 없음).
 *    그래서 vercel.json은 같은 이름이 겹치지 않게 규칙을 서로 배타적으로 쓴다(vercel-config.test.ts가 검사).
 *  - 응답 헤더는 리다이렉트와 404 응답에도 붙는다.
 */

export type HeaderRule = { source: string; headers: { key: string; value: string }[] };
export type Condition = {
  type: 'query' | 'header' | 'cookie' | 'host';
  key: string;
  value?: string;
};
export type RedirectRule = {
  source: string;
  destination: string;
  statusCode?: number;
  permanent?: boolean;
  has?: Condition[];
  missing?: Condition[];
};
export type VercelConfig = {
  trailingSlash?: boolean;
  headers?: HeaderRule[];
  redirects?: RedirectRule[];
  [key: string]: unknown;
};

const DELIMS = '/#?';
const escapeLiteral = (s: string) => s.replace(/[.+*?^${}()[\]|\\]/g, '\\$&');

/** path-to-regexp v6 비엄격 모드에 맞춘 정규식과 매개변수 이름. */
export function compileSource(source: string): { regex: RegExp; names: string[] } {
  const names: string[] = [];
  let out = '';
  let i = 0;
  let literal = '';
  const flush = () => {
    out += escapeLiteral(literal);
    literal = '';
  };
  const readGroup = (): string => {
    // source[i] === '('
    let depth = 0;
    let body = '';
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === '\\') {
        body += c + (source[++i] ?? '');
        continue;
      }
      if (c === '(') {
        depth++;
        if (depth === 1) continue;
      } else if (c === ')') {
        depth--;
        if (depth === 0) {
          i++;
          return body;
        }
      }
      body += c;
    }
    throw new Error(`unbalanced group in ${source}`);
  };
  while (i < source.length) {
    const c = source[i];
    if (c === '\\') {
      literal += source[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (c === ':' || c === '(') {
      let prefix = '';
      if (literal.endsWith('/')) {
        prefix = '/';
        literal = literal.slice(0, -1);
      }
      flush();
      let name = '';
      let pattern = `[^${DELIMS.replace('/', '\\/')}]+?`;
      if (c === ':') {
        i++;
        while (/[A-Za-z0-9_]/.test(source[i] ?? '')) name += source[i++];
        if (!name) throw new Error(`missing parameter name in ${source}`);
        if (source[i] === '(') pattern = readGroup();
      } else {
        pattern = readGroup();
      }
      names.push(name || String(names.length));
      const mod = /[?*+]/.test(source[i] ?? '') ? source[i++] : '';
      const pre = escapeLiteral(prefix);
      if (mod === '+' || mod === '*') {
        const inner = `(?:${pattern})(?:${pre || '\\/'}(?:${pattern}))*`;
        out += `(?:${pre}(${inner}))${mod === '*' ? '?' : ''}`;
      } else {
        out += `(?:${pre}(${pattern}))${mod === '?' ? '?' : ''}`;
      }
      continue;
    }
    literal += c;
    i++;
  }
  flush();
  return { regex: new RegExp(`^${out}[\\/#\\?]?$`), names };
}

export function matchSource(source: string, path: string): Record<string, string> | null {
  const { regex, names } = compileSource(source);
  const m = regex.exec(path);
  if (!m) return null;
  const params: Record<string, string> = {};
  names.forEach((n, idx) => {
    if (m[idx + 1] !== undefined) params[n] = m[idx + 1];
  });
  return params;
}

export type Request = { path: string; query?: URLSearchParams; headers?: Record<string, string> };

function conditionHolds(c: Condition, req: Request): boolean {
  if (c.type !== 'query')
    throw new Error(`condition type ${c.type} is not supported by the harness`);
  const value = req.query?.get(c.key);
  if (value === null || value === undefined) return false;
  return c.value === undefined || new RegExp(`^(?:${c.value})$`).test(value);
}

const hasAll = (conds: Condition[] | undefined, req: Request) =>
  (conds ?? []).every((c) => conditionHolds(c, req));
const hasNone = (conds: Condition[] | undefined, req: Request) =>
  (conds ?? []).every((c) => !conditionHolds(c, req));

export function matchingHeaderRules(config: VercelConfig, path: string): HeaderRule[] {
  return (config.headers ?? []).filter((r) => matchSource(r.source, path) !== null);
}

export function headersFor(config: VercelConfig, path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of matchingHeaderRules(config, path)) {
    for (const { key, value } of rule.headers) out[key.toLowerCase()] = value;
  }
  return out;
}

export type Redirect = { status: number; location: string; rule?: RedirectRule };

/** 사용자 redirects → trailingSlash 순서로 한 번 평가한다. 이동이 없으면 null. */
export function redirectFor(config: VercelConfig, req: Request): Redirect | null {
  for (const rule of config.redirects ?? []) {
    const params = matchSource(rule.source, req.path);
    if (!params) continue;
    if (!hasAll(rule.has, req) || !hasNone(rule.missing, req)) continue;
    const location = rule.destination.replace(/:([A-Za-z0-9_]+)/g, (_, n) => params[n] ?? '');
    return { status: rule.statusCode ?? (rule.permanent ? 308 : 307), location, rule };
  }
  if (config.trailingSlash === true && !req.path.endsWith('/')) {
    const last = req.path.slice(req.path.lastIndexOf('/') + 1);
    if (!last.includes('.')) {
      const q = req.query?.toString();
      return { status: 308, location: `${req.path}/${q ? `?${q}` : ''}` };
    }
  }
  return null;
}
