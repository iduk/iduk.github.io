import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRedirects, readLegacyProjects } from '../../scripts/lib/redirects';
import {
  headersFor,
  matchingHeaderRules,
  redirectFor,
  type VercelConfig,
} from '../helpers/vercel-routes';

const root = join(import.meta.dirname, '../..');
const dist = process.env.DIST_DIR ?? join(root, 'dist');
const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as VercelConfig & {
  redirects: {
    source: string;
    destination: string;
    statusCode?: number;
    permanent?: boolean;
    has?: unknown[];
  }[];
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const projects = readLegacyProjects(join(root, 'src/content/projects'));

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
        expect(['source', 'destination', 'statusCode', 'has'], k).toContain(k);
    }
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
    '/404.html',
    '/robots.txt',
    '/html/atom/',
    '/html/atom/index.html',
    '/files/x.pdf',
  ];
  for (const p of probes) {
    it(`${p}: 공통 헤더 정확한 값`, () => {
      const h = headersFor(config, p);
      for (const [k, v] of Object.entries(COMMON)) expect(h[k], k).toBe(v);
    });
  }
  it('엄격한 CSP: 해시가 필요한 지시어(script-src, style-src)와 default-src를 넣지 않는다', () => {
    const csp = headersFor(config, '/work/oyedu/')['content-security-policy'];
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
  it('모든 경로에서 CSP를 내는 규칙은 정확히 하나(여러 규칙의 같은 헤더 병합 방식에 기대지 않는다)', () => {
    const paths = [
      '/',
      '/en/',
      '/work/',
      '/work/oyedu/',
      '/en/work/tag/web/',
      '/robots.txt',
      '/og/oyedu.jpg',
      '/html',
      '/html/',
      '/html/atom/',
      '/html/suwon/x/y.html',
      '/htmlx/',
      '/files/a.pdf',
      '/nope/',
    ];
    for (const p of paths) {
      const n = matchingHeaderRules(config, p).filter((r) =>
        r.headers.some((h) => h.key.toLowerCase() === 'content-security-policy'),
      ).length;
      expect(n, p).toBe(1);
      // 어떤 헤더 이름도 두 규칙에서 겹치지 않는다.
      const keys = matchingHeaderRules(config, p).flatMap((r) =>
        r.headers.map((h) => h.key.toLowerCase()),
      );
      expect(new Set(keys).size, `${p} 헤더 이름 중복`).toBe(keys.length);
    }
  });
  it('/html/*: 완화 CSP만, noindex 포함, 엄격한 CSP 없음', () => {
    for (const p of [
      '/html/atom/',
      '/html/hidea/',
      '/html/sprx/',
      '/html/suwon/',
      '/html/atom/business.html',
    ]) {
      const h = headersFor(config, p);
      expect(h['x-robots-tag']).toBe('noindex, nofollow');
      const csp = h['content-security-policy'];
      expect(csp).not.toBe(STRICT_CSP);
      const d = directives(csp);
      expect(d.get('object-src')).toEqual(["'none'"]);
      expect(d.get('base-uri')).toEqual(["'self'"]);
      expect(d.get('frame-ancestors')).toEqual(["'none'"]);
      expect(d.get('form-action')).toEqual(["'self'"]);
      expect(d.get('default-src')).toEqual(["'self'"]);
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
    }
  });
  it('/html 밖에는 noindex 헤더가 없다', () => {
    for (const p of ['/', '/en/', '/work/oyedu/', '/robots.txt']) {
      expect(headersFor(config, p)['x-robots-tag']).toBeUndefined();
    }
  });
});

describe('리다이렉트가 콘텐츠 JSON과 일치', () => {
  const rules = config.redirects;
  const legacy = projects.filter((p) => p.legacyPath);
  it('공개 글 24개 모두 옛 주소가 있다', () => {
    expect(projects).toHaveLength(24);
    expect(legacy).toHaveLength(24);
  });
  it('vercel.json의 redirects는 생성기 출력과 같다(손으로 고치지 않는다)', () => {
    expect(rules).toEqual(buildRedirects(projects));
  });
  it('모든 글이 정확히 한 번 덮이고 추가 항목이 없다', () => {
    const projectRules = rules.filter(
      (r) =>
        r.source.startsWith('/portfolio/') &&
        r.source !== '/portfolio/' &&
        r.source !== '/portfolio',
    );
    const bySlug = new Map<string, string[]>();
    for (const r of projectRules) {
      const slug = r.destination.replace(/^\/work\/|\/$/g, '');
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), r.source]);
    }
    expect([...bySlug.keys()].sort()).toEqual(projects.map((p) => p.slug).sort());
    for (const p of projects) {
      const noSlash = (p.legacyPath as string).replace(/\/$/, '');
      expect(bySlug.get(p.slug)?.sort(), p.slug).toEqual([noSlash, `${noSlash}/`].sort());
    }
    expect(projectRules).toHaveLength(48);
  });
  it('모든 리다이렉트는 301이고 permanent(308)나 임시 코드를 쓰지 않는다', () => {
    for (const r of rules) {
      expect(r.statusCode, r.source).toBe(301);
      expect(r).not.toHaveProperty('permanent');
    }
  });
  it('목적지는 사이트 안의 한글 주소(슬래시로 끝남)', () => {
    for (const r of rules)
      expect(r.destination, r.source).toMatch(/^\/(?:work\/(?:[a-z0-9-]+\/)?)?$/);
  });
  it('옛 주소 사례', () => {
    const go = (path: string) => redirectFor(config, { path });
    expect(go('/portfolio/oyedu/')).toMatchObject({ status: 301, location: '/work/oyedu/' });
    expect(go('/portfolio/oyedu')).toMatchObject({ status: 301, location: '/work/oyedu/' });
    expect(go('/portfolio/1812/')).toMatchObject({
      status: 301,
      location: '/work/jejuair-mobile/',
    });
    expect(go('/portfolio/1812')).toMatchObject({ status: 301, location: '/work/jejuair-mobile/' });
    expect(go('/portfolio/')).toMatchObject({ status: 301, location: '/work/' });
    expect(go('/portfolio')).toMatchObject({ status: 301, location: '/work/' });
  });
  it('?p=ID, ?page_id=ID는 홈으로, 그 밖의 쿼리·경로는 건드리지 않는다', () => {
    const q = (s: string, path = '/') =>
      redirectFor(config, { path, query: new URLSearchParams(s) });
    expect(q('p=1833')).toMatchObject({ status: 301, location: '/' });
    expect(q('page_id=12')).toMatchObject({ status: 301, location: '/' });
    expect(q('utm_source=x')).toBeNull();
    expect(q('p=1', '/work/')).toBeNull();
    expect(q('p=1', '/en/')).toBeNull();
  });
  it('영문 옛 주소는 없다', () => {
    expect(rules.some((r) => r.source.startsWith('/en'))).toBe(false);
  });
  it('워드프레스 경로는 리다이렉트도 헤더 예외도 없다(정적 404로 떨어진다)', () => {
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
      const r = redirectFor(config, { path: p });
      // 허용되는 이동은 trailingSlash(308, 같은 경로+슬래시)뿐이고 사이트의 다른 곳으로 가지 않는다.
      if (r) expect(r, p).toMatchObject({ status: 308, location: `${p}/` });
    }
    expect(JSON.stringify(config)).not.toMatch(/wp-|xmlrpc|\.php|rewrites/);
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
