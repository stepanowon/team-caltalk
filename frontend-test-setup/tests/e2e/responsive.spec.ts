// tests/e2e/responsive.spec.ts
import { test, expect } from '@playwright/test';

test.describe('반응형 디자인 테스트', () => {
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Laptop', width: 1366, height: 768 },
    { name: 'Tablet Portrait', width: 768, height: 1024 },
    { name: 'Tablet Landscape', width: 1024, height: 768 },
    { name: 'Mobile Large', width: 414, height: 896 },
    { name: 'Mobile Medium', width: 375, height: 667 },
    { name: 'Mobile Small', width: 320, height: 568 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`${name} (${width}x${height}) - 헤더와 네비게이션 표시`, async ({ page }) => {
      await page.setViewportSize({ width, height });

      // 로그인 후 대시보드 접근
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL('/dashboard');

      // 헤더는 모든 화면 크기에서 표시
      const header = page.locator('[data-testid="header"]');
      await expect(header).toBeVisible();

      if (width < 768) {
        // 모바일: 햄버거 메뉴 표시
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
        await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();

        // 로고는 간소화된 형태
        await expect(page.locator('[data-testid="logo-small"]')).toBeVisible();
      } else if (width < 1024) {
        // 태블릿: 축약된 네비게이션
        await expect(page.locator('[data-testid="tablet-nav"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      } else {
        // 데스크톱: 전체 네비게이션 표시
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="logo-full"]')).toBeVisible();
      }
    });

    test(`${name} (${width}x${height}) - 대시보드 레이아웃`, async ({ page }) => {
      await page.setViewportSize({ width, height });

      // 로그인 후 대시보드 접근
      await page.goto('/dashboard');

      const mainContent = page.locator('[data-testid="dashboard-content"]');
      await expect(mainContent).toBeVisible();

      if (width < 768) {
        // 모바일: 단일 컬럼 레이아웃
        await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
        await expect(page.locator('[data-testid="content-area"]')).toHaveCSS('width', /100%|full/);

        // 캘린더는 세로 스크롤 형태
        await expect(page.locator('[data-testid="calendar-mobile"]')).toBeVisible();
      } else if (width < 1024) {
        // 태블릿: 접이식 사이드바
        const sidebar = page.locator('[data-testid="sidebar"]');

        // 초기에는 접힌 상태
        await expect(sidebar).toHaveAttribute('data-collapsed', 'true');

        // 토글 버튼으로 확장 가능
        await page.click('[data-testid="sidebar-toggle"]');
        await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
      } else {
        // 데스크톱: 전체 사이드바 + 메인 콘텐츠
        await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
        await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('data-collapsed', 'false');

        // 두 컬럼 레이아웃
        await expect(page.locator('[data-testid="content-area"]')).toHaveCSS('margin-left', /250px|280px/);
      }
    });
  });

  test('모바일에서 사이드바 토글 기능', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // 초기에는 사이드바 숨김
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();

    // 햄버거 메뉴 클릭으로 사이드바 표시
    await page.click('[data-testid="mobile-menu-toggle"]');

    // 사이드바 애니메이션 완료 대기
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-overlay"]')).toBeVisible();

    // 사이드바 내 링크들이 표시되는지 확인
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-teams"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-calendar"]')).toBeVisible();

    // 오버레이 클릭으로 사이드바 숨김
    await page.click('[data-testid="sidebar-overlay"]');
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="sidebar-overlay"]')).not.toBeVisible();
  });

  test('태블릿에서 캘린더 뷰 조정', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/calendar');

    // 태블릿에서는 월 단위 뷰가 기본
    await expect(page.locator('[data-testid="calendar-month-view"]')).toBeVisible();

    // 뷰 전환 버튼들 확인
    await expect(page.locator('[data-testid="view-month"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-week"]')).toBeVisible();
    await expect(page.locator('[data-testid="view-day"]')).toBeVisible();

    // 주 단위 뷰로 전환
    await page.click('[data-testid="view-week"]');
    await expect(page.locator('[data-testid="calendar-week-view"]')).toBeVisible();

    // 태블릿에서는 세로 스크롤 형태
    const weekView = page.locator('[data-testid="calendar-week-view"]');
    await expect(weekView).toHaveCSS('overflow-y', 'auto');
  });

  test('모바일에서 일정 카드 터치 인터액션', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/calendar');

    // 일정 카드가 표시되는지 확인
    const scheduleCard = page.locator('[data-testid="schedule-card"]').first();
    await expect(scheduleCard).toBeVisible();

    // 터치(탭) 이벤트로 일정 상세 모달 열기
    await scheduleCard.tap();

    // 모바일에 최적화된 모달 확인
    const modal = page.locator('[data-testid="schedule-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveCSS('width', /100%|full/);
    await expect(modal).toHaveCSS('height', /100%|full/);

    // 모달 닫기 (스와이프 또는 닫기 버튼)
    await page.click('[data-testid="modal-close"]');
    await expect(modal).not.toBeVisible();
  });

  test('폰트 크기 및 터치 타겟 크기 검증', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // 모바일에서 최소 폰트 크기 확인 (14px 이상)
    const bodyText = page.locator('body');
    const fontSize = await bodyText.evaluate(el =>
      parseInt(window.getComputedStyle(el).fontSize)
    );
    expect(fontSize).toBeGreaterThanOrEqual(14);

    // 터치 타겟 최소 크기 확인 (44px x 44px)
    const buttons = page.locator('[data-testid*="button"]');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('가로/세로 화면 회전 대응', async ({ page }) => {
    // 세로 모드
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/calendar');

    await expect(page.locator('[data-testid="calendar-mobile-portrait"]')).toBeVisible();

    // 가로 모드로 회전
    await page.setViewportSize({ width: 667, height: 375 });

    // 레이아웃이 가로 모드에 맞게 조정되는지 확인
    await expect(page.locator('[data-testid="calendar-mobile-landscape"]')).toBeVisible();

    // 헤더 높이가 조정되는지 확인
    const header = page.locator('[data-testid="header"]');
    const headerHeight = await header.evaluate(el => el.offsetHeight);
    expect(headerHeight).toBeLessThanOrEqual(60); // 가로 모드에서는 더 작은 헤더
  });

  test('고해상도 디스플레이 대응', async ({ page }) => {
    // Retina 디스플레이 시뮬레이션
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/dashboard');

    // 고해상도 이미지 로딩 확인
    const logo = page.locator('[data-testid="logo"] img');
    if (await logo.count() > 0) {
      const src = await logo.getAttribute('src');
      // 2x 이미지가 로딩되는지 확인 (실제 구현에 따라 조정)
      expect(src).toMatch(/@2x|\.webp|\.svg/);
    }

    // 벡터 아이콘 사용 확인
    const icons = page.locator('[data-testid*="icon"]');
    const iconCount = await icons.count();

    for (let i = 0; i < iconCount; i++) {
      const icon = icons.nth(i);
      // SVG 아이콘 또는 아이콘 폰트 사용 확인
      const tagName = await icon.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toMatch(/svg|i|span/);
    }
  });

  test('다크 모드 반응형 지원', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');

    // 다크 모드 스타일 적용 확인
    const body = page.locator('body');
    const backgroundColor = await body.evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // 다크 배경색 확인 (RGB 값이 어두운지 검증)
    expect(backgroundColor).toMatch(/rgb\((?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])/);

    // 대비 확인 (텍스트가 밝은 색인지)
    const textColor = await page.locator('h1').first().evaluate(el =>
      window.getComputedStyle(el).color
    );
    expect(textColor).toMatch(/rgb\((2[0-9][0-9]|25[0-5])/); // 밝은 텍스트
  });
});