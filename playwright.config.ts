import { defineConfig } from '@playwright/test';

const PORT = 4321;
const bin = './node_modules/.bin/astro';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 20_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
  },
  // --ignore-lock: 에이전트 환경에서 preview가 백그라운드로 빠지지 않고 이 프로세스에 묶여 있게 한다.
  // 항상 새로 빌드한 dist를 미리보기로 띄우고, 테스트가 끝나면 Playwright가 서버를 종료한다.
  webServer: {
    command: `${bin} build && ${bin} preview --ignore-lock --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
