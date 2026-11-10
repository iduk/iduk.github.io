/**
 * 옛 워드프레스 주소 → 새 주소 리다이렉트를 콘텐츠 JSON에서 만든다(순수 함수 + 읽기 도우미).
 * 상태 코드는 301. Vercel의 `permanent: true`는 308이라 쓰지 않고 `statusCode: 301`을 쓴다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LegacyProject = { slug: string; legacyPath: string | undefined };
export type Redirect = {
  source: string;
  destination: string;
  statusCode: 301;
  has?: { type: 'query'; key: string }[];
};

export function readLegacyProjects(dir: string): LegacyProject[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
        slug: string;
        legacy?: { path?: string };
      };
      return { slug: j.slug, legacyPath: j.legacy?.path };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const permanent = (source: string, destination: string): Redirect => ({
  source,
  destination,
  statusCode: 301,
});

/** 슬래시 있는 형태와 없는 형태를 모두 낸다(source가 슬래시로 끝나면 없는 형태에는 맞지 않기 때문). */
function both(legacyPath: string, destination: string): Redirect[] {
  const bare = legacyPath.replace(/\/$/, '');
  return [permanent(`${bare}/`, destination), permanent(bare, destination)];
}

export function buildRedirects(projects: LegacyProject[]): Redirect[] {
  const rules: Redirect[] = [];
  for (const p of [...projects].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (!p.legacyPath) throw new Error(`${p.slug}: legacy.path 없음`);
    if (!/^\/portfolio\/[A-Za-z0-9-]+\/$/.test(p.legacyPath)) {
      throw new Error(`${p.slug}: 예상하지 못한 legacy.path "${p.legacyPath}"`);
    }
    rules.push(...both(p.legacyPath, `/work/${p.slug}/`));
  }
  rules.push(...both('/portfolio/', '/work/'));
  // 옛 워드프레스 짧은 주소: /?p=ID, /?page_id=ID → 홈
  for (const key of ['p', 'page_id']) {
    rules.push({ ...permanent('/', '/'), has: [{ type: 'query', key }] });
  }
  return rules;
}
