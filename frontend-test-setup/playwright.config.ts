// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* 병렬 실행 설정 */
  fullyParallel: true,
  /* CI에서 재시도 설정 */
  retries: process.env.CI ? 2 : 0,
  /* CI에서 워커 수 제한, 로컬에서는 최적화 */
  workers: process.env.CI ? 1 : undefined,
  /* 리포터 설정 */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* 공통 테스트 설정 */
  use: {
    /* 모든 테스트에서 추적 수집 (실패 시 디버깅용) */
    trace: 'on-first-retry',
    /* 스크린샷 설정 */
    screenshot: 'only-on-failure',
    /* 비디오 설정 */
    video: 'retain-on-failure',
    /* 기본 베이스 URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    /* 테스트 타임아웃 */
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  /* 다양한 브라우저 환경에서 테스트 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 모바일 테스트 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    /* 태블릿 테스트 */
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
    },
  ],

  /* 로컬 개발 서버 실행 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test'
    }
  },

  /* 글로벌 설정 */
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  /* 테스트 실행 타임아웃 */
  timeout: 30000,
  expect: {
    /* 어설션 타임아웃 */
    timeout: 5000
  },

  /* 출력 디렉토리 */
  outputDir: 'test-results/',

  /* 메타데이터 */
  metadata: {
    'test-runner': 'Playwright',
    'test-environment': process.env.NODE_ENV || 'development'
  }
});