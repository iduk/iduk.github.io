/**
 * dist/를 정적으로 내보내면서 vercel.json의 헤더·리다이렉트를 적용하는 로컬 서버(테스트 전용).
 * 파일 해석은 Vercel의 정적 서비스와 같은 모양만 흉내 낸다: `/dir/` → `dir/index.html`, 없으면 `404.html`(상태 404).
 */
import { readFile, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, sep } from 'node:path';
import { headersFor, redirectFor, type VercelConfig } from './vercel-routes';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
};

async function fileAt(root: string, urlPath: string): Promise<string | null> {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
  const target = join(root, rel);
  if (target !== root && !target.startsWith(root + sep)) return null;
  const candidates = urlPath.endsWith('/') ? [join(target, 'index.html')] : [target];
  for (const c of candidates) {
    try {
      if ((await stat(c)).isFile()) return c;
    } catch {}
  }
  return null;
}

export type DistServer = { port: number; origin: string; close: () => Promise<void> };

export async function startDistServer(root: string, config: VercelConfig): Promise<DistServer> {
  const server: Server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const send = (status: number, extra: Record<string, string>, body?: Buffer) => {
        res.writeHead(status, { ...headersFor(config, url.pathname), ...extra });
        res.end(req.method === 'HEAD' ? undefined : body);
      };
      const redirect = redirectFor(config, { path: url.pathname, query: url.searchParams });
      if (redirect) return send(redirect.status, { location: redirect.location });
      const file = await fileAt(root, url.pathname);
      if (file) {
        const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
        return send(200, { 'content-type': type }, await readFile(file));
      }
      const notFound = await readFile(join(root, '404.html'));
      return send(404, { 'content-type': TYPES['.html'] }, notFound);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const port = (server.address() as AddressInfo).port;
  return {
    port,
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((ok) => server.close(() => ok())),
  };
}
