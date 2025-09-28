// tests/e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 E2E 테스트 글로벌 설정 시작...');

  // 기본 브라우저 실행으로 상태 확인
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 애플리케이션 기본 상태 확인
    const baseURL = config.webServer?.url || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

    console.log(`📋 베이스 URL 확인: ${baseURL}`);
    await page.goto(baseURL, { waitUntil: 'networkidle' });

    // 기본 페이지 로딩 확인
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ 애플리케이션 기본 로딩 확인');

    // 테스트용 인증 상태 설정 (필요한 경우)
    if (process.env.TEST_AUTH_TOKEN) {
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, process.env.TEST_AUTH_TOKEN);
      console.log('🔐 테스트 인증 토큰 설정 완료');
    }

    // 테스트 데이터 초기화 API 호출 (필요한 경우)
    if (process.env.TEST_DATA_RESET_ENDPOINT) {
      try {
        await page.request.post(process.env.TEST_DATA_RESET_ENDPOINT);
        console.log('🗂️ 테스트 데이터 초기화 완료');
      } catch (error) {
        console.warn('⚠️ 테스트 데이터 초기화 실패 (선택사항):', error);
      }
    }

    // 성능 메트릭 수집 설정
    await page.addInitScript(() => {
      // 성능 측정을 위한 전역 함수 추가
      window.__playwright_performance__ = {
        start: performance.now(),
        marks: {},
        mark: (name: string) => {
          window.__playwright_performance__.marks[name] = performance.now();
        }
      };
    });

    console.log('✅ E2E 테스트 글로벌 설정 완료');

  } catch (error) {
    console.error('❌ E2E 테스트 글로벌 설정 실패:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;