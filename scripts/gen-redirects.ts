/**
 * vercel.json의 `redirects`만 src/content/projects/*.json에서 다시 쓴다(결정적). 다른 키는 그대로 둔다.
 * 사용: pnpm exec tsx scripts/gen-redirects.ts [--check]
 *   --check: 파일을 쓰지 않고, 최신이 아니면 종료 코드 1.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildRedirects, readLegacyProjects } from './lib/redirects';

const root = join(import.meta.dirname, '..');
const file = join(root, 'vercel.json');
const config = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
config.redirects = buildRedirects(readLegacyProjects(join(root, 'src/content/projects')));
const next = `${JSON.stringify(config, null, 2)}\n`;

if (process.argv.includes('--check')) {
  if (readFileSync(file, 'utf8') !== next) {
    console.error(
      'vercel.json의 redirects가 최신이 아닙니다: pnpm exec tsx scripts/gen-redirects.ts',
    );
    process.exit(1);
  }
  console.log('redirects up to date');
} else {
  writeFileSync(file, next);
  console.log(`redirects: ${(config.redirects as unknown[]).length}`);
}
