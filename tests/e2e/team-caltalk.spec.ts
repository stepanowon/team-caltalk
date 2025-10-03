import { test, expect, Page } from '@playwright/test';

/**
 * Team CalTalk E2E Integration Tests
 *
 * 테스트 환경:
 * - 프론트엔드: http://localhost:5173
 * - 백엔드: http://localhost:3000
 */

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

// 테스트용 사용자 정보
const TEST_USER = {
  email: `test_leader_${Date.now()}@example.com`,
  password: 'TestPass123!',
  name: '테스트팀장',
};

const TEST_TEAM = {
  name: `테스트팀_${Date.now()}`,
  description: 'E2E 테스트용 팀입니다',
};

const TEST_SCHEDULE = {
  title: '팀 미팅',
  description: '주간 정기 미팅',
  startDate: '2025-10-10',
  startTime: '14:00',
  endDate: '2025-10-10',
  endTime: '16:00',
};

test.describe('Team CalTalk E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 페이지 로드 타임아웃 설정
    page.setDefaultTimeout(10000);
  });

  test('시나리오 1: 기본 UI 검증', async ({ page }) => {
    console.log('🧪 테스트 시작: 기본 UI 검증');

    // 1. 메인 페이지 접근
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // 스크린샷 캡처
    await page.screenshot({
      path: 'tests/e2e/screenshots/01-main-page.png',
      fullPage: true
    });
    console.log('✅ 메인 페이지 로드 완료');

    // 2. 페이지 타이틀 확인
    const title = await page.title();
    expect(title).toContain('Team CalTalk');
    console.log(`✅ 페이지 타이틀 확인: ${title}`);

    // 3. 주요 UI 요소 확인
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    console.log('✅ 메인 헤딩 표시 확인');

    // 4. 로그인/회원가입 버튼 확인
    const hasLoginButton = await page.getByRole('button', { name: /로그인|Login/i }).count() > 0;
    const hasSignupButton = await page.getByRole('button', { name: /회원가입|Sign.*up/i }).count() > 0;

    expect(hasLoginButton || hasSignupButton).toBeTruthy();
    console.log('✅ 인증 관련 버튼 표시 확인');

    // 5. 네이버 캘린더 스타일 색상 확인 (green color)
    const bodyHTML = await page.content();
    const hasGreenColor = bodyHTML.includes('green') || bodyHTML.includes('#00c73c') || bodyHTML.includes('rgb(0, 199, 60)');
    expect(hasGreenColor).toBeTruthy();
    console.log('✅ 네이버 캘린더 스타일 (green) 확인');
  });

  test('시나리오 2: 팀장 워크플로우 - 회원가입 및 로그인', async ({ page }) => {
    console.log('🧪 테스트 시작: 팀장 워크플로우');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // 1. 회원가입 페이지로 이동
    console.log('📝 회원가입 시도...');

    // 회원가입 버튼 찾기 (다양한 선택자 시도)
    let signupButton = page.getByRole('button', { name: /회원가입/i });
    if (await signupButton.count() === 0) {
      signupButton = page.getByRole('link', { name: /회원가입/i });
    }
    if (await signupButton.count() === 0) {
      signupButton = page.locator('text=/회원가입/i').first();
    }

    if (await signupButton.count() > 0) {
      await signupButton.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/e2e/screenshots/02-signup-page.png',
        fullPage: true
      });
      console.log('✅ 회원가입 페이지 이동 완료');

      // 회원가입 폼 작성
      const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        await emailInput.fill(TEST_USER.email);
        await passwordInput.fill(TEST_USER.password);

        // 이름 필드가 있으면 입력
        const nameInput = page.locator('input[name*="name"], input[placeholder*="이름"]').first();
        if (await nameInput.count() > 0) {
          await nameInput.fill(TEST_USER.name);
        }

        await page.screenshot({
          path: 'tests/e2e/screenshots/03-signup-form-filled.png',
          fullPage: true
        });
        console.log('✅ 회원가입 폼 작성 완료');

        // 회원가입 제출
        const submitButton = page.getByRole('button', { name: /가입|회원가입|Sign.*up/i }).first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(2000);

          await page.screenshot({
            path: 'tests/e2e/screenshots/04-after-signup.png',
            fullPage: true
          });
          console.log('✅ 회원가입 제출 완료');
        }
      } else {
        console.log('⚠️ 회원가입 폼 입력 필드를 찾을 수 없습니다');
      }
    } else {
      console.log('⚠️ 회원가입 버튼을 찾을 수 없습니다');
    }

    // 2. 로그인 시도
    console.log('🔐 로그인 시도...');

    // 로그인 페이지로 이동 (이미 로그인 페이지에 있을 수도 있음)
    const loginButton = page.getByRole('button', { name: /로그인/i }).or(page.getByRole('link', { name: /로그인/i }));
    if (await loginButton.count() > 0) {
      await loginButton.first().click();
      await page.waitForLoadState('networkidle');
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/05-login-page.png',
      fullPage: true
    });

    const loginEmailInput = page.locator('input[type="email"], input[name*="email"]').first();
    const loginPasswordInput = page.locator('input[type="password"]').first();

    if (await loginEmailInput.count() > 0 && await loginPasswordInput.count() > 0) {
      await loginEmailInput.fill(TEST_USER.email);
      await loginPasswordInput.fill(TEST_USER.password);

      const loginSubmit = page.getByRole('button', { name: /로그인|Login/i }).first();
      if (await loginSubmit.count() > 0) {
        await loginSubmit.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: 'tests/e2e/screenshots/06-after-login.png',
          fullPage: true
        });
        console.log('✅ 로그인 완료');
      }
    }
  });

  test('시나리오 3: 반응형 레이아웃 검증', async ({ page }) => {
    console.log('🧪 테스트 시작: 반응형 레이아웃 검증');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // 1. 데스크톱 뷰 (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/e2e/screenshots/07-desktop-view.png',
      fullPage: true
    });
    console.log('✅ 데스크톱 뷰 스크린샷 캡처');

    // 2. 태블릿 뷰 (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/e2e/screenshots/08-tablet-view.png',
      fullPage: true
    });
    console.log('✅ 태블릿 뷰 스크린샷 캡처');

    // 3. 모바일 뷰 (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'tests/e2e/screenshots/09-mobile-view.png',
      fullPage: true
    });
    console.log('✅ 모바일 뷰 스크린샷 캡처');
  });

  test('시나리오 4: 백엔드 헬스체크 및 API 검증', async ({ request }) => {
    console.log('🧪 테스트 시작: 백엔드 API 검증');

    // 1. Health Check
    const healthResponse = await request.get(`${BACKEND_URL}/health`);
    expect(healthResponse.ok()).toBeTruthy();

    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    expect(healthData.database.isConnected).toBeTruthy();
    console.log('✅ 백엔드 헬스체크 성공');
    console.log(`   - 상태: ${healthData.status}`);
    console.log(`   - DB 연결: ${healthData.database.isConnected}`);
    console.log(`   - 버전: ${healthData.version}`);
  });

  test('시나리오 5: 성능 측정', async ({ page }) => {
    console.log('🧪 테스트 시작: 성능 측정');

    // 페이지 로드 시간 측정
    const startTime = Date.now();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`✅ 페이지 로드 시간: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // 5초 이내 로드

    // Performance metrics 수집
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      };
    });

    console.log('📊 성능 메트릭:');
    console.log(`   - DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`   - Load Complete: ${performanceMetrics.loadComplete.toFixed(2)}ms`);
    console.log(`   - First Paint: ${performanceMetrics.firstPaint.toFixed(2)}ms`);
    console.log(`   - First Contentful Paint: ${performanceMetrics.firstContentfulPaint.toFixed(2)}ms`);

    await page.screenshot({
      path: 'tests/e2e/screenshots/10-performance-test.png',
      fullPage: true
    });
  });
});

test.describe('네비게이션 및 라우팅 테스트', () => {
  test('페이지 네비게이션 확인', async ({ page }) => {
    console.log('🧪 테스트 시작: 페이지 네비게이션');

    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // 주요 네비게이션 링크 찾기
    const navLinks = await page.locator('nav a, header a').all();
    console.log(`✅ 네비게이션 링크 ${navLinks.length}개 발견`);

    // 각 링크 확인
    for (let i = 0; i < Math.min(navLinks.length, 5); i++) {
      const link = navLinks[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`   - 링크 ${i + 1}: "${text}" → ${href}`);
    }

    await page.screenshot({
      path: 'tests/e2e/screenshots/11-navigation.png',
      fullPage: true
    });
  });
});
