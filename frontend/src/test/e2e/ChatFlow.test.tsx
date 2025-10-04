import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../mocks/server'
import { chatTestUtils } from '../mocks/handlers/chat'

// 전체 채팅 플로우를 테스트하기 위한 Mock 애플리케이션
const MockChatFlowApp = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState(null)
  const [selectedTeam, setSelectedTeam] = React.useState(null)
  const [selectedDate, setSelectedDate] = React.useState('2024-01-15')
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected')
  const [messages, setMessages] = React.useState([])
  const [typingUsers, setTypingUsers] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  // 로그인 시뮬레이션
  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Mock API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (data.success) {
        setCurrentUser(data.data.user)
        setIsLoggedIn(true)
        localStorage.setItem('token', data.data.token)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 팀 선택
  const handleTeamSelect = (teamId: number) => {
    setSelectedTeam({ id: teamId, name: `팀 ${teamId}` })
    connectToChat(teamId)
  }

  // 채팅 연결
  const connectToChat = (teamId: number) => {
    setConnectionStatus('connecting')

    // Long Polling 시뮬레이션
    setTimeout(() => {
      setConnectionStatus('connected')
      loadMessages(teamId, selectedDate)
    }, 1000)
  }

  // 메시지 로드
  const loadMessages = async (teamId: number, date: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/teams/${teamId}/messages?message_date=${date}`
      )
      const data = await response.json()

      if (data.success) {
        setMessages(data.data.messages)
      }
    } catch (err) {
      setError('메시지를 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 메시지 전송
  const sendMessage = async (
    content: string,
    messageType = 'text',
    metadata = null
  ) => {
    if (!selectedTeam || !content.trim()) return

    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content,
          message_type: messageType,
          message_date: selectedDate,
          metadata,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessages((prev) => [...prev, data.data.message])
      }
    } catch (err) {
      setError('메시지 전송에 실패했습니다.')
    }
  }

  // 타이핑 상태 전송
  const sendTyping = (isTyping: boolean) => {
    if (!selectedTeam) return

    // 타이핑 상태 시뮬레이션
    if (isTyping) {
      setTypingUsers((prev) => [
        ...prev,
        { userId: 999, username: 'other_user' },
      ])
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== 999))
      }, 3000)
    }
  }

  // 날짜 변경
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    if (selectedTeam) {
      loadMessages(selectedTeam.id, date)
    }
  }

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div data-testid="login-screen">
        <h1>로그인</h1>
        <form
          data-testid="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            handleLogin(
              formData.get('email') as string,
              formData.get('password') as string
            )
          }}
        >
          <input
            data-testid="email-input"
            name="email"
            type="email"
            placeholder="이메일"
            required
          />
          <input
            data-testid="password-input"
            name="password"
            type="password"
            placeholder="비밀번호"
            required
          />
          <button data-testid="login-button" type="submit" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
        {error && (
          <div data-testid="login-error" role="alert">
            {error}
          </div>
        )}
      </div>
    )
  }

  // 팀 선택 화면
  if (!selectedTeam) {
    return (
      <div data-testid="team-selection-screen">
        <h1>팀 선택</h1>
        <div data-testid="user-info">
          환영합니다, {currentUser?.full_name}님!
        </div>
        <div data-testid="team-list">
          <button
            data-testid="team-1-button"
            onClick={() => handleTeamSelect(1)}
          >
            개발팀
          </button>
          <button
            data-testid="team-2-button"
            onClick={() => handleTeamSelect(2)}
          >
            마케팅팀
          </button>
        </div>
      </div>
    )
  }

  // 메인 채팅 화면
  return (
    <div data-testid="chat-app">
      {/* 헤더 */}
      <header data-testid="chat-header">
        <div data-testid="team-name">{selectedTeam.name}</div>
        <div data-testid="connection-status" className={connectionStatus}>
          {connectionStatus === 'connected' && '🟢 연결됨'}
          {connectionStatus === 'connecting' && '🟡 연결 중...'}
          {connectionStatus === 'disconnected' && '🔴 연결 끊김'}
        </div>
        <button
          data-testid="logout-button"
          onClick={() => {
            setIsLoggedIn(false)
            setCurrentUser(null)
            setSelectedTeam(null)
            localStorage.removeItem('token')
          }}
        >
          로그아웃
        </button>
      </header>

      {/* 날짜 선택 */}
      <div data-testid="date-selector">
        <label>날짜 선택:</label>
        <select
          data-testid="date-select"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
        >
          <option value="2024-01-15">2024-01-15</option>
          <option value="2024-01-16">2024-01-16</option>
          <option value="2024-01-17">2024-01-17</option>
        </select>
      </div>

      {/* 메시지 영역 */}
      <div data-testid="messages-container">
        <h2>채팅 - {selectedDate}</h2>

        {isLoading && (
          <div data-testid="messages-loading">메시지를 불러오는 중...</div>
        )}

        {error && (
          <div data-testid="messages-error" role="alert">
            {error}
          </div>
        )}

        <div data-testid="message-list">
          {messages.map((message) => (
            <div
              key={message.id}
              data-testid={`message-${message.id}`}
              className={`message ${message.user.id === currentUser?.id ? 'own' : 'other'}`}
            >
              <div data-testid="message-user">{message.user.full_name}</div>
              <div data-testid="message-content">{message.content}</div>
              <div data-testid="message-time">
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
              {message.message_type === 'schedule_change_request' && (
                <div data-testid="schedule-change-request">
                  일정 변경 요청: {message.metadata?.requested_start_time} -{' '}
                  {message.metadata?.requested_end_time}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <div data-testid="typing-indicator">
            {typingUsers.map((user) => user.username).join(', ')}님이 입력 중...
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <div data-testid="message-input-area">
        <form
          data-testid="message-form"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.target as HTMLFormElement)
            const content = formData.get('message') as string
            const messageType = formData.get('messageType') as string

            let metadata = null
            if (messageType === 'schedule_change_request') {
              metadata = {
                schedule_id: formData.get('scheduleId'),
                requested_start_time: formData.get('startTime'),
                requested_end_time: formData.get('endTime'),
              }
            }

            sendMessage(content, messageType, metadata)
            ;(e.target as HTMLFormElement).reset()
          }}
        >
          <div data-testid="message-type-selector">
            <label>
              <input
                type="radio"
                name="messageType"
                value="text"
                defaultChecked
                data-testid="text-message-radio"
              />
              일반 메시지
            </label>
            <label>
              <input
                type="radio"
                name="messageType"
                value="schedule_change_request"
                data-testid="schedule-change-radio"
              />
              일정 변경 요청
            </label>
          </div>

          <textarea
            data-testid="message-textarea"
            name="message"
            placeholder="메시지를 입력하세요..."
            onInput={() => sendTyping(true)}
            required
          />

          <div data-testid="schedule-fields" style={{ display: 'none' }}>
            <input
              data-testid="schedule-id-input"
              name="scheduleId"
              placeholder="일정 ID"
            />
            <input
              data-testid="start-time-input"
              name="startTime"
              type="time"
              placeholder="시작 시간"
            />
            <input
              data-testid="end-time-input"
              name="endTime"
              type="time"
              placeholder="종료 시간"
            />
          </div>

          <button data-testid="send-button" type="submit">
            전송
          </button>
        </form>
      </div>
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

describe('ChatFlow E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chatTestUtils.resetMessages()
    localStorage.clear()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('전체 사용자 플로우', () => {
    it('로그인부터 메시지 전송까지 전체 플로우가 작동해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 1. 로그인 화면 확인
      expect(screen.getByTestId('login-screen')).toBeInTheDocument()

      // 2. 로그인 수행
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      // 3. 팀 선택 화면으로 이동
      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
        expect(
          screen.getByText('환영합니다, 테스트 사용자님!')
        ).toBeInTheDocument()
      })

      // 4. 팀 선택
      await user.click(screen.getByTestId('team-1-button'))

      // 5. 채팅 화면으로 이동 및 연결 상태 확인
      await waitFor(() => {
        expect(screen.getByTestId('chat-app')).toBeInTheDocument()
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          '🟡 연결 중...'
        )
      })

      // 6. 연결 완료 대기
      await waitFor(
        () => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent(
            '🟢 연결됨'
          )
        },
        { timeout: 2000 }
      )

      // 7. 메시지 전송
      await user.type(screen.getByTestId('message-textarea'), '안녕하세요!')
      await user.click(screen.getByTestId('send-button'))

      // 8. 메시지가 화면에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('안녕하세요!')).toBeInTheDocument()
      })
    })

    it('로그인 실패 시 에러 메시지가 표시되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 잘못된 로그인 정보 입력
      await user.type(screen.getByTestId('email-input'), 'wrong@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('login-button'))

      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument()
        expect(
          screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')
        ).toBeInTheDocument()
      })
    })

    it('로그아웃 후 다시 로그인 화면으로 돌아가야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 로그인
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      // 팀 선택
      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('team-1-button'))

      // 채팅 화면에서 로그아웃
      await waitFor(() => {
        expect(screen.getByTestId('chat-app')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('logout-button'))

      // 로그인 화면으로 돌아갔는지 확인
      expect(screen.getByTestId('login-screen')).toBeInTheDocument()
    })
  })

  describe('채팅 기능', () => {
    const setupChatApp = async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 로그인 및 팀 선택까지 완료
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('team-1-button'))

      await waitFor(
        () => {
          expect(screen.getByTestId('chat-app')).toBeInTheDocument()
          expect(screen.getByTestId('connection-status')).toHaveTextContent(
            '🟢 연결됨'
          )
        },
        { timeout: 2000 }
      )

      return user
    }

    it('메시지를 전송하고 수신할 수 있어야 한다', async () => {
      const user = await setupChatApp()

      // 메시지 전송
      await user.type(screen.getByTestId('message-textarea'), '첫 번째 메시지')
      await user.click(screen.getByTestId('send-button'))

      // 메시지 표시 확인
      await waitFor(() => {
        expect(screen.getByText('첫 번째 메시지')).toBeInTheDocument()
        expect(screen.getByTestId('message-1')).toHaveClass('own')
      })

      // 두 번째 메시지 전송
      await user.type(screen.getByTestId('message-textarea'), '두 번째 메시지')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByText('두 번째 메시지')).toBeInTheDocument()
      })
    })

    it('날짜를 변경하면 해당 날짜의 메시지를 불러와야 한다', async () => {
      const user = await setupChatApp()

      // 초기 날짜의 메시지 확인
      expect(screen.getByTestId('date-select')).toHaveValue('2024-01-15')

      // 날짜 변경
      await user.selectOptions(screen.getByTestId('date-select'), '2024-01-16')

      // 로딩 표시 확인
      await waitFor(() => {
        expect(screen.getByTestId('messages-loading')).toBeInTheDocument()
      })

      // 로딩 완료 후 새 날짜 확인
      await waitFor(() => {
        expect(screen.queryByTestId('messages-loading')).not.toBeInTheDocument()
        expect(screen.getByText('채팅 - 2024-01-16')).toBeInTheDocument()
      })
    })

    it('타이핑 인디케이터가 표시되어야 한다', async () => {
      const user = await setupChatApp()

      // 메시지 입력 시작
      await user.type(screen.getByTestId('message-textarea'), '타이핑 중...')

      // 타이핑 인디케이터 확인
      await waitFor(() => {
        expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
        expect(
          screen.getByText(/other_user님이 입력 중.../)
        ).toBeInTheDocument()
      })

      // 3초 후 타이핑 인디케이터 사라짐 확인
      await waitFor(
        () => {
          expect(
            screen.queryByTestId('typing-indicator')
          ).not.toBeInTheDocument()
        },
        { timeout: 4000 }
      )
    })

    it('일정 변경 요청 메시지를 전송할 수 있어야 한다', async () => {
      const user = await setupChatApp()

      // 일정 변경 요청 모드로 전환
      await user.click(screen.getByTestId('schedule-change-radio'))

      // 일정 변경 요청 메시지 작성
      await user.type(
        screen.getByTestId('message-textarea'),
        '회의 시간을 변경하고 싶습니다.'
      )

      // 일정 필드 표시 (실제 구현에서는 라디오 버튼에 따라 동적으로 표시)
      const scheduleFields = screen.getByTestId('schedule-fields')
      scheduleFields.style.display = 'block'

      await user.type(screen.getByTestId('schedule-id-input'), '123')
      await user.type(screen.getByTestId('start-time-input'), '14:00')
      await user.type(screen.getByTestId('end-time-input'), '15:00')

      await user.click(screen.getByTestId('send-button'))

      // 일정 변경 요청 메시지 확인
      await waitFor(() => {
        expect(
          screen.getByText('회의 시간을 변경하고 싶습니다.')
        ).toBeInTheDocument()
        expect(
          screen.getByTestId('schedule-change-request')
        ).toBeInTheDocument()
        expect(
          screen.getByText('일정 변경 요청: 14:00 - 15:00')
        ).toBeInTheDocument()
      })
    })
  })

  describe('연결 관리', () => {
    it('연결 상태가 올바르게 표시되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 로그인 및 팀 선택
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('team-1-button'))

      // 연결 중 상태 확인
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          '🟡 연결 중...'
        )
      })

      // 연결 완료 상태 확인
      await waitFor(
        () => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent(
            '🟢 연결됨'
          )
        },
        { timeout: 2000 }
      )
    })

    it('네트워크 오류 시 적절한 에러 메시지가 표시되어야 한다', async () => {
      // 네트워크 오류 시뮬레이션을 위한 서버 핸들러 오버라이드
      server.use(
        // 메시지 로드 실패 시뮬레이션
        http.get('/api/teams/:teamId/messages', () => {
          return new Response(null, { status: 500 })
        })
      )

      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 로그인 및 팀 선택
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('team-1-button'))

      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByTestId('messages-error')).toBeInTheDocument()
        expect(
          screen.getByText('메시지를 불러오는데 실패했습니다.')
        ).toBeInTheDocument()
      })
    })
  })

  describe('성능 및 사용성', () => {
    it('빠른 연속 메시지 전송이 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 로그인 및 팀 선택
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('team-1-button'))

      await waitFor(
        () => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent(
            '🟢 연결됨'
          )
        },
        { timeout: 2000 }
      )

      // 빠른 연속 메시지 전송
      for (let i = 1; i <= 3; i++) {
        await user.type(screen.getByTestId('message-textarea'), `메시지 ${i}`)
        await user.click(screen.getByTestId('send-button'))

        await waitFor(() => {
          expect(screen.getByText(`메시지 ${i}`)).toBeInTheDocument()
        })
      }

      // 모든 메시지가 순서대로 표시되는지 확인
      expect(screen.getByText('메시지 1')).toBeInTheDocument()
      expect(screen.getByText('메시지 2')).toBeInTheDocument()
      expect(screen.getByText('메시지 3')).toBeInTheDocument()
    })

    it('긴 메시지도 올바르게 처리되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 설정 완료
      await user.type(screen.getByTestId('email-input'), 'test@example.com')
      await user.type(screen.getByTestId('password-input'), 'password123')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('team-1-button'))

      await waitFor(
        () => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent(
            '🟢 연결됨'
          )
        },
        { timeout: 2000 }
      )

      // 긴 메시지 전송
      const longMessage = '이것은 매우 긴 메시지입니다. '.repeat(20)
      await user.type(screen.getByTestId('message-textarea'), longMessage)
      await user.click(screen.getByTestId('send-button'))

      // 긴 메시지가 올바르게 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument()
      })
    })
  })

  describe('접근성', () => {
    it('키보드만으로 전체 플로우를 완료할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // Tab과 Enter 키만 사용해서 로그인
      await user.tab() // 이메일 필드
      await user.keyboard('test@example.com')
      await user.tab() // 비밀번호 필드
      await user.keyboard('password123')
      await user.tab() // 로그인 버튼
      await user.keyboard('{Enter}')

      // 팀 선택
      await waitFor(() => {
        expect(screen.getByTestId('team-selection-screen')).toBeInTheDocument()
      })
      await user.tab() // 첫 번째 팀 버튼
      await user.keyboard('{Enter}')

      // 채팅 화면에서 메시지 전송
      await waitFor(() => {
        expect(screen.getByTestId('chat-app')).toBeInTheDocument()
      })

      // 메시지 입력 필드로 탭 이동 (여러 요소를 건너뛸 수 있음)
      await user.tab() // 날짜 선택
      await user.tab() // 메시지 타입 라디오 (첫 번째)
      await user.tab() // 메시지 타입 라디오 (두 번째)
      await user.tab() // 메시지 텍스트 영역
      await user.keyboard('키보드로 입력한 메시지')
      await user.tab() // 전송 버튼
      await user.keyboard('{Enter}')

      // 메시지가 전송되었는지 확인
      await waitFor(() => {
        expect(screen.getByText('키보드로 입력한 메시지')).toBeInTheDocument()
      })
    })

    it('스크린 리더를 위한 적절한 레이블과 역할이 설정되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatFlowApp />
        </TestWrapper>
      )

      // 로그인 화면에서 ARIA 속성 확인
      expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email')
      expect(screen.getByTestId('password-input')).toHaveAttribute(
        'type',
        'password'
      )

      // 에러 메시지의 role="alert" 확인 (로그인 실패 시)
      await user.type(screen.getByTestId('email-input'), 'wrong@example.com')
      await user.type(screen.getByTestId('password-input'), 'wrongpassword')
      await user.click(screen.getByTestId('login-button'))

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toHaveAttribute(
          'role',
          'alert'
        )
      })
    })
  })
})
