import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderChat } from '../utils/chat-test-utils'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// E2E 테스트를 위한 실제 사용자 시나리오 시뮬레이션
const ChatE2EScenario = ({ scenario = 'normal' }: { scenario?: string }) => {
  const [messages, setMessages] = React.useState<any[]>([])
  const [connectionState, setConnectionState] = React.useState('disconnected')
  const [currentUser] = React.useState({
    id: 'user-1',
    name: '김팀장',
    role: 'leader',
  })
  const [teamMembers] = React.useState([
    { id: 'user-1', name: '김팀장', role: 'leader' },
    { id: 'user-2', name: '이개발', role: 'member' },
    { id: 'user-3', name: '박디자인', role: 'member' },
  ])

  const [typingUsers, setTypingUsers] = React.useState<string[]>([])
  const [errors, setErrors] = React.useState<string[]>([])

  // 시나리오별 초기 설정
  React.useEffect(() => {
    const initializeScenario = async () => {
      try {
        setConnectionState('connecting')

        // 시나리오별 초기 데이터 로드
        if (scenario === 'existing-messages') {
          const existingMessages = [
            {
              id: 1,
              content: '오늘 회의는 몇 시인가요?',
              user_id: 'user-2',
              user_name: '이개발',
              created_at: '2024-12-25T09:00:00Z',
              message_type: 'text',
            },
            {
              id: 2,
              content: '📅 팀 회의가 15:00로 변경되었습니다',
              user_id: 'system',
              user_name: 'System',
              created_at: '2024-12-25T09:30:00Z',
              message_type: 'schedule_update',
              related_schedule_id: 'schedule-1',
            },
          ]
          setMessages(existingMessages)
        }

        // 연결 성공
        setTimeout(() => {
          setConnectionState('connected')
        }, 500)

        // 시나리오별 이벤트 시뮬레이션
        if (scenario === 'realtime-activity') {
          setTimeout(() => simulateRealtimeActivity(), 1000)
        } else if (scenario === 'connection-issues') {
          setTimeout(() => simulateConnectionIssues(), 2000)
        }
      } catch (error) {
        setConnectionState('error')
        setErrors((prev) => [...prev, 'Failed to initialize chat'])
      }
    }

    initializeScenario()
  }, [scenario])

  const simulateRealtimeActivity = () => {
    // 다른 사용자 타이핑 시작
    setTimeout(() => {
      setTypingUsers(['user-2'])
    }, 500)

    // 타이핑 중지 및 메시지 수신
    setTimeout(() => {
      setTypingUsers([])
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content: '실시간 메시지 테스트입니다!',
          user_id: 'user-2',
          user_name: '이개발',
          created_at: new Date().toISOString(),
          message_type: 'text',
        },
      ])
    }, 2000)

    // 추가 사용자 활동
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          content: '저도 확인했습니다.',
          user_id: 'user-3',
          user_name: '박디자인',
          created_at: new Date().toISOString(),
          message_type: 'text',
        },
      ])
    }, 3500)
  }

  const simulateConnectionIssues = () => {
    // 연결 끊김
    setConnectionState('disconnected')
    setErrors((prev) => [...prev, 'Connection lost'])

    // 재연결 시도
    setTimeout(() => {
      setConnectionState('reconnecting')
    }, 1000)

    // 재연결 성공
    setTimeout(() => {
      setConnectionState('connected')
      setErrors((prev) => prev.filter((e) => e !== 'Connection lost'))
    }, 3000)
  }

  const sendMessage = async (content: string) => {
    if (connectionState !== 'connected') {
      throw new Error('Not connected')
    }

    // 메시지 전송 시뮬레이션
    const newMessage = {
      id: Date.now(),
      content,
      user_id: currentUser.id,
      user_name: currentUser.name,
      created_at: new Date().toISOString(),
      message_type: 'text' as const,
    }

    setMessages((prev) => [...prev, newMessage])

    // 서버 응답 시뮬레이션
    return new Promise((resolve) => setTimeout(resolve, 200))
  }

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const input = form.elements.namedItem('message') as HTMLTextAreaElement
    const content = input.value.trim()

    if (!content) return

    try {
      await sendMessage(content)
      input.value = ''
    } catch (error) {
      setErrors((prev) => [...prev, 'Failed to send message'])
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return '✅ 연결됨'
      case 'connecting':
        return '🔄 연결 중...'
      case 'disconnected':
        return '❌ 연결 끊김'
      case 'reconnecting':
        return '🔄 재연결 중...'
      case 'error':
        return '⚠️ 연결 오류'
      default:
        return '❓ 알 수 없음'
    }
  }

  return (
    <div data-testid="chat-e2e-scenario" className="chat-app">
      {/* 헤더 */}
      <div data-testid="chat-header" className="chat-header">
        <h2>팀 채팅 - 2024년 12월 25일</h2>
        <div
          data-testid="connection-indicator"
          className={`connection ${connectionState}`}
        >
          {getConnectionStatusText()}
        </div>
      </div>

      {/* 팀 멤버 목록 */}
      <div data-testid="team-members" className="team-members">
        <h3>팀 멤버 ({teamMembers.length}명)</h3>
        {teamMembers.map((member) => (
          <div
            key={member.id}
            data-testid={`member-${member.id}`}
            className="member"
          >
            <span className="name">{member.name}</span>
            <span className="role">({member.role})</span>
            {member.id === currentUser.id && <span className="you">(나)</span>}
          </div>
        ))}
      </div>

      {/* 에러 표시 */}
      {errors.length > 0 && (
        <div data-testid="error-list" className="errors">
          {errors.map((error, index) => (
            <div key={index} data-testid={`error-${index}`} className="error">
              ⚠️ {error}
            </div>
          ))}
        </div>
      )}

      {/* 메시지 영역 */}
      <div data-testid="message-area" className="message-area">
        <div
          data-testid="message-list"
          role="log"
          aria-live="polite"
          aria-label="채팅 메시지"
          className="message-list"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.id}`}
              className={`message ${msg.user_id === currentUser.id ? 'own' : 'other'} ${msg.message_type}`}
            >
              <div className="message-header">
                <span className="sender">{msg.user_name}</span>
                <time className="timestamp">
                  {new Date(msg.created_at).toLocaleTimeString('ko-KR')}
                </time>
              </div>
              <div className="message-content">
                {msg.message_type === 'schedule_update' && '📅 '}
                {msg.content}
              </div>
              {msg.related_schedule_id && (
                <button
                  data-testid={`schedule-link-${msg.id}`}
                  className="schedule-link"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('schedule-clicked', {
                        detail: { scheduleId: msg.related_schedule_id },
                      })
                    )
                  }}
                >
                  📅 일정 보기
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 타이핑 인디케이터 */}
        {typingUsers.length > 0 && (
          <div data-testid="typing-indicator" className="typing-indicator">
            {typingUsers
              .map((userId) => {
                const user = teamMembers.find((m) => m.id === userId)
                return user?.name
              })
              .filter(Boolean)
              .join(', ')}
            님이 입력 중입니다...
          </div>
        )}
      </div>

      {/* 메시지 입력 */}
      <form
        onSubmit={handleMessageSubmit}
        data-testid="message-form"
        className="message-form"
      >
        <div className="input-group">
          <textarea
            name="message"
            data-testid="message-input"
            placeholder="메시지를 입력하세요..."
            disabled={connectionState !== 'connected'}
            rows={2}
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleMessageSubmit(e as any)
              }
            }}
          />
          <div className="input-actions">
            <button
              type="submit"
              data-testid="send-button"
              disabled={connectionState !== 'connected'}
            >
              전송
            </button>
          </div>
        </div>
        <div className="input-info">
          <span className="char-count">최대 500자</span>
          <span className="shortcuts">Enter: 전송 | Shift+Enter: 줄바꿈</span>
        </div>
      </form>
    </div>
  )
}

import React from 'react'

describe('Realtime Messaging E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 실제 API 응답 모킹
    server.use(
      http.get(
        'http://localhost:3000/api/teams/:teamId/messages',
        ({ params, request }) => {
          const url = new URL(request.url)
          const date = url.searchParams.get('date')

          return HttpResponse.json({
            success: true,
            data: [],
            pagination: {
              page: 1,
              limit: 50,
              total: 0,
              hasMore: false,
            },
          })
        }
      ),

      http.post(
        'http://localhost:3000/api/teams/:teamId/messages',
        async ({ request, params }) => {
          const body = await request.json()

          return HttpResponse.json({
            success: true,
            data: {
              id: Date.now(),
              content: (body as any).content,
              user_id: 'user-1',
              user_name: '김팀장',
              team_id: params.teamId,
              message_date: (body as any).message_date || '2024-12-25',
              created_at: new Date().toISOString(),
              message_type: 'text',
              related_schedule_id: null,
            },
          })
        }
      ),

      http.get(
        'http://localhost:3000/api/teams/:teamId/members',
        ({ params }) => {
          return HttpResponse.json({
            success: true,
            data: [
              { id: 'user-1', name: '김팀장', role: 'leader' },
              { id: 'user-2', name: '이개발', role: 'member' },
              { id: 'user-3', name: '박디자인', role: 'member' },
            ],
          })
        }
      )
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('사용자 여정 시나리오', () => {
    it('완전한 채팅 세션 - 앱 시작부터 종료까지', async () => {
      const user = userEvent.setup()

      renderChat(<ChatE2EScenario scenario="normal" />)

      // 1. 앱 초기화 확인
      expect(screen.getByTestId('chat-e2e-scenario')).toBeInTheDocument()
      expect(screen.getByText('팀 채팅 - 2024년 12월 25일')).toBeInTheDocument()

      // 2. 연결 중 상태 확인
      expect(screen.getByText('🔄 연결 중...')).toBeInTheDocument()

      // 3. 연결 완료 대기
      await waitFor(
        () => {
          expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      // 4. 팀 멤버 목록 확인
      expect(screen.getByText('팀 멤버 (3명)')).toBeInTheDocument()
      expect(screen.getByText('김팀장')).toBeInTheDocument()
      expect(screen.getByText('(나)')).toBeInTheDocument()

      // 5. 메시지 입력 및 전송
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      expect(messageInput).not.toBeDisabled()
      expect(sendButton).not.toBeDisabled()

      await user.type(messageInput, '안녕하세요! 첫 번째 메시지입니다.')
      await user.click(sendButton)

      // 6. 메시지 전송 확인
      await waitFor(() => {
        expect(
          screen.getByText('안녕하세요! 첫 번째 메시지입니다.')
        ).toBeInTheDocument()
        expect(messageInput).toHaveValue('')
      })

      // 7. 추가 메시지 전송 (Enter 키 사용)
      await user.type(messageInput, '두 번째 메시지 (Enter로 전송)')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(
          screen.getByText('두 번째 메시지 (Enter로 전송)')
        ).toBeInTheDocument()
      })

      // 8. 줄바꿈 테스트 (Shift+Enter)
      await user.type(messageInput, '첫 번째 줄')
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      await user.type(messageInput, '두 번째 줄')

      expect(messageInput).toHaveValue('첫 번째 줄\n두 번째 줄')

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('첫 번째 줄\n두 번째 줄')).toBeInTheDocument()
      })
    })

    it('기존 메시지가 있는 채팅방 진입 시나리오', async () => {
      renderChat(<ChatE2EScenario scenario="existing-messages" />)

      // 연결 완료 대기
      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      // 기존 메시지 확인
      expect(screen.getByText('오늘 회의는 몇 시인가요?')).toBeInTheDocument()
      expect(
        screen.getByText('📅 팀 회의가 15:00로 변경되었습니다')
      ).toBeInTheDocument()

      // 일정 관련 메시지의 링크 확인
      const scheduleLink = screen.getByTestId('schedule-link-2')
      expect(scheduleLink).toBeInTheDocument()

      // 일정 링크 클릭 시 이벤트 발생 확인
      const scheduleClickHandler = vi.fn()
      window.addEventListener('schedule-clicked', scheduleClickHandler)

      const user = userEvent.setup()
      await user.click(scheduleLink)

      await waitFor(() => {
        expect(scheduleClickHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { scheduleId: 'schedule-1' },
          })
        )
      })
    })

    it('실시간 활동이 활발한 채팅방 시나리오', async () => {
      vi.useFakeTimers()

      renderChat(<ChatE2EScenario scenario="realtime-activity" />)

      // 연결 완료 대기
      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      // 실시간 활동 시작 (1초 후)
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      // 타이핑 상태 확인
      await waitFor(() => {
        expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
        expect(
          screen.getByText('이개발님이 입력 중입니다...')
        ).toBeInTheDocument()
      })

      // 메시지 수신 (2초 후)
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument()
        expect(
          screen.getByText('실시간 메시지 테스트입니다!')
        ).toBeInTheDocument()
      })

      // 추가 메시지 수신 (3.5초 후)
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      await waitFor(() => {
        expect(screen.getByText('저도 확인했습니다.')).toBeInTheDocument()
      })

      // 현재 사용자가 메시지 추가
      const user = userEvent.setup()
      const messageInput = screen.getByTestId('message-input')

      await user.type(messageInput, '활발한 대화네요!')
      await user.click(screen.getByTestId('send-button'))

      await waitFor(() => {
        expect(screen.getByText('활발한 대화네요!')).toBeInTheDocument()
      })

      vi.useRealTimers()
    })

    it('연결 문제 발생 및 복구 시나리오', async () => {
      vi.useFakeTimers()

      renderChat(<ChatE2EScenario scenario="connection-issues" />)

      // 초기 연결 확인
      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      // 연결 문제 발생 (2초 후)
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // 연결 끊김 상태 확인
      await waitFor(() => {
        expect(screen.getByText('❌ 연결 끊김')).toBeInTheDocument()
        expect(screen.getByText('Connection lost')).toBeInTheDocument()
      })

      // 입력 필드 비활성화 확인
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')
      expect(messageInput).toBeDisabled()
      expect(sendButton).toBeDisabled()

      // 재연결 시도 (1초 후)
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.getByText('🔄 재연결 중...')).toBeInTheDocument()
      })

      // 재연결 성공 (3초 후)
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
        expect(screen.queryByText('Connection lost')).not.toBeInTheDocument()
      })

      // 입력 필드 다시 활성화 확인
      expect(messageInput).not.toBeDisabled()
      expect(sendButton).not.toBeDisabled()

      vi.useRealTimers()
    })
  })

  describe('사용자 상호작용 패턴', () => {
    it('연속 메시지 전송 패턴', async () => {
      const user = userEvent.setup()

      renderChat(<ChatE2EScenario scenario="normal" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // 연속으로 여러 메시지 빠르게 전송
      const messages = [
        '첫 번째 빠른 메시지',
        '두 번째 빠른 메시지',
        '세 번째 빠른 메시지',
      ]

      for (const message of messages) {
        await user.clear(messageInput)
        await user.type(messageInput, message)
        await user.click(sendButton)

        await waitFor(() => {
          expect(screen.getByText(message)).toBeInTheDocument()
          expect(messageInput).toHaveValue('')
        })
      }

      // 모든 메시지가 순서대로 표시되는지 확인
      messages.forEach((message) => {
        expect(screen.getByText(message)).toBeInTheDocument()
      })
    })

    it('긴 메시지 작성 및 전송 패턴', async () => {
      const user = userEvent.setup()

      renderChat(<ChatE2EScenario scenario="normal" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      const messageInput = screen.getByTestId('message-input')

      // 긴 메시지 작성
      const longMessage = `이것은 매우 긴 메시지입니다.
여러 줄에 걸쳐 작성되었으며,
다양한 내용을 포함하고 있습니다.

1. 첫 번째 항목
2. 두 번째 항목
3. 세 번째 항목

결론적으로, 이 메시지는 텍스트 영역의 크기 조정과
스크롤 동작을 테스트하기 위한 것입니다.`

      await user.type(messageInput, longMessage)
      expect(messageInput).toHaveValue(longMessage)

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(longMessage)).toBeInTheDocument()
      })
    })

    it('메시지 길이 제한 테스트', async () => {
      const user = userEvent.setup()

      renderChat(<ChatE2EScenario scenario="normal" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      const messageInput = screen.getByTestId('message-input')

      // 500자 초과 메시지 시도
      const veryLongMessage = 'a'.repeat(600)

      await user.type(messageInput, veryLongMessage)

      // 500자로 제한되는지 확인
      expect(messageInput.value.length).toBe(500)
      expect(messageInput).toHaveValue('a'.repeat(500))

      // 전송 시도
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('a'.repeat(500))).toBeInTheDocument()
      })
    })
  })

  describe('접근성 사용자 여정', () => {
    it('키보드만을 사용한 전체 채팅 경험', async () => {
      const user = userEvent.setup()

      renderChat(<ChatE2EScenario scenario="existing-messages" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      // Tab 네비게이션으로 메시지 입력 필드로 이동
      await user.tab()
      const messageInput = screen.getByTestId('message-input')
      expect(messageInput).toHaveFocus()

      // 메시지 입력
      await user.type(messageInput, '키보드 전용 메시지')

      // Tab으로 전송 버튼으로 이동
      await user.tab()
      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toHaveFocus()

      // Space 또는 Enter로 전송
      await user.keyboard(' ')

      await waitFor(() => {
        expect(screen.getByText('키보드 전용 메시지')).toBeInTheDocument()
      })

      // 일정 링크로 Tab 이동 (일정 메시지가 있는 경우)
      const scheduleLink = screen.queryByTestId('schedule-link-2')
      if (scheduleLink) {
        // Shift+Tab으로 되돌아가서 일정 링크 찾기
        await user.keyboard('{Shift>}{Tab}{Tab}{/Shift}')
        await user.tab()

        if (scheduleLink === document.activeElement) {
          expect(scheduleLink).toHaveFocus()

          // Enter로 일정 링크 활성화
          const scheduleClickHandler = vi.fn()
          window.addEventListener('schedule-clicked', scheduleClickHandler)

          await user.keyboard('{Enter}')

          await waitFor(() => {
            expect(scheduleClickHandler).toHaveBeenCalled()
          })
        }
      }
    })

    it('스크린 리더를 위한 적절한 공지 제공', async () => {
      renderChat(<ChatE2EScenario scenario="realtime-activity" />)

      // 연결 상태 변경 공지
      await waitFor(() => {
        const connectionIndicator = screen.getByTestId('connection-indicator')
        expect(connectionIndicator).toBeInTheDocument()
        expect(connectionIndicator).toHaveClass('connected')
      })

      // 메시지 목록의 라이브 영역 확인
      const messageList = screen.getByTestId('message-list')
      expect(messageList).toHaveAttribute('role', 'log')
      expect(messageList).toHaveAttribute('aria-live', 'polite')
      expect(messageList).toHaveAttribute('aria-label', '채팅 메시지')

      // 실시간 메시지 수신 시 라이브 영역 업데이트 확인
      vi.useFakeTimers()

      act(() => {
        vi.advanceTimersByTime(3500)
      })

      await waitFor(() => {
        const newMessage = screen.getByText('실시간 메시지 테스트입니다!')
        expect(newMessage.closest('[role="log"]')).toBe(messageList)
      })

      vi.useRealTimers()
    })
  })

  describe('오류 상황 사용자 경험', () => {
    it('네트워크 오류 시 사용자 가이드', async () => {
      // 네트워크 오류 시뮬레이션
      server.use(
        http.post('http://localhost:3000/api/teams/:teamId/messages', () => {
          return HttpResponse.json(
            { error: 'Network timeout' },
            { status: 408 }
          )
        })
      )

      const user = userEvent.setup()

      renderChat(<ChatE2EScenario scenario="normal" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      // 메시지 전송 시도
      const messageInput = screen.getByTestId('message-input')
      await user.type(messageInput, '전송 실패할 메시지')
      await user.keyboard('{Enter}')

      // 오류 메시지 확인
      await waitFor(() => {
        expect(screen.getByText('Failed to send message')).toBeInTheDocument()
      })

      // 메시지가 입력 필드에 남아있는지 확인 (재시도 가능)
      expect(messageInput).toHaveValue('전송 실패할 메시지')
    })

    it('서버 점검 시나리오', async () => {
      // 모든 API 요청에 503 응답
      server.use(
        http.get('*', () => {
          return HttpResponse.json(
            { error: 'Service temporarily unavailable' },
            { status: 503 }
          )
        }),
        http.post('*', () => {
          return HttpResponse.json(
            { error: 'Service temporarily unavailable' },
            { status: 503 }
          )
        })
      )

      renderChat(<ChatE2EScenario scenario="normal" />)

      // 연결 오류 상태 확인
      await waitFor(
        () => {
          expect(screen.getByText('⚠️ 연결 오류')).toBeInTheDocument()
        },
        { timeout: 2000 }
      )

      // 모든 상호작용 요소가 비활성화되는지 확인
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      expect(messageInput).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })
  })

  describe('성능 사용자 경험', () => {
    it('대량 메시지 환경에서의 사용자 경험', async () => {
      const user = userEvent.setup()

      // 많은 메시지가 있는 시나리오 설정
      renderChat(<ChatE2EScenario scenario="existing-messages" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      // 많은 메시지를 빠르게 추가하여 성능 테스트
      const messageInput = screen.getByTestId('message-input')

      const performanceStartTime = performance.now()

      // 20개의 메시지를 빠르게 전송
      for (let i = 1; i <= 20; i++) {
        await user.clear(messageInput)
        await user.type(messageInput, `성능 테스트 메시지 ${i}`)
        await user.keyboard('{Enter}')

        await waitFor(() => {
          expect(
            screen.getByText(`성능 테스트 메시지 ${i}`)
          ).toBeInTheDocument()
        })
      }

      const performanceEndTime = performance.now()
      const totalTime = performanceEndTime - performanceStartTime

      // 성능이 합리적인 범위 내에 있는지 확인 (20개 메시지 처리에 10초 이하)
      expect(totalTime).toBeLessThan(10000)

      // UI가 여전히 반응적인지 확인
      await user.type(messageInput, '성능 테스트 완료')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('성능 테스트 완료')).toBeInTheDocument()
      })
    })

    it('동시 사용자 활동 시뮬레이션', async () => {
      vi.useFakeTimers()

      renderChat(<ChatE2EScenario scenario="realtime-activity" />)

      await waitFor(() => {
        expect(screen.getByText('✅ 연결됨')).toBeInTheDocument()
      })

      const user = userEvent.setup()
      const messageInput = screen.getByTestId('message-input')

      // 사용자가 메시지를 입력하는 동안 다른 사용자의 활동 시뮬레이션
      await user.type(messageInput, '동시 활동 테스트 중...')

      // 동시에 다른 사용자의 메시지 수신
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // 실시간 메시지가 수신되어도 현재 입력이 방해받지 않는지 확인
      await waitFor(() => {
        expect(
          screen.getByText('실시간 메시지 테스트입니다!')
        ).toBeInTheDocument()
        expect(messageInput).toHaveValue('동시 활동 테스트 중...')
      })

      // 사용자가 계속해서 메시지를 완성하고 전송할 수 있는지 확인
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('동시 활동 테스트 중...')).toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })
})
