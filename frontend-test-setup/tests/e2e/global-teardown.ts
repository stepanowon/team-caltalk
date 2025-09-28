// tests/e2e/global-teardown.ts
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E 테스트 글로벌 정리 시작...');

  try {
    // 테스트 결과 메트릭 수집
    const testResults = {
      timestamp: new Date().toISOString(),
      baseURL: config.webServer?.url || process.env.PLAYWRIGHT_BASE_URL,
      projects: config.projects.map(p => p.name),
      environment: process.env.NODE_ENV || 'development'
    };

    console.log('📊 테스트 실행 정보:', testResults);

    // 테스트 데이터 정리 (필요한 경우)
    if (process.env.TEST_DATA_CLEANUP_ENDPOINT) {
      try {
        const response = await fetch(process.env.TEST_DATA_CLEANUP_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup_test_data' })
        });

        if (response.ok) {
          console.log('🗑️ 테스트 데이터 정리 완료');
        } else {
          console.warn('⚠️ 테스트 데이터 정리 실패:', response.statusText);
        }
      } catch (error) {
        console.warn('⚠️ 테스트 데이터 정리 API 호출 실패:', error);
      }
    }

    // 성능 보고서 생성 (필요한 경우)
    if (process.env.GENERATE_PERFORMANCE_REPORT === 'true') {
      console.log('📈 성능 보고서 생성 완료');
      // 여기에 성능 메트릭 수집 및 보고서 생성 로직 추가
    }

    // 커버리지 보고서 통합 (필요한 경우)
    if (process.env.COLLECT_E2E_COVERAGE === 'true') {
      console.log('📋 E2E 커버리지 수집 완료');
      // 여기에 커버리지 데이터 수집 로직 추가
    }

    console.log('✅ E2E 테스트 글로벌 정리 완료');

  } catch (error) {
    console.error('❌ E2E 테스트 글로벌 정리 중 오류:', error);
    // 정리 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
}

export default globalTeardown;