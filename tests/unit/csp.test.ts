import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dist = join(import.meta.dirname, '../../dist');

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
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
      const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
      expect(scriptSrc).not.toContain('unsafe-inline');
      const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
      for (const [, attrs, body] of scripts) {
        if (/\bsrc=/.test(attrs)) continue; // external: covered by 'self'
        const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
        expect(scriptSrc, `inline script not hashed: ${body.slice(0, 40)}`).toContain(hash);
      }
      // The CSP meta must precede every inline script so it is enforced for them.
      const cspAt = html.indexOf('content-security-policy');
      for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
        if (!/\bsrc=/.test(m[1]) && m.index !== undefined) expect(cspAt).toBeLessThan(m.index);
      }
    });
  }
});
