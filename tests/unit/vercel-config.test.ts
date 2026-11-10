import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRedirects, readLegacyProjects } from '../../scripts/lib/redirects';
import {
  evaluate,
  headerRoutesFor,
  type Resolution,
  resolve,
  transform,
  type VercelConfig,
} from '../helpers/vercel-routes';

const root = join(import.meta.dirname, '../..');
const dist = process.env.DIST_DIR ?? join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as VercelConfig & {
  redirects: { source: string; destination: string; statusCode?: number; permanent?: boolean }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const projects = readLegacyProjects(join(root, 'src/content/projects'));
/** Vercel 변환기가 vercel.json에서 만든 라우트(오류가 있으면 여기서 던진다). */
const routes = transform(config);

/** 정적 파일 시스템 흉내: dist가 있으면 실제 파일, 없으면 "존재한다"고 본다(404는 wp 경로 등 명시한 것만 확인). */
const exists = (pathname: string): boolean => {
  if (!existsSync(dist)) return !/wp-|\.php|nope/.test(pathname);
  const rel = pathname.replace(/^\//, '');
  const target = pathname.endsWith('/') ? join(dist, rel, 'index.html') : join(dist, rel);
  return existsSync(target) && statSync(target).isFile();
};
const go = (url: string): Resolution => resolve(routes, url, exists);

const COMMON = {
  'strict-transport-security': 'max-age=300',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
};
const STRICT_CSP =
  "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

const directives = (csp: string) =>
  new Map(
    csp
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...vals] = d.split(/\s+/);
        return [name, vals] as const;
      }),
  );

const cspOf = (r: { headers?: Record<string, string> }) =>
  Object.entries(r.headers ?? {}).find(([k]) => k.toLowerCase() === 'content-security-policy')?.[1];

describe('vercel.json 구조', () => {
  it('알려진 키만 쓴다(Vercel 스키마의 부분집합, 오타 방지)', () => {
    const top = new Set([
      '$schema',
      'framework',
      'installCommand',
      'buildCommand',
      'outputDirectory',
      'trailingSlash',
      'headers',
      'redirects',
    ]);
    for (const k of Object.keys(config)) expect(top, k).toContain(k);
    for (const h of config.headers) expect(Object.keys(h).sort()).toEqual(['headers', 'source']);
    for (const r of config.redirects) {
      for (const k of Object.keys(r))
        expect(['source', 'destination', 'statusCode'], k).toContain(k);
    }
  });
  it('Vercel 변환기가 오류 없이 받아들인다', () => {
    expect(routes.length).toBe(3 + config.redirects.length + config.headers.length);
  });
  it('trailingSlash true, cleanUrls 없음(데모의 .html 주소를 건드리지 않는다)', () => {
    expect(config.trailingSlash).toBe(true);
    expect(config).not.toHaveProperty('cleanUrls');
  });
  it('빌드 설정', () => {
    expect(config.framework).toBe('astro');
    expect(config.installCommand).toBe('pnpm install --frozen-lockfile');
    expect(config.buildCommand).toBe('pnpm build');
    expect(config.outputDirectory).toBe('dist');
  });
});

describe('보안 헤더', () => {
  const probes = [
    '/',
    '/en/',
    '/work/oyedu/',
    '/robots.txt',
    '/html/atom/',
    '/html/atom/index.html',
    '/files/x.pdf',
  ];
  for (const p of probes) {
    it(`${p}: 공통 헤더 정확한 값`, () => {
      const h = evaluate(routes, { path: p }).headers;
      for (const [k, v] of Object.entries(COMMON)) expect(h[k], k).toBe(v);
    });
  }
  it('404 응답에도 공통 헤더가 붙는다', () => {
    const r = go('/nope/');
    expect(r.finalStatus).toBe(404);
    for (const [k, v] of Object.entries(COMMON)) expect(r.headers[k], k).toBe(v);
  });
  it('엄격한 CSP: 해시가 필요한 지시어(script-src, style-src)와 default-src를 넣지 않는다', () => {
    const csp = evaluate(routes, { path: '/work/oyedu/' }).headers['content-security-policy'];
    expect(csp).toBe(STRICT_CSP);
    const d = directives(csp);
    for (const banned of [
      'script-src',
      'script-src-elem',
      'script-src-attr',
      'style-src',
      'style-src-elem',
      'style-src-attr',
      'default-src',
    ]) {
      expect(d.has(banned), banned).toBe(false);
    }
    expect(csp).not.toContain('unsafe-');
  });

  // 같은 이름의 헤더가 여러 규칙에서 올 때의 병합에 기대지 않는다: 어떤 경로든 CSP 라우트는 정확히 하나.
  const matrix = [
    '/html',
    '/html/',
    '/html/atom',
    '/html/atom/',
    '/html/atom/index.html',
    '/html/atom/business.html',
    '/html/x/y/z.css',
    '/htmlx/',
    '/html5/',
    '/',
    '/work/',
    '/en/',
    '/og/a.jpg',
    '/robots.txt',
    '/work/oyedu/',
    '/en/work/tag/web/',
    '/files/a.pdf',
    '/nope/',
    '/en/html/',
    '/work/html/',
  ];
  for (const p of matrix) {
    it(`${p}: CSP 라우트는 정확히 하나이고 올바른 것이다`, () => {
      const csps = headerRoutesFor(routes, p).filter((r) => cspOf(r));
      expect(csps, p).toHaveLength(1);
      const demo = p === '/html' || p.startsWith('/html/');
      const csp = cspOf(csps[0]) as string;
      expect(csp === STRICT_CSP, `${p} strict?`).toBe(!demo);
      const names = headerRoutesFor(routes, p).flatMap((r) =>
        Object.keys(r.headers ?? {}).map((k) => k.toLowerCase()),
      );
      expect(new Set(names).size, `${p} 헤더 이름 중복`).toBe(names.length);
      expect(
        headerRoutesFor(routes, p).some((r) => 'X-Robots-Tag' in (r.headers ?? {})),
        `${p} noindex`,
      ).toBe(demo);
    });
  }
  it('경로를 조합해 전수 점검: 엄격한 규칙과 /html 규칙은 서로 정확히 보완한다', () => {
    const seg = ['', 'html', 'htmlx', 'html5', 'atom', 'x.css', 'en', 'work', 'og', 'index.html'];
    const paths = new Set<string>(['/']);
    for (const a of seg) {
      for (const b of seg) {
        for (const c of seg) {
          const parts = [a, b, c].filter(Boolean);
          const base = `/${parts.join('/')}`;
          paths.add(base);
          paths.add(`${base}/`);
        }
      }
    }
    for (const p of paths) {
      const csps = headerRoutesFor(routes, p).filter((r) => cspOf(r));
      expect(csps, p).toHaveLength(1);
      const demo = p === '/html' || p.startsWith('/html/');
      expect(cspOf(csps[0]) === STRICT_CSP, p).toBe(!demo);
    }
  });
  it('/html/*: 완화 CSP만, noindex 포함(최종 응답 기준)', () => {
    for (const p of [
      '/html/atom/',
      '/html/hidea/',
      '/html/sprx/',
      '/html/suwon/',
      '/html/atom/business.html',
    ]) {
      const r = go(p);
      expect(r.hops, p).toEqual([]);
      const h = r.headers;
      expect(h['x-robots-tag'], p).toBe('noindex, nofollow');
      const csp = h['content-security-policy'];
      expect(csp).not.toBe(STRICT_CSP);
      const d = directives(csp);
      // 출처는 지시어별로 정확히 이 목록(03번 문서 4.2)이다. 늘릴 때는 문서와 이 표를 함께 고친다.
      expect(Object.fromEntries(d)).toEqual({
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://ajax.googleapis.com'],
        'style-src': [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://pro.fontawesome.com',
        ],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://pro.fontawesome.com'],
        'img-src': ["'self'", 'data:', 'https://images.unsplash.com'],
        'frame-src': ['https://www.youtube.com'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
      });
      expect(csp).not.toContain('unsafe-eval');
      // 와일드카드 출처 금지: `*`, `https:` 같은 스킴만, `*.host`
      for (const [, vals] of d)
        for (const v of vals) expect(v, csp).not.toMatch(/^\*|^https?:$|\*\./);
      for (const [k, v] of Object.entries(COMMON)) expect(h[k], k).toBe(v);
    }
  });
  it('/html 밖에는 noindex 헤더가 없다', () => {
    for (const p of ['/', '/en/', '/work/oyedu/', '/robots.txt', '/htmlx/']) {
      expect(evaluate(routes, { path: p }).headers['x-robots-tag'], p).toBeUndefined();
    }
  });
});

describe('리다이렉트가 콘텐츠 JSON과 일치', () => {
  const rules = config.redirects;
  it('공개 글 24개 모두 옛 주소가 있다', () => {
    expect(projects).toHaveLength(24);
    expect(projects.filter((p) => p.legacyPath)).toHaveLength(24);
  });
  it('vercel.json의 redirects는 생성기 출력과 같다(손으로 고치지 않는다)', () => {
    expect(rules).toEqual(buildRedirects(projects));
  });
  it('글 24개가 정확히 한 번씩 덮이고 /portfolio/ 하나만 더 있다(총 25개)', () => {
    expect(rules).toHaveLength(25);
    const bySlug = new Map(rules.map((r) => [r.destination, r.source]));
    for (const p of projects) expect(bySlug.get(`/work/${p.slug}/`), p.slug).toBe(p.legacyPath);
    expect(rules.find((r) => r.destination === '/work/')?.source).toBe('/portfolio/');
    expect(new Set(rules.map((r) => r.source)).size).toBe(rules.length);
  });
  it('모든 리다이렉트는 301이고 permanent(308)나 임시 코드를 쓰지 않는다', () => {
    for (const r of rules) {
      expect(r.statusCode, r.source).toBe(301);
      expect(r).not.toHaveProperty('permanent');
    }
  });
  it('목적지는 사이트 안의 한글 주소(슬래시로 끝남), 쿼리 없음', () => {
    for (const r of rules) expect(r.destination, r.source).toMatch(/^\/work\/(?:[a-z0-9-]+\/)?$/);
  });
  it('변환된 라우트에서 모든 리다이렉트 규칙에 실제로 도달한다(앞선 라우트가 가리지 않는다)', () => {
    for (const r of rules) {
      const ev = evaluate(routes, { path: r.source });
      expect(ev.redirect?.status, r.source).toBe(301);
      expect(ev.redirect?.location, r.source).toBe(r.destination);
    }
  });
  it('옛 주소 사례: 슬래시 있는 형태는 한 번, 없는 형태는 308 다음 301 두 번', () => {
    expect(go('/portfolio/oyedu/').hops).toEqual([
      { from: '/portfolio/oyedu/', status: 301, location: '/work/oyedu/' },
    ]);
    expect(go('/portfolio/oyedu').hops).toEqual([
      { from: '/portfolio/oyedu', status: 308, location: '/portfolio/oyedu/' },
      { from: '/portfolio/oyedu/', status: 301, location: '/work/oyedu/' },
    ]);
    expect(go('/portfolio/1812/').hops.at(-1)).toMatchObject({
      status: 301,
      location: '/work/jejuair-mobile/',
    });
    expect(go('/portfolio/1812').hops.map((h) => h.status)).toEqual([308, 301]);
    expect(go('/portfolio/').hops).toEqual([
      { from: '/portfolio/', status: 301, location: '/work/' },
    ]);
    expect(go('/portfolio').hops.map((h) => h.status)).toEqual([308, 301]);
    expect(go('/work/oyedu').hops).toEqual([
      { from: '/work/oyedu', status: 308, location: '/work/oyedu/' },
    ]);
  });
  it('슬래시 없는 옛 주소는 모두 최종적으로 새 주소 200에 도착한다', () => {
    for (const p of projects) {
      const bare = (p.legacyPath as string).replace(/\/$/, '');
      const r = go(bare);
      expect(r.finalUrl, p.slug).toBe(`/work/${p.slug}/`);
      expect(r.finalStatus, p.slug).toBe(200);
    }
  });
  it('/?p=ID, /?page_id=ID는 리다이렉트하지 않는다(쿼리가 전달되어 반복되기 때문). 홈이 200으로 응답한다', () => {
    for (const q of ['?p=1833', '?page_id=12', '?p=1&page_id=2', '?utm_source=x']) {
      const r = go(`/${q}`);
      expect(r.hops, q).toEqual([]);
      expect(r.finalStatus, q).toBe(200);
    }
    expect(config.redirects.some((r) => r.source === '/')).toBe(false);
  });
  it('영문 옛 주소는 없다', () => {
    expect(rules.some((r) => r.source.startsWith('/en'))).toBe(false);
  });
  it('워드프레스 경로는 정적 404로 끝난다(리다이렉트·재작성·예외 없음)', () => {
    const wp = [
      '/wp-admin',
      '/wp-admin/',
      '/wp-login.php',
      '/xmlrpc.php',
      '/wp-content/uploads/2020/a.jpg',
      '/wp-json/wp/v2/posts',
      '/index.php',
      '/phpmyadmin/',
    ];
    for (const p of wp) {
      const r = go(p);
      expect(r.finalStatus, p).toBe(404);
      // 이동은 trailingSlash의 308뿐이다.
      for (const h of r.hops) expect(h.status, p).toBe(308);
    }
    expect(JSON.stringify(config)).not.toMatch(/wp-|xmlrpc|\.php|rewrites/);
  });
});

describe('리다이렉트 반복 없음', () => {
  const samples = new Set<string>([
    '/',
    '/work/',
    '/en/',
    '/nope',
    '/nope/',
    '/html',
    '/html/atom',
    '/wp-admin',
  ]);
  for (const r of config.redirects) {
    samples.add(r.source);
    samples.add(r.source.replace(/\/$/, ''));
  }
  for (const s of [...samples]) {
    for (const q of ['', '?p=1', '?page_id=2&x=y', '?a=b']) samples.add(`${s}${q}`);
  }
  it(`표본 ${samples.size}개: 모두 3번 이내 이동으로 200/404에 끝나고 같은 주소를 반복하지 않는다`, () => {
    for (const s of samples) {
      const r = go(s);
      expect(r.hops.length, s).toBeLessThanOrEqual(3);
      expect([200, 404], s).toContain(r.finalStatus);
      const seen = [s, ...r.hops.map((h) => h.location)];
      expect(new Set(seen).size, `${s} 반복`).toBe(seen.length);
    }
  });
});

describe.skipIf(!existsSync(dist))('dist에는 금지된 것이 없다', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const f = join(dir, n);
      return statSync(f).isDirectory() ? files(f) : [f];
    });
  const all = existsSync(dist) ? files(dist) : [];
  it('security.txt, .well-known/security.txt 없음', () => {
    expect(all.filter((f) => /security\.txt$/i.test(f))).toEqual([]);
  });
  it('Astro가 만든 페이지에 Person 구조화 데이터, JSON-LD, mailto:, tel:이 없다', () => {
    for (const f of all.filter(
      (f) => f.endsWith('.html') && !f.includes(`${join(dist, 'html')}/`),
    )) {
      const t = readFileSync(f, 'utf8');
      expect(t, f).not.toMatch(/application\/ld\+json/);
      expect(t, f).not.toMatch(/"@type"\s*:\s*"Person"/);
      expect(t, f).not.toMatch(/mailto:|tel:/i);
    }
  });
  it('robots.txt: 전체 허용, /html 은 막지 않고, 사이트맵을 가리킨다', () => {
    const t = readFileSync(join(dist, 'robots.txt'), 'utf8');
    expect(t).toMatch(/^User-agent: \*$/m);
    expect(t).toMatch(/^Allow: \/$/m);
    expect(t).not.toMatch(/Disallow:\s*\S/);
    expect(t).toMatch(/^Sitemap: https:\/\/iduk\.co\.kr\/sitemap-index\.xml$/m);
  });
  it('사이트맵에 404, /html/, /files/, /og/ 가 없다', () => {
    for (const f of all.filter((f) => /sitemap.*\.xml$/.test(f))) {
      const t = readFileSync(f, 'utf8');
      expect(t, f).not.toMatch(/<loc>[^<]*(?:\/404|\/html\/|\/files\/|\/og\/)/);
    }
  });
});
