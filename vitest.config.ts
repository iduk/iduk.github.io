import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/e2e는 Playwright(`pnpm e2e`)가 실행한다.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    // 큰 입력(redos 2MB, 1600x9000 변환), dist 전체 분석, CLI 실행이 병렬로 겹쳐도 기본 5초 제한에 걸리지 않게 한다.
    // redos 시험의 1초 시간 단언(timed)은 시험 안에서 따로 재므로 약해지지 않는다. 워커를 제한해 서로 밀리는 것도 줄인다.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    maxWorkers: 4,
  },
});
