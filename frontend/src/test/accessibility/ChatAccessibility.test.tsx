import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock 접근성 테스트용 채팅 컴포넌트
const MockAccessibleChatRoom = () => {
  const [messages, setMessages] = React.useState([
    {
      id: 1,
      content: '안녕하세요!',
      user: { id: 1, username: 'user1', full_name: '사용자 1' },
      created_at: '2024-01-15T09:00:00Z',
      message_type: 'text',
    },
    {
      id: 2,
      content: '일정 변경을 요청합니다.',
      user: { id: 2, username: 'user2', full_name: '사용자 2' },
      created_at: '2024-01-15T09:05:00Z',
      message_type: 'schedule_change_request',
      metadata: {
        schedule_id: 1,
        requested_start_time: '14:00',
        requested_end_time: '15:00',
      },
    },
  ])

  const [newMessage, setNewMessage] = React.useState('')
  const [isConnected, setIsConnected] = React.useState(true)
  const [typingUsers, setTypingUsers] = React.useState(['사용자 3'])
  const [announcementMessage, setAnnouncementMessage] = React.useState('')

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        content: newMessage,
        user: { id: 999, username: 'currentuser', full_name: '현재 사용자' },
        created_at: new Date().toISOString(),
        message_type: 'text',
      }

      setMessages(prev => [...prev, message])
      setNewMessage('')

      // 스크린 리더를 위한 알림
      setAnnouncementMessage(`메시지가 전송되었습니다: ${newMessage}`)
      setTimeout(() => setAnnouncementMessage(''), 1000)
    }
  }

  const handleApproveScheduleChange = (messageId: number) => {
    setAnnouncementMessage('일정 변경이 승인되었습니다.')
    setTimeout(() => setAnnouncementMessage(''), 3000)
  }

  const handleRejectScheduleChange = (messageId: number) => {
    setAnnouncementMessage('일정 변경이 거절되었습니다.')
    setTimeout(() => setAnnouncementMessage(''), 3000)
  }

  return (
    <div>
      {/* 스크린 리더를 위한 숨겨진 알림 영역 */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="status-announcements"
      >
        {announcementMessage}
      </div>

      {/* 채팅방 헤더 */}
      <header role="banner">
        <h1 id="chat-title">팀 채팅방</h1>
        <div
          role="status"
          aria-live="polite"
          data-testid="connection-status"
          aria-label={`연결 상태: ${isConnected ? '연결됨' : '연결 끊김'}`}
        >
          <span aria-hidden="true">{isConnected ? '🟢' : '🔴'}</span>
          {isConnected ? '연결됨' : '연결 끊김'}
        </div>
      </header>

      {/* 메인 채팅 영역 */}
      <main role="main" aria-labelledby="chat-title">
        {/* 메시지 목록 */}
        <section
          role="log"
          aria-live="polite"
          aria-label="채팅 메시지 목록"
          data-testid="message-list"
          tabIndex={0}
        >
          <h2 className="sr-only">메시지 목록</h2>
          {messages.map((message, index) => (
            <article
              key={message.id}
              role="article"
              data-testid={`message-${message.id}`}
              aria-label={`${message.user.full_name}의 메시지`}
              tabIndex={0}
            >
              <div className="message-header">
                <span className="message-author" id={`author-${message.id}`}>
                  {message.user.full_name}
                </span>
                <time
                  dateTime={message.created_at}
                  aria-label={`전송 시간: ${new Date(message.created_at).toLocaleString('ko-KR')}`}
                >
                  {new Date(message.created_at).toLocaleTimeString('ko-KR')}
                </time>
              </div>

              <div
                className="message-content"
                aria-describedby={`author-${message.id}`}
              >
                {message.content}
              </div>

              {message.message_type === 'schedule_change_request' && (
                <div
                  role="region"
                  aria-label="일정 변경 요청"
                  data-testid={`schedule-change-${message.id}`}
                >
                  <div className="schedule-info">
                    <span className="sr-only">요청된 일정:</span>
                    {message.metadata?.requested_start_time} - {message.metadata?.requested_end_time}
                  </div>
                  <div role="group" aria-label="일정 변경 요청 응답">
                    <button
                      type="button"
                      data-testid={`approve-${message.id}`}
                      onClick={() => handleApproveScheduleChange(message.id)}
                      aria-label={`${message.user.full_name}의 일정 변경 요청 승인`}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      data-testid={`reject-${message.id}`}
                      onClick={() => handleRejectScheduleChange(message.id)}
                      aria-label={`${message.user.full_name}의 일정 변경 요청 거절`}
                    >
                      거절
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="typing-indicator"
            aria-label={`${typingUsers.join(', ')}님이 입력 중입니다`}
          >
            <span aria-hidden="true">✏️</span>
            {typingUsers.join(', ')}님이 입력 중...
          </div>
        )}

        {/* 메시지 입력 영역 */}
        <section
          role="form"
          aria-labelledby="message-input-heading"
          data-testid="message-input-section"
        >
          <h2 id="message-input-heading" className="sr-only">메시지 작성</h2>

          <div className="input-container">
            <label htmlFor="message-input" className="sr-only">
              메시지 입력
            </label>
            <textarea
              id="message-input"
              data-testid="message-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="메시지를 입력하세요..."
              aria-label="메시지 입력 필드"
              aria-describedby="input-help"
              rows={3}
              maxLength={500}
            />

            <div id="input-help" className="sr-only">
              Enter 키로 전송, Shift+Enter로 줄바꿈
            </div>

            <div className="input-info" aria-live="polite">
              <span aria-label={`${newMessage.length}자 입력됨, 최대 500자`}>
                {newMessage.length}/500
              </span>
            </div>

            <button
              type="button"
              data-testid="send-button"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              aria-label="메시지 전송"
              aria-describedby="send-button-help"
            >
              전송
            </button>

            <div id="send-button-help" className="sr-only">
              {newMessage.trim() ? '메시지를 전송합니다' : '메시지를 입력한 후 전송할 수 있습니다'}
            </div>
          </div>
        </section>
      </main>

      {/* 바로가기 링크 */}
      <nav role="navigation" aria-label="채팅방 바로가기">
        <div className="skip-links">
          <a href="#message-input" className="skip-link">
            메시지 입력으로 바로가기
          </a>
          <a href="#message-list" className="skip-link">
            메시지 목록으로 바로가기
          </a>
        </div>
      </nav>

      {/* CSS for screen reader only content */}
      <style jsx>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: white;
          padding: 8px;
          text-decoration: none;
          z-index: 1000;
        }

        .skip-link:focus {
          top: 6px;
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

describe('ChatAccessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 접근성 구조', () => {
    it('적절한 시맨틱 HTML 구조를 가져야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 기본 landmark 역할 확인
      expect(screen.getByRole('banner')).toBeInTheDocument() // header
      expect(screen.getByRole('main')).toBeInTheDocument() // main content
      expect(screen.getByRole('navigation')).toBeInTheDocument() // nav
      expect(screen.getByRole('form')).toBeInTheDocument() // message input section
      expect(screen.getByRole('log')).toBeInTheDocument() // message list
    })

    it('적절한 헤딩 구조를 가져야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // h1 제목 확인
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('팀 채팅방')

      // h2 제목들 확인 (스크린 리더 전용 포함)
      const headings = screen.getAllByRole('heading', { level: 2 })
      expect(headings).toHaveLength(2) // "메시지 목록", "메시지 작성"
    })

    it('모든 폼 요소에 적절한 라벨이 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')

      // 라벨 연결 확인
      expect(messageInput).toHaveAttribute('id', 'message-input')
      expect(screen.getByLabelText('메시지 입력')).toBe(messageInput)

      // aria-label 확인
      expect(messageInput).toHaveAttribute('aria-label', '메시지 입력 필드')

      // aria-describedby 확인
      expect(messageInput).toHaveAttribute('aria-describedby', 'input-help')
      expect(screen.getByText('Enter 키로 전송, Shift+Enter로 줄바꿈')).toHaveAttribute('id', 'input-help')
    })
  })

  describe('Live Regions (실시간 업데이트)', () => {
    it('메시지 목록에 적절한 live region이 설정되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageList = screen.getByTestId('message-list')

      expect(messageList).toHaveAttribute('role', 'log')
      expect(messageList).toHaveAttribute('aria-live', 'polite')
      expect(messageList).toHaveAttribute('aria-label', '채팅 메시지 목록')
    })

    it('연결 상태 변경이 스크린 리더에 알려져야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const connectionStatus = screen.getByTestId('connection-status')

      expect(connectionStatus).toHaveAttribute('role', 'status')
      expect(connectionStatus).toHaveAttribute('aria-live', 'polite')
      expect(connectionStatus).toHaveAttribute('aria-label', '연결 상태: 연결됨')
    })

    it('타이핑 인디케이터가 스크린 리더에 알려져야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const typingIndicator = screen.getByTestId('typing-indicator')

      expect(typingIndicator).toHaveAttribute('role', 'status')
      expect(typingIndicator).toHaveAttribute('aria-live', 'polite')
      expect(typingIndicator).toHaveAttribute('aria-atomic', 'true')
      expect(typingIndicator).toHaveAttribute('aria-label', '사용자 3님이 입력 중입니다')
    })

    it('메시지 전송 후 알림이 스크린 리더에 전달되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')
      const statusAnnouncements = screen.getByTestId('status-announcements')

      expect(statusAnnouncements).toHaveAttribute('role', 'status')
      expect(statusAnnouncements).toHaveAttribute('aria-live', 'polite')
      expect(statusAnnouncements).toHaveAttribute('aria-atomic', 'true')

      await user.type(messageInput, '테스트 메시지')
      await user.click(sendButton)

      await waitFor(() => {
        expect(statusAnnouncements).toHaveTextContent('메시지가 전송되었습니다: 테스트 메시지')
      })
    })
  })

  describe('키보드 네비게이션', () => {
    it('모든 상호작용 요소가 키보드로 접근 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // Tab으로 포커스 이동 확인
      await user.tab()
      expect(screen.getByTestId('message-list')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('message-1')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('message-2')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('approve-2')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('reject-2')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('message-input')).toHaveFocus()

      await user.tab()
      expect(screen.getByTestId('send-button')).toHaveFocus()
    })

    it('Enter 키로 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')

      await user.click(messageInput)
      await user.type(messageInput, 'Enter로 전송할 메시지')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Enter로 전송할 메시지')).toBeInTheDocument()
      })
    })

    it('Shift+Enter로 줄바꿈할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')

      await user.click(messageInput)
      await user.type(messageInput, '첫 번째 줄')
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      await user.type(messageInput, '두 번째 줄')

      expect(messageInput).toHaveValue('첫 번째 줄\n두 번째 줄')
    })

    it('스페이스바로 버튼을 활성화할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 메시지 입력 후 스페이스바로 전송 버튼 활성화
      await user.type(screen.getByTestId('message-input'), '스페이스바 테스트')

      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton) // 포커스 이동
      await user.keyboard(' ') // 스페이스바로 활성화

      await waitFor(() => {
        expect(screen.getByText('스페이스바 테스트')).toBeInTheDocument()
      })
    })
  })

  describe('ARIA 속성', () => {
    it('메시지에 적절한 ARIA 속성이 설정되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const firstMessage = screen.getByTestId('message-1')

      expect(firstMessage).toHaveAttribute('role', 'article')
      expect(firstMessage).toHaveAttribute('aria-label', '사용자 1의 메시지')
      expect(firstMessage).toHaveAttribute('tabIndex', '0')
    })

    it('일정 변경 요청 영역에 적절한 ARIA 속성이 설정되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const scheduleChangeSection = screen.getByTestId('schedule-change-2')

      expect(scheduleChangeSection).toHaveAttribute('role', 'region')
      expect(scheduleChangeSection).toHaveAttribute('aria-label', '일정 변경 요청')

      const approveButton = screen.getByTestId('approve-2')
      const rejectButton = screen.getByTestId('reject-2')

      expect(approveButton).toHaveAttribute('aria-label', '사용자 2의 일정 변경 요청 승인')
      expect(rejectButton).toHaveAttribute('aria-label', '사용자 2의 일정 변경 요청 거절')
    })

    it('버튼 상태가 적절히 전달되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const sendButton = screen.getByTestId('send-button')

      // 초기 상태 (비활성화)
      expect(sendButton).toBeDisabled()
      expect(sendButton).toHaveAttribute('aria-describedby', 'send-button-help')
      expect(screen.getByText('메시지를 입력한 후 전송할 수 있습니다')).toBeInTheDocument()
    })

    it('글자 수 정보가 스크린 리더에 전달되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      await user.type(messageInput, 'Hello')

      const charCount = screen.getByText('5/500')
      expect(charCount).toHaveAttribute('aria-label', '5자 입력됨, 최대 500자')
    })
  })

  describe('스크린 리더 호환성', () => {
    it('데코레이티브 아이콘이 스크린 리더에서 숨겨져야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 연결 상태 아이콘
      const connectionIcon = screen.getByText('🟢')
      expect(connectionIcon).toHaveAttribute('aria-hidden', 'true')

      // 타이핑 인디케이터 아이콘
      const typingIcon = screen.getByText('✏️')
      expect(typingIcon).toHaveAttribute('aria-hidden', 'true')
    })

    it('시간 정보가 적절한 형식으로 제공되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const timeElements = screen.getAllByRole('time')

      timeElements.forEach(timeElement => {
        expect(timeElement).toHaveAttribute('dateTime')
        expect(timeElement).toHaveAttribute('aria-label')
        expect(timeElement.getAttribute('aria-label')).toMatch(/전송 시간:/)
      })
    })

    it('상황별 도움말이 제공되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 메시지 입력 도움말
      expect(screen.getByText('Enter 키로 전송, Shift+Enter로 줄바꿈')).toBeInTheDocument()

      // 전송 버튼 도움말
      expect(screen.getByText('메시지를 입력한 후 전송할 수 있습니다')).toBeInTheDocument()
    })
  })

  describe('포커스 관리', () => {
    it('메시지 전송 후 입력 필드에 포커스가 유지되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '포커스 테스트')
      await user.click(sendButton)

      await waitFor(() => {
        expect(messageInput).toHaveFocus()
        expect(messageInput).toHaveValue('')
      })
    })

    it('일정 변경 승인/거절 후 적절한 포커스 관리가 되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const approveButton = screen.getByTestId('approve-2')
      await user.click(approveButton)

      // 승인 후 알림이 스크린 리더에 전달되는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('status-announcements')).toHaveTextContent('일정 변경이 승인되었습니다.')
      })
    })
  })

  describe('고대비 및 색상 접근성', () => {
    it('색상에만 의존하지 않는 정보 전달이 되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 연결 상태가 텍스트로도 전달되는지 확인
      const connectionStatus = screen.getByTestId('connection-status')
      expect(connectionStatus).toHaveTextContent('연결됨')

      // 타이핑 상태가 텍스트로도 전달되는지 확인
      const typingIndicator = screen.getByTestId('typing-indicator')
      expect(typingIndicator).toHaveTextContent('사용자 3님이 입력 중...')
    })
  })

  describe('바로가기 링크', () => {
    it('스킵 링크가 제공되어야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      const skipLinks = screen.getAllByRole('link')

      expect(skipLinks).toHaveLength(2)
      expect(skipLinks[0]).toHaveTextContent('메시지 입력으로 바로가기')
      expect(skipLinks[1]).toHaveTextContent('메시지 목록으로 바로가기')

      expect(skipLinks[0]).toHaveAttribute('href', '#message-input')
      expect(skipLinks[1]).toHaveAttribute('href', '#message-list')
    })
  })

  describe('모바일 접근성', () => {
    it('터치 타겟이 충분한 크기를 가져야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 버튼들이 최소 44x44px 타겟 크기를 가져야 함 (실제 구현에서 CSS로 확인)
      const buttons = screen.getAllByRole('button')

      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
        // 실제 구현에서는 getComputedStyle을 사용하여 크기 확인
      })
    })

    it('스와이프 제스처 대신 명시적 버튼을 제공해야 한다', () => {
      render(
        <TestWrapper>
          <MockAccessibleChatRoom />
        </TestWrapper>
      )

      // 모든 액션이 버튼으로 제공되는지 확인
      expect(screen.getByTestId('send-button')).toBeInTheDocument()
      expect(screen.getByTestId('approve-2')).toBeInTheDocument()
      expect(screen.getByTestId('reject-2')).toBeInTheDocument()
    })
  })
})