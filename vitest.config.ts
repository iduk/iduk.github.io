import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/e2e는 Playwright(`pnpm e2e`)가 실행한다.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
});
