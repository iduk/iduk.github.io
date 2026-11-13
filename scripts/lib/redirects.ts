/**
 * 옛 워드프레스 주소 → 새 주소 리다이렉트를 콘텐츠 JSON에서 만든다(순수 함수 + 읽기 도우미).
 * 상태 코드는 301. Vercel의 `permanent: true`는 308이라 쓰지 않고 `statusCode: 301`을 쓴다.
 * 슬래시 없는 옛 주소(`/portfolio/oyedu`)는 규칙을 두지 않는다: Vercel이 변환한 라우트에서 `trailingSlash`의
 * 308(`/portfolio/oyedu/`로)이 사용자 리다이렉트보다 앞서므로 그 규칙은 도달할 수 없다. 두 번 이동해 도착한다.
 * `/?p=ID`·`/?page_id=ID` → `/` 규칙도 두지 않는다: 요청 쿼리가 목적지로 전달되어 같은 규칙에 다시 맞아 무한 반복된다.
 * 정적 홈은 쿼리를 무시하고 200으로 응답하며 canonical이 `/`를 가리킨다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type LegacyProject = { slug: string; legacyPath: string | undefined };
export type Redirect = { source: string; destination: string; statusCode: 301 };

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

export function buildRedirects(projects: LegacyProject[]): Redirect[] {
  const rules: Redirect[] = [];
  for (const p of [...projects].sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (!p.legacyPath) throw new Error(`${p.slug}: legacy.path 없음`);
    if (!/^\/portfolio\/[A-Za-z0-9-]+\/$/.test(p.legacyPath)) {
      throw new Error(`${p.slug}: 예상하지 못한 legacy.path "${p.legacyPath}"`);
    }
    rules.push(permanent(p.legacyPath, `/work/${p.slug}/`));
  }
  rules.push(permanent('/portfolio/', '/'));
  // 첫 화면이 작업 목록이다. 옛 목록 주소는 첫 화면으로 보낸다.
  rules.push(permanent('/work/', '/'));
  rules.push(permanent('/en/work/', '/en/'));
  return rules;
}
