import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { headInfo } from '../helpers/head-meta';

const root = join(import.meta.dirname, '../..');
const dist = process.env.DIST_DIR ?? join(root, 'dist');
const SITE = 'https://iduk.co.kr';

function pages(dir: string, base = ''): string[] {
  return readdirSync(dir).flatMap((n) => {
    const full = join(dir, n);
    const rel = `${base}/${n}`;
    if (base === '' && ['html', 'files', '_astro', 'fonts', 'og'].includes(n)) return [];
    if (statSync(full).isDirectory()) return pages(full, rel);
    return n === 'index.html' ? [base === '' ? '/' : `${base}/`] : [];
  });
}

const project = (slug: string) =>
  JSON.parse(readFileSync(join(root, 'src/content/projects', `${slug}.json`), 'utf8')) as {
    cover: { alt: { ko: string; en: string } };
  };

describe.skipIf(!existsSync(dist))('SEO 메타 (dist의 모든 페이지)', () => {
  const urls = existsSync(dist) ? pages(dist) : [];
  const read = (url: string) => readFileSync(join(dist, url, 'index.html'), 'utf8');
  const ko = urls.filter((u) => !u.startsWith('/en/'));
  const en = urls.filter((u) => u.startsWith('/en/'));
  const enOf = (u: string) => (u === '/' ? '/en/' : `/en${u}`);

  it('페이지 수: 한글과 영문이 짝을 이룬다', () => {
    expect(ko.length).toBeGreaterThan(26);
    expect(en.map((u) => u.slice(3)).sort()).toEqual(ko.map((u) => u.replace(/^\//, '/')).sort());
    for (const u of ko) expect(existsSync(join(dist, enOf(u), 'index.html')), u).toBe(true);
  });

  for (const lang of ['ko', 'en'] as const) {
    const list = lang === 'ko' ? ko : en;
    it(`${lang}: title과 description이 페이지마다 유일하다`, () => {
      const titles = new Map<string, string>();
      const descs = new Map<string, string>();
      for (const u of list) {
        const h = headInfo(read(u));
        expect(h.title, u).not.toBe('');
        expect(h.description ?? '', u).not.toBe('');
        expect(titles.get(h.title), `title 중복 ${u} / ${titles.get(h.title)}`).toBeUndefined();
        expect(
          descs.get(h.description as string),
          `description 중복 ${u} / ${descs.get(h.description as string)}`,
        ).toBeUndefined();
        titles.set(h.title, u);
        descs.set(h.description as string, u);
      }
    });
  }

  it('한글 페이지마다 영문 쌍, 상호 hreflang, x-default는 한글, canonical은 자기 자신', () => {
    for (const u of ko) {
      const a = headInfo(read(u));
      const b = headInfo(read(enOf(u)));
      expect(a.canonical, u).toBe(`${SITE}${u}`);
      expect(b.canonical, u).toBe(`${SITE}${enOf(u)}`);
      for (const h of [a, b]) {
        expect(h.alternates.get('ko'), u).toBe(`${SITE}${u}`);
        expect(h.alternates.get('en'), u).toBe(`${SITE}${enOf(u)}`);
        expect(h.alternates.get('x-default'), u).toBe(`${SITE}${u}`);
        expect(h.alternates.size, u).toBe(3);
      }
      expect(a.lang).toBe('ko');
      expect(b.lang).toBe('en');
    }
  });

  it('열린 그래프와 트위터 카드 필수 태그', () => {
    for (const u of urls) {
      const h = headInfo(read(u));
      const m = (k: string) => h.meta.get(k);
      const lang = h.lang as 'ko' | 'en';
      expect(m('og:title'), u).toEqual([h.title]);
      expect(m('og:description'), u).toEqual([h.description]);
      expect(m('og:url'), u).toEqual([h.canonical]);
      expect(m('og:site_name'), u).toEqual(['iduk']);
      expect(['website', 'article'], u).toContain(m('og:type')?.[0]);
      expect(m('og:locale'), u).toEqual([lang === 'ko' ? 'ko_KR' : 'en_US']);
      expect(m('og:locale:alternate'), u).toEqual([lang === 'ko' ? 'en_US' : 'ko_KR']);
      expect(m('twitter:card'), u).toEqual(['summary_large_image']);
      expect(m('og:image:width'), u).toEqual(['1200']);
      expect(m('og:image:height'), u).toEqual(['630']);
      expect(m('og:image:alt')?.[0]?.trim(), u).toBeTruthy();
      expect(m('og:image')?.[0], u).toMatch(/^https:\/\/iduk\.co\.kr\/og\/[a-z0-9-]+\.jpg$/);
    }
  });

  it('상세 페이지의 og:image와 alt는 그 글의 대표 이미지(해당 언어)', () => {
    for (const u of urls.filter((u) => /\/work\/[a-z0-9-]+\/$/.test(u) && !u.includes('/tag/'))) {
      const slug = u.split('/').filter(Boolean).pop() as string;
      if (slug === 'work') continue;
      const h = headInfo(read(u));
      expect(h.meta.get('og:image')?.[0], u).toBe(`${SITE}/og/${slug}.jpg`);
      expect(h.meta.get('og:image:alt')?.[0], u).toBe(
        project(slug).cover.alt[h.lang as 'ko' | 'en'],
      );
      expect(h.meta.get('og:type')?.[0], u).toBe('article');
    }
  });

  it('OG 이미지: 모두 존재, JPEG 1200x630, 300KB 미만, 메타데이터 없음', async () => {
    const used = new Set<string>();
    for (const u of urls) used.add(headInfo(read(u)).meta.get('og:image')?.[0] as string);
    expect(used.size).toBeGreaterThanOrEqual(25); // 글 24개 + 기본 1개
    for (const url of used) {
      const file = join(dist, url.replace(SITE, ''));
      expect(existsSync(file), url).toBe(true);
      const size = statSync(file).size;
      expect(size, url).toBeLessThan(300 * 1024);
      const meta = await sharp(file).metadata();
      expect([meta.format, meta.width, meta.height], url).toEqual(['jpeg', 1200, 630]);
      expect(meta.exif, url).toBeUndefined();
      expect(meta.icc, url).toBeUndefined();
      expect(meta.xmp, url).toBeUndefined();
      expect(meta.iptc, url).toBeUndefined();
    }
  });

  it('404: noindex, canonical·hreflang·og:url 없음', () => {
    const h = headInfo(readFileSync(join(dist, '404.html'), 'utf8'));
    expect(h.robots).toBe('noindex');
    expect(h.canonical).toBeUndefined();
    expect(h.alternates.size).toBe(0);
    expect(h.meta.has('og:url')).toBe(false);
    expect(h.title).not.toBe('');
  });

  it('색인되는 페이지에는 noindex가 없다', () => {
    for (const u of urls) expect(headInfo(read(u)).robots, u).toBeUndefined();
  });
});
