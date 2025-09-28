// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('사용자 인증 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 기본 설정
    await page.goto('/');
  });

  test('회원가입 → 로그인 → 대시보드 접근 전체 플로우', async ({ page }) => {
    // 1. 회원가입 페이지로 이동
    await page.click('[data-testid="signup-link"]');
    await expect(page).toHaveURL('/register');

    // 2. 회원가입 폼 작성
    await page.fill('[data-testid="name-input"]', '김테스트');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="password-confirm-input"]', 'Password123!');

    // 3. 회원가입 제출
    await page.click('[data-testid="register-button"]');

    // 4. 성공 메시지 확인
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('회원가입이 완료되었습니다');

    // 5. 로그인 페이지로 이동
    await page.click('[data-testid="login-link"]');
    await expect(page).toHaveURL('/login');

    // 6. 로그인 폼 작성
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');

    // 7. 로그인 제출
    await page.click('[data-testid="login-button"]');

    // 8. 대시보드로 자동 리다이렉트 확인
    await expect(page).toHaveURL('/dashboard');

    // 9. 로그인된 사용자 정보 표시 확인
    await expect(page.locator('[data-testid="user-name"]')).toContainText('김테스트');
    await expect(page.locator('[data-testid="user-email"]')).toContainText('test@example.com');

    // 10. 네비게이션 메뉴 접근 가능 확인
    await expect(page.locator('[data-testid="dashboard-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="team-management-link"]')).toBeVisible();
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');

    // 잘못된 이메일과 비밀번호 입력
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');

    // 로그인 시도
    await page.click('[data-testid="login-button"]');

    // 에러 메시지 확인
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('이메일 또는 비밀번호가 잘못되었습니다');

    // 여전히 로그인 페이지에 있는지 확인
    await expect(page).toHaveURL('/login');
  });

  test('이메일 형식 검증', async ({ page }) => {
    await page.goto('/login');

    // 잘못된 이메일 형식 입력
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password123');

    // 로그인 버튼 클릭
    await page.click('[data-testid="login-button"]');

    // 클라이언트 사이드 검증 에러 확인
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText('올바른 이메일 주소를 입력해주세요');
  });

  test('비밀번호 강도 검증 (회원가입)', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[data-testid="name-input"]', '김테스트');
    await page.fill('[data-testid="email-input"]', 'test@example.com');

    // 약한 비밀번호 입력
    await page.fill('[data-testid="password-input"]', '123456');

    // 비밀번호 입력 필드에서 포커스 이동
    await page.press('[data-testid="password-input"]', 'Tab');

    // 비밀번호 강도 에러 메시지 확인
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toContainText('비밀번호는 최소 8자 이상이어야 합니다');

    // 비밀번호 확인 불일치
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="password-confirm-input"]', 'Password456!');

    await page.press('[data-testid="password-confirm-input"]', 'Tab');

    await expect(page.locator('[data-testid="password-confirm-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-confirm-error"]')).toContainText('비밀번호가 일치하지 않습니다');
  });

  test('로그아웃 기능', async ({ page }) => {
    // 사전 로그인
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    // 대시보드 접근 확인
    await expect(page).toHaveURL('/dashboard');

    // 사용자 메뉴 클릭
    await page.click('[data-testid="user-menu-toggle"]');
    await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();

    // 로그아웃 클릭
    await page.click('[data-testid="logout-button"]');

    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/login');

    // 사용자 정보가 더 이상 표시되지 않는지 확인
    await expect(page.locator('[data-testid="user-name"]')).not.toBeVisible();
  });

  test('보호된 라우트 접근 제어', async ({ page }) => {
    // 로그인하지 않은 상태에서 대시보드 접근 시도
    await page.goto('/dashboard');

    // 로그인 페이지로 자동 리다이렉트 확인
    await expect(page).toHaveURL('/login');

    // 팀 관리 페이지 접근 시도
    await page.goto('/teams');
    await expect(page).toHaveURL('/login');

    // 일정 페이지 접근 시도
    await page.goto('/schedules');
    await expect(page).toHaveURL('/login');
  });

  test('토큰 만료 시 자동 로그아웃', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    await expect(page).toHaveURL('/dashboard');

    // 만료된 토큰을 localStorage에 설정
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired.jwt.token');
    });

    // API 호출이 필요한 페이지로 이동
    await page.click('[data-testid="team-management-link"]');

    // 토큰 만료로 인한 자동 로그아웃 확인
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('세션이 만료되었습니다');
  });

  test('기억하기 기능 (Remember Me)', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');

    // Remember Me 체크박스 선택
    await page.check('[data-testid="remember-me-checkbox"]');

    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');

    // 페이지 새로고침 후에도 로그인 상태 유지 확인
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });

  test('소셜 로그인 버튼 표시 (UI만)', async ({ page }) => {
    await page.goto('/login');

    // 소셜 로그인 버튼들이 표시되는지 확인 (기능 구현은 향후)
    await expect(page.locator('[data-testid="google-login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="github-login-button"]')).toBeVisible();

    // 클릭 시 "준비 중" 메시지 표시
    await page.click('[data-testid="google-login-button"]');
    await expect(page.locator('[data-testid="feature-coming-soon"]')).toContainText('준비 중인 기능입니다');
  });
});

test.describe('접근성 테스트', () => {
  test('로그인 페이지 키보드 네비게이션', async ({ page }) => {
    await page.goto('/login');

    // Tab 키로 요소 간 이동
    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeFocused();

    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();

    // Enter 키로 로그인 버튼 활성화
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');

    await page.focus('[data-testid="login-button"]');
    await page.press('[data-testid="login-button"]', 'Enter');

    await expect(page).toHaveURL('/dashboard');
  });

  test('스크린 리더 지원 확인', async ({ page }) => {
    await page.goto('/login');

    // ARIA 라벨 확인
    await expect(page.locator('[data-testid="login-form"]')).toHaveAttribute('aria-label', '로그인 폼');
    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label', '이메일 주소');
    await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label', '비밀번호');

    // 에러 메시지와 연결된 aria-describedby 확인
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.press('[data-testid="email-input"]', 'Tab');

    await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-describedby', 'email-error');
    await expect(page.locator('#email-error')).toBeVisible();
  });
});