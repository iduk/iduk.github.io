import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dist = process.env.DIST_DIR ?? join(import.meta.dirname, '../../dist');

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    // /html/* 은 Astro가 만든 페이지가 아니라 그대로 복사한 정적 데모다. 데모 전용 CSP는 vercel.json 헤더(vercel-config.test.ts)에서 시험한다.
    if (dir === dist && name === 'html') return [];
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

// Requires `pnpm build` first; skipped when dist/ is absent.
describe.skipIf(!existsSync(dist))('CSP covers every inline script in dist', () => {
  for (const file of existsSync(dist) ? htmlFiles(dist) : []) {
    it(file.slice(dist.length), () => {
      const html = readFileSync(file, 'utf8');
      const csp = html.match(/http-equiv="content-security-policy" content="([^"]*)"/)?.[1] ?? '';
      expect(csp).toContain('script-src');
      // security.csp.directives: 해시가 필요 없는 지시어도 meta에 들어간다. frame-ancestors는 meta에서 무시되므로 넣지 않는다.
      const dirs = csp.split(';').map((d) => d.trim());
      for (const d of [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ]) {
        expect(dirs, d).toContain(d);
      }
      expect(csp).not.toContain('frame-ancestors');
      const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
      expect(scriptSrc).not.toContain('unsafe-inline');
      const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
      for (const [, attrs, body] of scripts) {
        if (/\bsrc=/.test(attrs)) continue; // external: covered by 'self'
        const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
        expect(scriptSrc, `inline script not hashed: ${body.slice(0, 40)}`).toContain(hash);
      }
      // Every inline <style> must be hashed in this page's style-src.
      const styleSrc = csp.split(';').find((d) => d.trim().startsWith('style-src')) ?? '';
      expect(styleSrc).not.toContain('unsafe-inline');
      for (const [, attrs, body] of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)) {
        const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
        expect(styleSrc, `inline style not hashed (${attrs}): ${body.slice(0, 40)}`).toContain(
          hash,
        );
      }
      // The CSP meta must precede every inline script so it is enforced for them.
      const cspAt = html.indexOf('content-security-policy');
      for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
        if (!/\bsrc=/.test(m[1]) && m.index !== undefined) expect(cspAt).toBeLessThan(m.index);
      }
    });
  }
});
