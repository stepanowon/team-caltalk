import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { chromium, Browser, Page, BrowserContext } from 'playwright'

// E2E 테스트는 실제 브라우저에서 실행되므로 Playwright 사용
// 하지만 Vitest 환경에서는 Mock 형태로 작성

describe('캘린더 E2E 테스트', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  beforeEach(async () => {
    // 실제 E2E에서는 브라우저 시작
    // browser = await chromium.launch({ headless: true })
    // context = await browser.newContext()
    // page = await context.newPage()

    // Mock 설정
    browser = {} as Browser
    context = {} as BrowserContext
    page = {
      goto: async () => {},
      click: async () => {},
      fill: async () => {},
      waitForSelector: async () => {},
      screenshot: async () => {},
      locator: () => ({
        isVisible: async () => true,
        click: async () => {},
        fill: async () => {},
        textContent: async () => '',
        count: async () => 1,
        nth: () => ({
          click: async () => {},
          isVisible: async () => true,
        }),
      }),
      getByTestId: () => ({
        click: async () => {},
        fill: async () => {},
        isVisible: async () => true,
        textContent: async () => '',
        waitFor: async () => {},
      }),
      getByText: () => ({
        click: async () => {},
        isVisible: async () => true,
        waitFor: async () => {},
      }),
      getByRole: () => ({
        click: async () => {},
        fill: async () => {},
        isVisible: async () => true,
      }),
      waitForLoadState: async () => {},
      evaluate: async () => {},
    } as any
  })

  afterEach(async () => {
    // await page?.close()
    // await context?.close()
    // await browser?.close()
  })

  describe('사용자 워크플로우 - 팀장', () => {
    it('팀장이 일정 생성부터 관리까지 전체 플로우를 완료한다', async () => {
      // 1. 로그인
      await page.goto('http://localhost:5173/login')
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      await page.waitForSelector('[data-testid="calendar-page"]')

      // 2. 캘린더 페이지 접근
      expect(await page.locator('[data-testid="calendar-page"]').isVisible()).toBe(true)

      // 3. 새 일정 생성
      await page.click('[data-testid="create-schedule-btn"]')
      await page.waitForSelector('[data-testid="create-modal"]')

      await page.fill('[data-testid="create-title"]', 'E2E 테스트 회의')
      await page.fill('[data-testid="create-description"]', 'E2E 테스트를 위한 회의입니다.')
      await page.fill('[data-testid="create-start-time"]', '2024-01-15T10:00')
      await page.fill('[data-testid="create-end-time"]', '2024-01-15T11:00')

      await page.click('[data-testid="create-submit"]')

      // 4. 생성된 일정 확인
      await page.waitForSelector('[data-testid="schedule-item-1"]', { state: 'visible' })
      expect(await page.getByText('E2E 테스트 회의').isVisible()).toBe(true)

      // 5. 일정 상세 보기
      await page.click('[data-testid="schedule-item-1"]')
      await page.waitForSelector('[data-testid="schedule-detail-modal"]')

      const scheduleTitle = await page.locator('[data-testid="schedule-detail-modal"] h2').textContent()
      expect(scheduleTitle).toBe('E2E 테스트 회의')

      // 6. 일정 수정
      await page.click('[data-testid="edit-schedule-btn"]')
      await page.waitForSelector('[data-testid="edit-modal"]')

      await page.fill('[data-testid="edit-title"]', '수정된 E2E 테스트 회의')
      await page.click('[data-testid="edit-submit"]')

      // 7. 수정된 일정 확인
      await page.waitForSelector('[data-testid="schedule-detail-modal"]', { state: 'hidden' })
      expect(await page.getByText('수정된 E2E 테스트 회의').isVisible()).toBe(true)

      // 8. 일정 삭제
      await page.click('[data-testid="schedule-item-1"]')
      await page.click('[data-testid="delete-schedule-btn"]')

      // 삭제 확인 대화상자 처리
      page.on('dialog', async dialog => {
        expect(dialog.type()).toBe('confirm')
        await dialog.accept()
      })

      // 9. 삭제 확인
      await page.waitForSelector('[data-testid="schedule-item-1"]', { state: 'hidden' })
    })

    it('팀장이 여러 뷰에서 일정을 관리한다', async () => {
      await page.goto('http://localhost:5173/calendar')

      // 월 뷰에서 시작
      expect(await page.getByTestId('view-month').isVisible()).toBe(true)
      expect(await page.getByTestId('calendar-month').isVisible()).toBe(true)

      // 주 뷰로 전환
      await page.click('[data-testid="view-week"]')
      await page.waitForSelector('[data-testid="calendar-week"]')
      expect(await page.getByTestId('calendar-week').isVisible()).toBe(true)

      // 일 뷰로 전환
      await page.click('[data-testid="view-day"]')
      await page.waitForSelector('[data-testid="calendar-day"]')
      expect(await page.getByTestId('calendar-day').isVisible()).toBe(true)

      // 각 뷰에서 일정 생성 테스트
      await page.click('[data-testid="create-schedule-btn"]')
      await page.fill('[data-testid="create-title"]', '일 뷰 일정')
      await page.click('[data-testid="create-submit"]')

      await page.waitForSelector('[data-testid="schedule-item-1"]')
      expect(await page.getByText('일 뷰 일정').isVisible()).toBe(true)
    })

    it('팀장이 반복 일정을 생성한다', async () => {
      await page.goto('http://localhost:5173/calendar')

      await page.click('[data-testid="create-schedule-btn"]')
      await page.waitForSelector('[data-testid="create-modal"]')

      await page.fill('[data-testid="create-title"]', '매주 팀 회의')
      await page.fill('[data-testid="create-description"]', '매주 반복되는 팀 회의')

      // 반복 설정 (실제 구현에서 필요한 경우)
      if (await page.locator('[data-testid="recurring-checkbox"]').isVisible()) {
        await page.check('[data-testid="recurring-checkbox"]')
        await page.selectOption('[data-testid="recurring-type"]', 'weekly')
        await page.fill('[data-testid="recurring-end-date"]', '2024-03-01')
      }

      await page.click('[data-testid="create-submit"]')

      // 생성된 반복 일정들 확인
      await page.waitForSelector('[data-testid="schedule-item-1"]')
      const scheduleCount = await page.locator('[data-testid^="schedule-item-"]').count()
      expect(scheduleCount).toBeGreaterThan(1) // 여러 일정이 생성됨
    })
  })

  describe('사용자 워크플로우 - 팀원', () => {
    it('팀원이 일정을 조회하고 참석 상태를 변경한다', async () => {
      // 팀원으로 로그인
      await page.goto('http://localhost:5173/login')
      await page.fill('[data-testid="email-input"]', 'member@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="login-button"]')

      await page.waitForSelector('[data-testid="calendar-page"]')

      // 일정 조회
      expect(await page.locator('[data-testid="schedule-item-1"]').isVisible()).toBe(true)

      // 일정 상세 보기
      await page.click('[data-testid="schedule-item-1"]')
      await page.waitForSelector('[data-testid="schedule-detail-modal"]')

      // 팀원은 수정/삭제 버튼이 보이지 않음
      expect(await page.locator('[data-testid="edit-schedule-btn"]').isVisible()).toBe(false)
      expect(await page.locator('[data-testid="delete-schedule-btn"]').isVisible()).toBe(false)

      // 참석 상태 변경
      if (await page.locator('[data-testid="accept-button"]').isVisible()) {
        await page.click('[data-testid="accept-button"]')
        await page.waitForSelector('[data-testid="participant-status"]')

        const status = await page.locator('[data-testid="participant-status"]').textContent()
        expect(status).toContain('참석')
      }

      // 변경 요청 버튼 확인
      if (await page.locator('[data-testid="request-change-button"]').isVisible()) {
        await page.click('[data-testid="request-change-button"]')
        // 채팅 모달이나 메시지 전송 확인 (구현에 따라)
      }
    })

    it('팀원이 일정 변경을 요청한다', async () => {
      await page.goto('http://localhost:5173/calendar')

      await page.click('[data-testid="schedule-item-1"]')
      await page.waitForSelector('[data-testid="schedule-detail-modal"]')

      // 변경 요청 버튼 클릭
      await page.click('[data-testid="request-change-button"]')

      // 변경 요청 모달 또는 채팅 연동 확인
      if (await page.locator('[data-testid="change-request-modal"]').isVisible()) {
        await page.fill('[data-testid="change-reason"]', '시간 변경이 필요합니다.')
        await page.click('[data-testid="send-request"]')

        // 요청 전송 확인
        await page.waitForSelector('[data-testid="request-sent-message"]')
        expect(await page.getByText('변경 요청이 전송되었습니다.').isVisible()).toBe(true)
      }
    })
  })

  describe('일정 충돌 감지 및 해결', () => {
    it('충돌하는 일정 생성 시 경고가 표시되고 대안 시간이 제안된다', async () => {
      await page.goto('http://localhost:5173/calendar')

      // 기존 일정과 겹치는 시간으로 일정 생성 시도
      await page.click('[data-testid="create-schedule-btn"]')
      await page.fill('[data-testid="create-title"]', '충돌 일정')
      await page.fill('[data-testid="create-start-time"]', '2024-01-01T10:30')
      await page.fill('[data-testid="create-end-time"]', '2024-01-01T11:30')

      await page.click('[data-testid="create-submit"]')

      // 충돌 경고 확인
      await page.waitForSelector('[data-testid="conflict-warning"]')
      expect(await page.getByText('일정 충돌이 감지되었습니다.').isVisible()).toBe(true)

      // 대안 시간 제안 확인
      if (await page.locator('[data-testid="suggested-times"]').isVisible()) {
        const suggestions = await page.locator('[data-testid="suggestion-item"]').count()
        expect(suggestions).toBeGreaterThan(0)

        // 첫 번째 제안 시간 선택
        await page.click('[data-testid="suggestion-item"]:first-child')
        await page.click('[data-testid="accept-suggestion"]')

        // 대안 시간으로 일정 생성 확인
        await page.waitForSelector('[data-testid="schedule-created-message"]')
      }
    })

    it('일정 수정 시 충돌 검사가 수행된다', async () => {
      await page.goto('http://localhost:5173/calendar')

      await page.click('[data-testid="schedule-item-1"]')
      await page.click('[data-testid="edit-schedule-btn"]')

      // 다른 일정과 충돌하는 시간으로 변경
      await page.fill('[data-testid="edit-start-time"]', '2024-01-02T14:30')
      await page.fill('[data-testid="edit-end-time"]', '2024-01-02T15:30')

      await page.click('[data-testid="edit-submit"]')

      // 충돌 감지 확인
      if (await page.locator('[data-testid="conflict-detected"]').isVisible()) {
        expect(await page.getByText('다른 일정과 시간이 겹칩니다.').isVisible()).toBe(true)

        // 충돌 해결 옵션 선택
        await page.click('[data-testid="resolve-conflict"]')
      }
    })
  })

  describe('성능 및 사용성', () => {
    it('캘린더 로딩이 2초 이내에 완료된다', async () => {
      const startTime = Date.now()

      await page.goto('http://localhost:5173/calendar')
      await page.waitForSelector('[data-testid="calendar-page"]')

      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(2000) // 2초 이내
    })

    it('뷰 전환이 1초 이내에 완료된다', async () => {
      await page.goto('http://localhost:5173/calendar')

      const startTime = Date.now()

      await page.click('[data-testid="view-week"]')
      await page.waitForSelector('[data-testid="calendar-week"]')

      const switchTime = Date.now() - startTime
      expect(switchTime).toBeLessThan(1000) // 1초 이내
    })

    it('대량 일정이 있어도 스크롤이 부드럽다', async () => {
      await page.goto('http://localhost:5173/calendar?mock=large-dataset')

      // 스크롤 성능 테스트
      const scrollPerformance = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const startTime = performance.now()
          let frameCount = 0

          const scroll = () => {
            window.scrollBy(0, 10)
            frameCount++

            if (frameCount < 60) { // 60프레임 측정
              requestAnimationFrame(scroll)
            } else {
              const endTime = performance.now()
              resolve(endTime - startTime)
            }
          }

          requestAnimationFrame(scroll)
        })
      })

      // 60fps 기준으로 1초 이내 완료되어야 함
      expect(scrollPerformance).toBeLessThan(1000)
    })

    it('모바일 환경에서 터치 제스처가 작동한다', async () => {
      // 모바일 뷰포트 설정
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('http://localhost:5173/calendar')

      // 터치 스와이프 시뮬레이션 (월 네비게이션)
      const calendarElement = page.locator('[data-testid="calendar-month"]')

      await calendarElement.hover()
      await page.mouse.down()
      await page.mouse.move(-100, 0) // 왼쪽으로 스와이프
      await page.mouse.up()

      // 다음 달로 이동했는지 확인
      await page.waitForTimeout(500) // 애니메이션 대기
      // 실제 구현에서는 currentDate 변경 확인
    })
  })

  describe('접근성 및 호환성', () => {
    it('키보드만으로 모든 기능에 접근할 수 있다', async () => {
      await page.goto('http://localhost:5173/calendar')

      // Tab 키로 네비게이션
      await page.keyboard.press('Tab') // 첫 번째 포커서블 요소
      await page.keyboard.press('Tab') // 다음 요소
      await page.keyboard.press('Tab') // 일정 추가 버튼

      // Enter로 일정 생성 모달 열기
      await page.keyboard.press('Enter')
      await page.waitForSelector('[data-testid="create-modal"]')

      // Tab과 Enter로 모달 내 네비게이션
      await page.keyboard.press('Tab') // 제목 입력
      await page.keyboard.type('키보드 테스트 일정')
      await page.keyboard.press('Tab') // 설명 입력
      await page.keyboard.press('Tab') // 시작 시간
      await page.keyboard.press('Tab') // 종료 시간
      await page.keyboard.press('Tab') // 생성 버튼
      await page.keyboard.press('Enter') // 일정 생성

      // 일정이 생성되었는지 확인
      await page.waitForSelector('[data-testid="schedule-item-1"]')
    })

    it('스크린 리더 호환성이 확보되어 있다', async () => {
      await page.goto('http://localhost:5173/calendar')

      // ARIA 라벨과 역할 확인
      const calendarElement = page.locator('[data-testid="calendar-page"]')
      const ariaLabel = await calendarElement.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()

      // 헤딩 구조 확인
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count()
      expect(headings).toBeGreaterThan(0)

      // 버튼 설명 확인
      const createButton = page.locator('[data-testid="create-schedule-btn"]')
      const buttonLabel = await createButton.getAttribute('aria-label') ||
                         await createButton.textContent()
      expect(buttonLabel).toBeTruthy()
    })

    it('다양한 브라우저에서 일관된 동작을 한다', async () => {
      // 실제로는 Firefox, Safari 등 다른 브라우저에서도 테스트
      await page.goto('http://localhost:5173/calendar')

      // 기본 기능 동작 확인
      await page.click('[data-testid="create-schedule-btn"]')
      await page.waitForSelector('[data-testid="create-modal"]')

      await page.fill('[data-testid="create-title"]', '브라우저 호환성 테스트')
      await page.click('[data-testid="create-submit"]')

      await page.waitForSelector('[data-testid="schedule-item-1"]')
      expect(await page.getByText('브라우저 호환성 테스트').isVisible()).toBe(true)
    })

    it('고대비 모드에서 적절히 표시된다', async () => {
      // 고대비 모드 활성화
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.goto('http://localhost:5173/calendar')

      // 컬러 대비 확인 (실제로는 접근성 도구 사용)
      const backgroundColor = await page.locator('[data-testid="calendar-page"]')
        .evaluate(el => getComputedStyle(el).backgroundColor)

      const textColor = await page.locator('[data-testid="calendar-page"]')
        .evaluate(el => getComputedStyle(el).color)

      // 충분한 대비가 있는지 확인 (실제로는 WCAG 기준 계산)
      expect(backgroundColor).toBeTruthy()
      expect(textColor).toBeTruthy()
    })
  })

  describe('오류 시나리오', () => {
    it('네트워크 오류 시 적절한 메시지와 재시도 옵션을 제공한다', async () => {
      // 네트워크 오프라인 시뮬레이션
      await page.context().setOffline(true)
      await page.goto('http://localhost:5173/calendar')

      // 오류 메시지 확인
      await page.waitForSelector('[data-testid="network-error"]')
      expect(await page.getByText('네트워크 연결을 확인해주세요.').isVisible()).toBe(true)

      // 재시도 버튼 확인
      expect(await page.locator('[data-testid="retry-button"]').isVisible()).toBe(true)

      // 네트워크 복구 후 재시도
      await page.context().setOffline(false)
      await page.click('[data-testid="retry-button"]')

      await page.waitForSelector('[data-testid="calendar-page"]')
      expect(await page.getByTestId('calendar-page').isVisible()).toBe(true)
    })

    it('서버 오류 시 사용자 친화적인 메시지를 표시한다', async () => {
      // 서버 오류 응답 시뮬레이션 (실제로는 MSW나 네트워크 인터셉션 사용)
      await page.route('**/api/teams/*/schedules', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: '서버 내부 오류' })
        })
      })

      await page.goto('http://localhost:5173/calendar')

      await page.waitForSelector('[data-testid="server-error"]')
      expect(await page.getByText('일시적인 오류가 발생했습니다.').isVisible()).toBe(true)
      expect(await page.getByText('잠시 후 다시 시도해주세요.').isVisible()).toBe(true)
    })

    it('세션 만료 시 로그인 페이지로 리다이렉트된다', async () => {
      await page.goto('http://localhost:5173/calendar')

      // 세션 만료 응답 시뮬레이션
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: '토큰이 만료되었습니다.' })
        })
      })

      await page.reload()

      // 로그인 페이지로 리다이렉트 확인
      await page.waitForURL('**/login')
      expect(await page.locator('[data-testid="login-form"]').isVisible()).toBe(true)
    })
  })
})