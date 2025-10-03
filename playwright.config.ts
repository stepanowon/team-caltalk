import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Team CalTalk E2E Tests
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  // 테스트 타임아웃 설정
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },

  // 전체 테스트 설정
  fullyParallel: false, // 순차 실행 (동시성 이슈 방지)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,

  // 리포터 설정
  reporter: [
    ['html', { outputFolder: 'tests/e2e/report' }],
    ['json', { outputFile: 'tests/e2e/results.json' }],
    ['list']
  ],

  use: {
    // 기본 URL
    baseURL: 'http://localhost:5173',

    // 스크린샷 및 비디오
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // 브라우저 설정
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 네비게이션 타임아웃
    navigationTimeout: 10000,
  },

  // 프로젝트 설정 (브라우저별 테스트)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox와 Safari는 선택적으로 활성화
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // 스크린샷 디렉토리 설정
  outputDir: 'tests/e2e/screenshots',

  // 웹 서버 설정 (옵션)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  // },
});
