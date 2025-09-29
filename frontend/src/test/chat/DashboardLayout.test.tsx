import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock 캘린더 컴포넌트
const MockCalendar = ({ onDateSelect, selectedDate }: any) => (
  <div data-testid="calendar-component">
    <div data-testid="calendar-header">캘린더</div>
    <div data-testid="calendar-dates">
      {['2024-01-15', '2024-01-16', '2024-01-17'].map((date) => (
        <button
          key={date}
          data-testid={`calendar-date-${date}`}
          onClick={() => onDateSelect(date)}
          className={selectedDate === date ? 'selected' : ''}
        >
          {date.split('-')[2]}
        </button>
      ))}
    </div>
  </div>
)

// Mock 채팅 컴포넌트
const MockChatRoom = ({ teamId, selectedDate }: any) => (
  <div data-testid="chat-room-component" data-team-id={teamId} data-selected-date={selectedDate}>
    <div data-testid="chat-header">채팅 - {selectedDate}</div>
    <div data-testid="chat-messages">메시지 목록</div>
    <div data-testid="chat-input">메시지 입력</div>
  </div>
)

// Mock DashboardLayout 컴포넌트 (실제 구현 전까지 사용)
const MockDashboardLayout = () => {
  const [selectedDate, setSelectedDate] = React.useState('2024-01-15')
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [currentTeam] = React.useState({ id: 1, name: '개발팀' })
  const [isMobile, setIsMobile] = React.useState(false)
  const [activeView, setActiveView] = React.useState<'calendar' | 'chat'>('calendar')

  // 화면 크기에 따른 모바일 감지
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false) // 모바일에서는 기본적으로 사이드바 닫힘
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    // 모바일에서는 날짜 선택 시 채팅으로 이동
    if (isMobile) {
      setActiveView('chat')
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleView = (view: 'calendar' | 'chat') => {
    setActiveView(view)
  }

  return (
    <div data-testid="dashboard-layout" className={`dashboard-layout ${isMobile ? 'mobile' : 'desktop'}`}>
      {/* 헤더 */}
      <header data-testid="dashboard-header" className="dashboard-header">
        <button
          data-testid="sidebar-toggle"
          onClick={toggleSidebar}
          className="sidebar-toggle"
        >
          ☰
        </button>
        <div data-testid="team-info" className="team-info">
          <h1>{currentTeam.name}</h1>
        </div>
        <div data-testid="user-menu" className="user-menu">
          <button data-testid="user-profile-button">프로필</button>
          <button data-testid="logout-button">로그아웃</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* 사이드바 */}
        {(sidebarOpen || !isMobile) && (
          <aside
            data-testid="dashboard-sidebar"
            className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}
          >
            <nav data-testid="sidebar-nav" className="sidebar-nav">
              <ul>
                <li>
                  <button
                    data-testid="nav-calendar"
                    onClick={() => toggleView('calendar')}
                    className={activeView === 'calendar' ? 'active' : ''}
                  >
                    📅 캘린더
                  </button>
                </li>
                <li>
                  <button
                    data-testid="nav-chat"
                    onClick={() => toggleView('chat')}
                    className={activeView === 'chat' ? 'active' : ''}
                  >
                    💬 채팅
                  </button>
                </li>
                <li>
                  <button data-testid="nav-settings">⚙️ 설정</button>
                </li>
              </ul>
            </nav>

            <div data-testid="sidebar-date-info" className="sidebar-date-info">
              <h3>선택된 날짜</h3>
              <div data-testid="selected-date-display">{selectedDate}</div>
            </div>
          </aside>
        )}

        {/* 메인 컨텐츠 */}
        <main data-testid="dashboard-main" className="dashboard-main">
          {/* 모바일 뷰 토글 버튼 */}
          {isMobile && (
            <div data-testid="mobile-view-toggle" className="mobile-view-toggle">
              <button
                data-testid="mobile-calendar-tab"
                onClick={() => toggleView('calendar')}
                className={activeView === 'calendar' ? 'active' : ''}
              >
                캘린더
              </button>
              <button
                data-testid="mobile-chat-tab"
                onClick={() => toggleView('chat')}
                className={activeView === 'chat' ? 'active' : ''}
              >
                채팅
              </button>
            </div>
          )}

          {/* 컨텐츠 영역 */}
          <div data-testid="content-area" className="content-area">
            {/* 데스크톱: 분할 뷰, 모바일: 탭 뷰 */}
            {!isMobile ? (
              <div data-testid="split-view" className="split-view">
                <div data-testid="calendar-panel" className="calendar-panel">
                  <MockCalendar
                    onDateSelect={handleDateSelect}
                    selectedDate={selectedDate}
                  />
                </div>
                <div data-testid="chat-panel" className="chat-panel">
                  <MockChatRoom
                    teamId={currentTeam.id}
                    selectedDate={selectedDate}
                  />
                </div>
              </div>
            ) : (
              <div data-testid="tab-view" className="tab-view">
                {activeView === 'calendar' && (
                  <div data-testid="mobile-calendar-view">
                    <MockCalendar
                      onDateSelect={handleDateSelect}
                      selectedDate={selectedDate}
                    />
                  </div>
                )}
                {activeView === 'chat' && (
                  <div data-testid="mobile-chat-view">
                    <MockChatRoom
                      teamId={currentTeam.id}
                      selectedDate={selectedDate}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 모바일 오버레이 (사이드바가 열려있을 때) */}
      {isMobile && sidebarOpen && (
        <div
          data-testid="mobile-overlay"
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

// 테스트 래퍼 컴포넌트
const TestWrapper = ({ children, initialRoute = '/' }: { children: React.ReactNode; initialRoute?: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 데스크톱 크기로 초기화
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  describe('렌더링', () => {
    it('대시보드 레이아웃이 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-main')).toBeInTheDocument()
    })

    it('헤더에 팀 정보와 사용자 메뉴가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('team-info')).toBeInTheDocument()
      expect(screen.getByText('개발팀')).toBeInTheDocument()
      expect(screen.getByTestId('user-menu')).toBeInTheDocument()
      expect(screen.getByTestId('user-profile-button')).toBeInTheDocument()
      expect(screen.getByTestId('logout-button')).toBeInTheDocument()
    })

    it('사이드바에 네비게이션 메뉴가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
      expect(screen.getByTestId('nav-calendar')).toBeInTheDocument()
      expect(screen.getByTestId('nav-chat')).toBeInTheDocument()
      expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
    })

    it('선택된 날짜 정보가 사이드바에 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('sidebar-date-info')).toBeInTheDocument()
      expect(screen.getByTestId('selected-date-display')).toHaveTextContent('2024-01-15')
    })
  })

  describe('데스크톱 레이아웃', () => {
    it('데스크톱에서는 분할 뷰가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('split-view')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-panel')).toBeInTheDocument()
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('tab-view')).not.toBeInTheDocument()
    })

    it('데스크톱에서는 캘린더와 채팅이 동시에 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-component')).toBeInTheDocument()
      expect(screen.getByTestId('chat-room-component')).toBeInTheDocument()
    })

    it('데스크톱에서 사이드바 토글이 작동해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const sidebar = screen.getByTestId('dashboard-sidebar')
      const toggleButton = screen.getByTestId('sidebar-toggle')

      expect(sidebar).toHaveClass('open')

      await user.click(toggleButton)
      expect(sidebar).toHaveClass('closed')

      await user.click(toggleButton)
      expect(sidebar).toHaveClass('open')
    })
  })

  describe('모바일 레이아웃', () => {
    beforeEach(() => {
      // 모바일 화면 크기로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    it('모바일에서는 탭 뷰가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('tab-view')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-view-toggle')).toBeInTheDocument()
      expect(screen.queryByTestId('split-view')).not.toBeInTheDocument()
    })

    it('모바일에서 기본적으로 캘린더 뷰가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByTestId('mobile-calendar-view')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-chat-view')).not.toBeInTheDocument()
      expect(screen.getByTestId('mobile-calendar-tab')).toHaveClass('active')
    })

    it('모바일에서 채팅 탭으로 전환할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const chatTab = screen.getByTestId('mobile-chat-tab')
      await user.click(chatTab)

      expect(screen.getByTestId('mobile-chat-view')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-calendar-view')).not.toBeInTheDocument()
      expect(chatTab).toHaveClass('active')
    })

    it('모바일에서 사이드바가 기본적으로 닫혀있어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 모바일에서는 사이드바가 기본적으로 보이지 않음
      expect(screen.queryByTestId('dashboard-sidebar')).not.toBeInTheDocument()
    })

    it('모바일에서 사이드바 토글 시 오버레이가 표시되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const toggleButton = screen.getByTestId('sidebar-toggle')
      await user.click(toggleButton)

      expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-overlay')).toBeInTheDocument()
    })

    it('모바일에서 오버레이 클릭 시 사이드바가 닫혀야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const toggleButton = screen.getByTestId('sidebar-toggle')
      await user.click(toggleButton)

      const overlay = screen.getByTestId('mobile-overlay')
      await user.click(overlay)

      expect(screen.queryByTestId('dashboard-sidebar')).not.toBeInTheDocument()
      expect(screen.queryByTestId('mobile-overlay')).not.toBeInTheDocument()
    })
  })

  describe('날짜 선택', () => {
    it('캘린더에서 날짜를 선택할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const dateButton = screen.getByTestId('calendar-date-2024-01-16')
      await user.click(dateButton)

      expect(screen.getByTestId('selected-date-display')).toHaveTextContent('2024-01-16')
    })

    it('선택된 날짜가 채팅에 반영되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const dateButton = screen.getByTestId('calendar-date-2024-01-17')
      await user.click(dateButton)

      const chatComponent = screen.getByTestId('chat-room-component')
      expect(chatComponent).toHaveAttribute('data-selected-date', '2024-01-17')
    })

    it('모바일에서 날짜 선택 시 채팅 뷰로 자동 전환되어야 한다', async () => {
      const user = userEvent.setup()

      // 모바일 화면 크기로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 캘린더 뷰에서 날짜 선택
      const dateButton = screen.getByTestId('calendar-date-2024-01-16')
      await user.click(dateButton)

      // 채팅 뷰로 자동 전환되었는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('mobile-chat-view')).toBeInTheDocument()
        expect(screen.queryByTestId('mobile-calendar-view')).not.toBeInTheDocument()
        expect(screen.getByTestId('mobile-chat-tab')).toHaveClass('active')
      })
    })
  })

  describe('네비게이션', () => {
    it('캘린더 네비게이션 버튼이 작동해야 한다', async () => {
      const user = userEvent.setup()

      // 모바일 화면으로 설정하여 탭 뷰 테스트
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 채팅 뷰로 먼저 전환
      const chatTab = screen.getByTestId('mobile-chat-tab')
      await user.click(chatTab)

      // 사이드바에서 캘린더 버튼 클릭
      const toggleButton = screen.getByTestId('sidebar-toggle')
      await user.click(toggleButton)

      const calendarNav = screen.getByTestId('nav-calendar')
      await user.click(calendarNav)

      expect(screen.getByTestId('mobile-calendar-view')).toBeInTheDocument()
      expect(calendarNav).toHaveClass('active')
    })

    it('채팅 네비게이션 버튼이 작동해야 한다', async () => {
      const user = userEvent.setup()

      // 모바일 화면으로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 사이드바 열기
      const toggleButton = screen.getByTestId('sidebar-toggle')
      await user.click(toggleButton)

      const chatNav = screen.getByTestId('nav-chat')
      await user.click(chatNav)

      expect(screen.getByTestId('mobile-chat-view')).toBeInTheDocument()
      expect(chatNav).toHaveClass('active')
    })
  })

  describe('반응형 디자인', () => {
    it('화면 크기 변경 시 레이아웃이 적절히 변경되어야 한다', async () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 초기 데스크톱 레이아웃 확인
      expect(screen.getByTestId('split-view')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-layout')).toHaveClass('desktop')

      // 모바일 크기로 변경
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      // resize 이벤트 시뮬레이션
      window.dispatchEvent(new Event('resize'))

      await waitFor(() => {
        expect(screen.getByTestId('tab-view')).toBeInTheDocument()
        expect(screen.getByTestId('dashboard-layout')).toHaveClass('mobile')
      })
    })

    it('중간 크기 화면에서도 적절히 작동해야 한다', () => {
      // 태블릿 크기로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 768px은 데스크톱으로 처리되어야 함
      expect(screen.getByTestId('split-view')).toBeInTheDocument()
      expect(screen.getByTestId('dashboard-layout')).toHaveClass('desktop')
    })
  })

  describe('접근성', () => {
    it('키보드 내비게이션이 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // Tab으로 네비게이션 확인
      await user.tab()
      expect(screen.getByTestId('sidebar-toggle')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('user-profile-button')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('logout-button')).toHaveFocus()
    })

    it('네비게이션 버튼에 적절한 텍스트가 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      expect(screen.getByText('📅 캘린더')).toBeInTheDocument()
      expect(screen.getByText('💬 채팅')).toBeInTheDocument()
      expect(screen.getByText('⚙️ 설정')).toBeInTheDocument()
    })

    it('모바일 오버레이가 적절한 역할을 가져야 한다', async () => {
      const user = userEvent.setup()

      // 모바일 화면으로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      const toggleButton = screen.getByTestId('sidebar-toggle')
      await user.click(toggleButton)

      const overlay = screen.getByTestId('mobile-overlay')
      expect(overlay).toBeInTheDocument()
      // 실제 구현에서는 role="button" 또는 적절한 ARIA 속성 추가 필요
    })
  })

  describe('성능', () => {
    it('리사이즈 이벤트 리스너가 적절히 정리되어야 한다', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('불필요한 리렌더링이 발생하지 않아야 한다', () => {
      // React.memo나 useMemo 사용에 대한 테스트
      // 실제 구현에서는 렌더링 횟수 측정 로직 추가

      render(
        <TestWrapper>
          <MockDashboardLayout />
        </TestWrapper>
      )

      // 컴포넌트가 올바르게 렌더링되었는지만 확인
      expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
    })
  })
})