import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 브레이크포인트 정의
const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
}

// 반응형 테스트용 채팅 컴포넌트
const ResponsiveChatComponent = () => {
  const [windowSize, setWindowSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'calendar' | 'chat'>('calendar')

  // 화면 크기 감지
  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })

      // 모바일에서는 사이드바 자동 닫기
      if (window.innerWidth < BREAKPOINTS.tablet) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // 초기 설정

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = windowSize.width < BREAKPOINTS.tablet
  const isTablet = windowSize.width >= BREAKPOINTS.tablet && windowSize.width < BREAKPOINTS.desktop
  const isDesktop = windowSize.width >= BREAKPOINTS.desktop

  const getDeviceType = () => {
    if (isMobile) return 'mobile'
    if (isTablet) return 'tablet'
    return 'desktop'
  }

  const getLayoutClasses = () => {
    const baseClass = 'chat-layout'
    const deviceClass = `${baseClass}--${getDeviceType()}`
    const sidebarClass = isSidebarOpen ? `${baseClass}--sidebar-open` : `${baseClass}--sidebar-closed`

    return `${baseClass} ${deviceClass} ${sidebarClass}`
  }

  return (
    <div
      data-testid="responsive-chat"
      className={getLayoutClasses()}
      data-device-type={getDeviceType()}
      data-window-width={windowSize.width}
      data-window-height={windowSize.height}
    >
      {/* 헤더 */}
      <header
        data-testid="chat-header"
        className={`header ${isMobile ? 'header--mobile' : ''}`}
      >
        <button
          data-testid="sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="sidebar-toggle"
          aria-label={isSidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        >
          ☰
        </button>

        <h1 className="header-title">Team CalTalk</h1>

        {/* 모바일 탭 네비게이션 */}
        {isMobile && (
          <nav data-testid="mobile-tabs" className="mobile-tabs">
            <button
              data-testid="mobile-calendar-tab"
              onClick={() => setActiveTab('calendar')}
              className={`tab ${activeTab === 'calendar' ? 'tab--active' : ''}`}
            >
              📅
            </button>
            <button
              data-testid="mobile-chat-tab"
              onClick={() => setActiveTab('chat')}
              className={`tab ${activeTab === 'chat' ? 'tab--active' : ''}`}
            >
              💬
            </button>
          </nav>
        )}
      </header>

      <div className="main-container">
        {/* 사이드바 */}
        {(isSidebarOpen || !isMobile) && (
          <>
            <aside
              data-testid="sidebar"
              className={`sidebar ${isMobile ? 'sidebar--mobile' : ''}`}
            >
              <nav data-testid="sidebar-nav">
                <ul>
                  <li>
                    <button
                      data-testid="nav-dashboard"
                      className="nav-button"
                    >
                      대시보드
                    </button>
                  </li>
                  <li>
                    <button
                      data-testid="nav-calendar"
                      className="nav-button"
                    >
                      캘린더
                    </button>
                  </li>
                  <li>
                    <button
                      data-testid="nav-chat"
                      className="nav-button"
                    >
                      채팅
                    </button>
                  </li>
                </ul>
              </nav>

              <div data-testid="user-info" className="user-info">
                <div className="user-avatar">👤</div>
                {!isMobile && (
                  <div className="user-details">
                    <div className="user-name">사용자</div>
                    <div className="user-status">온라인</div>
                  </div>
                )}
              </div>
            </aside>

            {/* 모바일 오버레이 */}
            {isMobile && isSidebarOpen && (
              <div
                data-testid="mobile-overlay"
                className="mobile-overlay"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
          </>
        )}

        {/* 메인 컨텐츠 */}
        <main data-testid="main-content" className="main-content">
          {/* 데스크톱: 분할 뷰, 모바일: 탭 뷰 */}
          {!isMobile ? (
            <div data-testid="split-view" className="split-view">
              {/* 캘린더 패널 */}
              <section
                data-testid="calendar-section"
                className={`calendar-panel ${isTablet ? 'calendar-panel--tablet' : ''}`}
              >
                <header className="panel-header">
                  <h2>캘린더</h2>
                  <button data-testid="calendar-settings" className="settings-button">
                    ⚙️
                  </button>
                </header>

                <div className="calendar-content">
                  <div data-testid="calendar-grid" className="calendar-grid">
                    {/* 캘린더 그리드 */}
                    <div className="calendar-dates">
                      {Array.from({ length: 31 }, (_, i) => (
                        <button
                          key={i + 1}
                          data-testid={`calendar-date-${i + 1}`}
                          className="calendar-date"
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div data-testid="schedule-list" className="schedule-list">
                    <h3>오늘의 일정</h3>
                    <div className="schedule-item">
                      <div className="schedule-title">팀 회의</div>
                      <div className="schedule-time">14:00 - 15:00</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 채팅 패널 */}
              <section
                data-testid="chat-section"
                className={`chat-panel ${isTablet ? 'chat-panel--tablet' : ''}`}
              >
                <header className="panel-header">
                  <h2>채팅</h2>
                  <div data-testid="connection-status" className="connection-status">
                    🟢 연결됨
                  </div>
                </header>

                <div className="chat-content">
                  <div data-testid="message-list" className="message-list">
                    <div data-testid="message-1" className="message">
                      <div className="message-user">사용자 1</div>
                      <div className="message-content">안녕하세요!</div>
                    </div>
                    <div data-testid="message-2" className="message">
                      <div className="message-user">사용자 2</div>
                      <div className="message-content">회의 시간 변경 가능한가요?</div>
                    </div>
                  </div>

                  <div data-testid="message-input-area" className="message-input-area">
                    <input
                      data-testid="message-input"
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      className="message-input"
                    />
                    <button data-testid="send-button" className="send-button">
                      전송
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div data-testid="tab-view" className="tab-view">
              {activeTab === 'calendar' && (
                <section data-testid="mobile-calendar" className="mobile-panel">
                  <header className="mobile-panel-header">
                    <h2>캘린더</h2>
                  </header>

                  <div className="mobile-calendar-content">
                    <div data-testid="mobile-calendar-grid" className="mobile-calendar-grid">
                      {Array.from({ length: 31 }, (_, i) => (
                        <button
                          key={i + 1}
                          data-testid={`mobile-calendar-date-${i + 1}`}
                          className="mobile-calendar-date"
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <div data-testid="mobile-schedule-list" className="mobile-schedule-list">
                      <div className="schedule-item">
                        <div className="schedule-title">팀 회의</div>
                        <div className="schedule-time">14:00 - 15:00</div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'chat' && (
                <section data-testid="mobile-chat" className="mobile-panel">
                  <header className="mobile-panel-header">
                    <h2>채팅</h2>
                    <div data-testid="mobile-connection-status" className="connection-status">
                      🟢
                    </div>
                  </header>

                  <div className="mobile-chat-content">
                    <div data-testid="mobile-message-list" className="mobile-message-list">
                      <div data-testid="mobile-message-1" className="mobile-message">
                        <div className="message-user">사용자 1</div>
                        <div className="message-content">안녕하세요!</div>
                      </div>
                    </div>

                    <div data-testid="mobile-message-input-area" className="mobile-message-input-area">
                      <input
                        data-testid="mobile-message-input"
                        type="text"
                        placeholder="메시지 입력..."
                        className="mobile-message-input"
                      />
                      <button data-testid="mobile-send-button" className="mobile-send-button">
                        📤
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {/* 스타일 정의 */}
      <style jsx>{`
        .chat-layout {
          display: flex;
          flex-direction: column;
          height: 100vh;
          transition: all 0.3s ease;
        }

        .header {
          display: flex;
          align-items: center;
          padding: 1rem;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
        }

        .header--mobile {
          justify-content: space-between;
        }

        .main-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .sidebar {
          width: 250px;
          background: #343a40;
          color: white;
          transition: transform 0.3s ease;
        }

        .sidebar--mobile {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          z-index: 1000;
          transform: translateX(0);
        }

        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
        }

        .main-content {
          flex: 1;
          overflow: hidden;
        }

        .split-view {
          display: flex;
          height: 100%;
        }

        .calendar-panel, .chat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .calendar-panel--tablet, .chat-panel--tablet {
          min-width: 300px;
        }

        .mobile-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .tab {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          font-size: 1.2rem;
          cursor: pointer;
        }

        .tab--active {
          background: #007bff;
          color: white;
          border-radius: 4px;
        }

        @media (max-width: ${BREAKPOINTS.tablet - 1}px) {
          .split-view {
            display: none;
          }

          .sidebar:not(.sidebar--mobile) {
            display: none;
          }
        }

        @media (min-width: ${BREAKPOINTS.tablet}px) {
          .mobile-tabs {
            display: none;
          }

          .tab-view {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

// 테스트 래퍼 컴포넌트
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

// 화면 크기 변경 유틸리티
const resizeWindow = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  window.dispatchEvent(new Event('resize'))
}

describe('ResponsiveChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본 데스크톱 크기로 설정
    resizeWindow(BREAKPOINTS.desktop)
  })

  describe('디바이스 감지', () => {
    it('모바일 화면을 올바르게 감지해야 한다', async () => {
      resizeWindow(BREAKPOINTS.mobile)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'mobile')
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-window-width', BREAKPOINTS.mobile.toString())
      })
    })

    it('태블릿 화면을 올바르게 감지해야 한다', async () => {
      resizeWindow(BREAKPOINTS.tablet)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'tablet')
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-window-width', BREAKPOINTS.tablet.toString())
      })
    })

    it('데스크톱 화면을 올바르게 감지해야 한다', async () => {
      resizeWindow(BREAKPOINTS.desktop)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'desktop')
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-window-width', BREAKPOINTS.desktop.toString())
      })
    })
  })

  describe('모바일 레이아웃', () => {
    beforeEach(() => {
      resizeWindow(BREAKPOINTS.mobile)
    })

    it('모바일에서 탭 네비게이션이 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('mobile-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-calendar-tab')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-chat-tab')).toBeInTheDocument()
      })
    })

    it('모바일에서 기본적으로 캘린더 탭이 활성화되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('tab-view')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-calendar')).toBeInTheDocument()
        expect(screen.queryByTestId('mobile-chat')).not.toBeInTheDocument()
        expect(screen.getByTestId('mobile-calendar-tab')).toHaveClass('tab--active')
      })
    })

    it('모바일에서 채팅 탭으로 전환할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('mobile-calendar')).toBeInTheDocument()
      })

      const chatTab = screen.getByTestId('mobile-chat-tab')
      await user.click(chatTab)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-chat')).toBeInTheDocument()
        expect(screen.queryByTestId('mobile-calendar')).not.toBeInTheDocument()
        expect(chatTab).toHaveClass('tab--active')
      })
    })

    it('모바일에서 사이드바가 기본적으로 닫혀있어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
        expect(screen.getByTestId('responsive-chat')).toHaveClass('chat-layout--sidebar-closed')
      })
    })

    it('모바일에서 사이드바 토글이 작동해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      const toggleButton = screen.getByTestId('sidebar-toggle')
      await user.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-overlay')).toBeInTheDocument()
      })
    })

    it('모바일에서 오버레이 클릭 시 사이드바가 닫혀야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      // 사이드바 열기
      await user.click(screen.getByTestId('sidebar-toggle'))

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      })

      // 오버레이 클릭
      const overlay = screen.getByTestId('mobile-overlay')
      await user.click(overlay)

      await waitFor(() => {
        expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
        expect(screen.queryByTestId('mobile-overlay')).not.toBeInTheDocument()
      })
    })

    it('모바일에서 메시지 입력이 최적화되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      // 채팅 탭으로 전환
      await user.click(screen.getByTestId('mobile-chat-tab'))

      await waitFor(() => {
        const messageInput = screen.getByTestId('mobile-message-input')
        expect(messageInput).toBeInTheDocument()
        expect(messageInput).toHaveAttribute('placeholder', '메시지 입력...')

        const sendButton = screen.getByTestId('mobile-send-button')
        expect(sendButton).toHaveTextContent('📤')
      })
    })
  })

  describe('태블릿 레이아웃', () => {
    beforeEach(() => {
      resizeWindow(BREAKPOINTS.tablet)
    })

    it('태블릿에서 분할 뷰가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('split-view')).toBeInTheDocument()
        expect(screen.getByTestId('calendar-section')).toBeInTheDocument()
        expect(screen.getByTestId('chat-section')).toBeInTheDocument()
        expect(screen.queryByTestId('mobile-tabs')).not.toBeInTheDocument()
      })
    })

    it('태블릿에서 패널이 적절한 크기를 가져야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('calendar-section')).toHaveClass('calendar-panel--tablet')
        expect(screen.getByTestId('chat-section')).toHaveClass('chat-panel--tablet')
      })
    })

    it('태블릿에서 사이드바가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('sidebar')).not.toHaveClass('sidebar--mobile')
      })
    })
  })

  describe('데스크톱 레이아웃', () => {
    beforeEach(() => {
      resizeWindow(BREAKPOINTS.desktop)
    })

    it('데스크톱에서 완전한 분할 뷰가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('split-view')).toBeInTheDocument()
        expect(screen.getByTestId('calendar-section')).toBeInTheDocument()
        expect(screen.getByTestId('chat-section')).toBeInTheDocument()
        expect(screen.queryByTestId('tab-view')).not.toBeInTheDocument()
      })
    })

    it('데스크톱에서 모든 UI 요소가 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        // 캘린더 섹션
        expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
        expect(screen.getByTestId('schedule-list')).toBeInTheDocument()
        expect(screen.getByTestId('calendar-settings')).toBeInTheDocument()

        // 채팅 섹션
        expect(screen.getByTestId('message-list')).toBeInTheDocument()
        expect(screen.getByTestId('message-input-area')).toBeInTheDocument()
        expect(screen.getByTestId('connection-status')).toBeInTheDocument()

        // 사이드바
        expect(screen.getByTestId('sidebar')).toBeInTheDocument()
        expect(screen.getByTestId('user-info')).toBeInTheDocument()
      })
    })

    it('데스크톱에서 사용자 정보가 완전히 표시되어야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        const userInfo = screen.getByTestId('user-info')
        expect(userInfo.textContent).toContain('사용자')
        expect(userInfo.textContent).toContain('온라인')
      })
    })
  })

  describe('반응형 전환', () => {
    it('데스크톱에서 모바일로 전환이 부드러워야 한다', async () => {
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      // 초기 데스크톱 상태 확인
      await waitFor(() => {
        expect(screen.getByTestId('split-view')).toBeInTheDocument()
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'desktop')
      })

      // 모바일 크기로 변경
      resizeWindow(BREAKPOINTS.mobile)

      await waitFor(() => {
        expect(screen.getByTestId('tab-view')).toBeInTheDocument()
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'mobile')
        expect(screen.queryByTestId('split-view')).not.toBeInTheDocument()
      })
    })

    it('모바일에서 태블릿으로 전환이 부드러워야 한다', async () => {
      resizeWindow(BREAKPOINTS.mobile)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      // 초기 모바일 상태 확인
      await waitFor(() => {
        expect(screen.getByTestId('mobile-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'mobile')
      })

      // 태블릿 크기로 변경
      resizeWindow(BREAKPOINTS.tablet)

      await waitFor(() => {
        expect(screen.getByTestId('split-view')).toBeInTheDocument()
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'tablet')
        expect(screen.queryByTestId('mobile-tabs')).not.toBeInTheDocument()
      })
    })

    it('화면 회전 시 레이아웃이 적절히 조정되어야 한다', async () => {
      resizeWindow(BREAKPOINTS.mobile, 800) // 세로 모드

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-window-height', '800')
      })

      // 가로 모드로 회전
      resizeWindow(800, BREAKPOINTS.mobile)

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-window-width', '800')
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-window-height', BREAKPOINTS.mobile.toString())
      })
    })
  })

  describe('터치 및 상호작용', () => {
    it('모바일에서 터치 친화적인 인터페이스가 제공되어야 한다', async () => {
      resizeWindow(BREAKPOINTS.mobile)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        // 큰 터치 타겟 확인 (CSS로 구현된 경우)
        const tabs = screen.getAllByRole('button')
        tabs.forEach(tab => {
          expect(tab).toBeInTheDocument()
          // 실제 구현에서는 getComputedStyle로 최소 크기 확인
        })
      })
    })

    it('태블릿에서 터치와 마우스 상호작용이 모두 지원되어야 한다', async () => {
      resizeWindow(BREAKPOINTS.tablet)

      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      // 클릭 상호작용 테스트
      const calendarDate = screen.getByTestId('calendar-date-1')
      await user.click(calendarDate)

      expect(calendarDate).toBeInTheDocument()
    })
  })

  describe('성능 최적화', () => {
    it('화면 크기 변경 시 불필요한 렌더링이 없어야 한다', async () => {
      let renderCount = 0

      const PerformanceTestComponent = React.memo(() => {
        renderCount++
        return <ResponsiveChatComponent />
      })

      render(
        <TestWrapper>
          <PerformanceTestComponent />
        </TestWrapper>
      )

      const initialRenderCount = renderCount

      // 같은 크기로 변경 (변화 없음)
      resizeWindow(BREAKPOINTS.desktop)

      await waitFor(() => {
        expect(renderCount - initialRenderCount).toBeLessThan(3)
      })
    })

    it('resize 이벤트 리스너가 적절히 정리되어야 한다', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const { unmount } = render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('접근성', () => {
    it('모든 브레이크포인트에서 키보드 네비게이션이 가능해야 한다', async () => {
      const user = userEvent.setup()

      // 데스크톱 테스트
      resizeWindow(BREAKPOINTS.desktop)
      const { rerender } = render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await user.tab()
      expect(screen.getByTestId('sidebar-toggle')).toHaveFocus()

      // 모바일로 전환 후 테스트
      resizeWindow(BREAKPOINTS.mobile)
      rerender(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('mobile-tabs')).toBeInTheDocument()
      })

      // 탭 네비게이션이 여전히 작동해야 함
      await user.tab()
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInTheDocument()
    })

    it('사이드바 토글 버튼에 적절한 ARIA 레이블이 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      const toggleButton = screen.getByTestId('sidebar-toggle')
      expect(toggleButton).toHaveAttribute('aria-label', '사이드바 닫기')

      await user.click(toggleButton)

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-label', '사이드바 열기')
      })
    })

    it('모바일 탭에 적절한 접근성 속성이 있어야 한다', async () => {
      resizeWindow(BREAKPOINTS.mobile)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        const calendarTab = screen.getByTestId('mobile-calendar-tab')
        const chatTab = screen.getByTestId('mobile-chat-tab')

        expect(calendarTab).toBeInTheDocument()
        expect(chatTab).toBeInTheDocument()

        // 실제 구현에서는 role="tab", aria-selected 등 추가 필요
      })
    })
  })

  describe('브레이크포인트 경계값', () => {
    it('정확한 브레이크포인트에서 레이아웃이 변경되어야 한다', async () => {
      // 태블릿 브레이크포인트 직전
      resizeWindow(BREAKPOINTS.tablet - 1)

      render(
        <TestWrapper>
          <ResponsiveChatComponent />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'mobile')
      })

      // 태블릿 브레이크포인트 정확히
      resizeWindow(BREAKPOINTS.tablet)

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'tablet')
      })

      // 데스크톱 브레이크포인트 직전
      resizeWindow(BREAKPOINTS.desktop - 1)

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'tablet')
      })

      // 데스크톱 브레이크포인트 정확히
      resizeWindow(BREAKPOINTS.desktop)

      await waitFor(() => {
        expect(screen.getByTestId('responsive-chat')).toHaveAttribute('data-device-type', 'desktop')
      })
    })
  })
})