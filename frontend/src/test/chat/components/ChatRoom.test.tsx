import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  renderChat,
  mockMessages,
  simulateRealtimeEvents,
  mockChatContext,
} from '../utils/chat-test-utils'
import {
  MockLongPolling,
  realtimeTestScenarios,
} from '../utils/realtime-test-helpers'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// ChatRoom 컴포넌트 모킹 (실제 구현 전까지)
const MockChatRoom = ({ teamId, messageDate, onScheduleClick }: any) => {
  return (
    <div data-testid="chat-room" role="main" aria-label="채팅방">
      <div
        data-testid="message-list"
        role="log"
        aria-live="polite"
        aria-label="메시지 목록"
      >
        {mockMessages.map((msg) => (
          <div
            key={msg.id}
            data-message-id={msg.id}
            role="listitem"
            aria-label={`${msg.user_name}: ${msg.content}`}
          >
            <span data-testid="message-user">{msg.user_name}</span>
            <span data-testid="message-content">{msg.content}</span>
            <time data-testid="message-time">{msg.created_at}</time>
          </div>
        ))}
      </div>

      <div data-testid="typing-indicator" aria-live="polite">
        {/* 타이핑 상태 표시 */}
      </div>

      <form data-testid="message-form" onSubmit={(e) => e.preventDefault()}>
        <textarea
          data-testid="message-input"
          placeholder="메시지를 입력하세요..."
          aria-label="메시지 입력"
          maxLength={500}
          rows={1}
        />
        <button
          type="submit"
          data-testid="send-button"
          aria-label="메시지 전송"
        >
          전송
        </button>
      </form>

      <div data-testid="connection-status" aria-live="polite">
        연결됨
      </div>
    </div>
  )
}

// ChatRoom 컴포넌트 임포트 (실제 구현 후 교체)
// import { ChatRoom } from '@/components/chat/ChatRoom'
const ChatRoom = MockChatRoom

describe('ChatRoom', () => {
  let mockLongPolling: MockLongPolling
  const defaultProps = {
    teamId: 'team-1',
    messageDate: '2024-12-25',
    onScheduleClick: vi.fn(),
  }

  beforeEach(() => {
    mockLongPolling = new MockLongPolling()
    vi.clearAllMocks()

    // API 모킹
    server.use(
      http.get(
        'http://localhost:3000/api/teams/:teamId/messages',
        ({ request, params }) => {
          const url = new URL(request.url)
          const date = url.searchParams.get('date')

          return HttpResponse.json({
            success: true,
            data: mockMessages.filter(
              (msg) =>
                msg.team_id === params.teamId && msg.message_date === date
            ),
          })
        }
      ),

      http.post(
        'http://localhost:3000/api/teams/:teamId/messages',
        ({ request, params }) => {
          return HttpResponse.json({
            success: true,
            data: {
              id: Date.now(),
              team_id: params.teamId,
              content: 'Test message',
              user_id: 'current-user',
              user_name: '현재 사용자',
              message_date: '2024-12-25',
              created_at: new Date().toISOString(),
              message_type: 'text',
              related_schedule_id: null,
            },
          })
        }
      )
    )
  })

  afterEach(() => {
    mockLongPolling.disconnect()
    vi.restoreAllMocks()
  })

  describe('렌더링', () => {
    it('채팅방이 올바르게 렌더링되어야 한다', () => {
      renderChat(<ChatRoom {...defaultProps} />)

      expect(screen.getByTestId('chat-room')).toBeInTheDocument()
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('message-form')).toBeInTheDocument()
      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
    })

    it('초기 메시지 목록이 표시되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      await waitFor(() => {
        mockMessages.forEach((msg) => {
          expect(screen.getByText(msg.content)).toBeInTheDocument()
          expect(screen.getByText(msg.user_name)).toBeInTheDocument()
        })
      })
    })

    it('메시지 입력 필드가 올바르게 렌더링되어야 한다', () => {
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      expect(messageInput).toBeInTheDocument()
      expect(messageInput).toHaveAttribute('maxLength', '500')
      expect(messageInput).toHaveAttribute(
        'placeholder',
        '메시지를 입력하세요...'
      )
    })

    it('전송 버튼이 표시되어야 한다', () => {
      renderChat(<ChatRoom {...defaultProps} />)

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeInTheDocument()
      expect(sendButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('메시지 전송', () => {
    it('유효한 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '안녕하세요!')
      await user.click(sendButton)

      // 메시지가 전송되었는지 확인
      await waitFor(() => {
        expect(messageInput).toHaveValue('')
      })
    })

    it('빈 메시지는 전송되지 않아야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const sendButton = screen.getByTestId('send-button')
      await user.click(sendButton)

      // 빈 메시지 전송 시도가 무시되는지 확인
      expect(sendButton).toBeInTheDocument()
    })

    it('500자 제한이 적용되어야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const longMessage = 'a'.repeat(501)

      await user.type(messageInput, longMessage)

      // 500자로 제한되는지 확인
      expect(messageInput).toHaveValue('a'.repeat(500))
    })

    it('Enter 키로 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')

      await user.type(messageInput, '키보드로 전송')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(messageInput).toHaveValue('')
      })
    })

    it('Shift+Enter로 줄바꿈을 할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')

      await user.type(messageInput, '첫 번째 줄')
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      await user.type(messageInput, '두 번째 줄')

      expect(messageInput).toHaveValue('첫 번째 줄\n두 번째 줄')
    })
  })

  describe('실시간 메시지 수신', () => {
    it('새 메시지가 실시간으로 표시되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      // 실시간 메시지 이벤트 시뮬레이션
      const newMessageEvent = simulateRealtimeEvents.newMessage({
        content: '실시간 메시지 테스트',
        user_name: '새 사용자',
      })

      act(() => {
        mockLongPolling.emit('new_message', newMessageEvent.data)
      })

      await waitFor(() => {
        expect(screen.getByText('실시간 메시지 테스트')).toBeInTheDocument()
        expect(screen.getByText('새 사용자')).toBeInTheDocument()
      })
    })

    it('일정 업데이트 메시지가 표시되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      const scheduleUpdateEvent = simulateRealtimeEvents.scheduleUpdate(
        'schedule-1',
        {
          title: '팀 회의',
          start_time: '2024-12-25T15:00:00Z',
        }
      )

      act(() => {
        mockLongPolling.emit('schedule_update', scheduleUpdateEvent.data)
      })

      await waitFor(() => {
        expect(screen.getByText(/일정이 변경되었습니다/)).toBeInTheDocument()
      })
    })

    it('메시지 수신 시 자동 스크롤이 작동해야 한다', async () => {
      const { container } = renderChat(<ChatRoom {...defaultProps} />)
      const messageList = container.querySelector(
        '[data-testid="message-list"]'
      ) as HTMLElement

      // 스크롤 위치 모킹
      const scrollToBottomSpy = vi
        .spyOn(messageList, 'scrollTo')
        .mockImplementation()

      const newMessageEvent = simulateRealtimeEvents.newMessage({
        content: '자동 스크롤 테스트',
      })

      act(() => {
        mockLongPolling.emit('new_message', newMessageEvent.data)
      })

      await waitFor(() => {
        expect(scrollToBottomSpy).toHaveBeenCalledWith({
          top: messageList.scrollHeight,
          behavior: 'smooth',
        })
      })
    })
  })

  describe('타이핑 상태', () => {
    it('다른 사용자의 타이핑 상태가 표시되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      const typingEvent = simulateRealtimeEvents.userTyping('user-2', '이개발')

      act(() => {
        mockLongPolling.emit('user_typing', typingEvent.data)
      })

      await waitFor(() => {
        expect(screen.getByText(/이개발님이 입력 중입니다/)).toBeInTheDocument()
      })
    })

    it('본인의 타이핑 상태는 표시되지 않아야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />, {
        chatContext: { ...mockChatContext, userId: 'user-1' },
      })

      const typingEvent = simulateRealtimeEvents.userTyping('user-1', '김팀장')

      act(() => {
        mockLongPolling.emit('user_typing', typingEvent.data)
      })

      await waitFor(() => {
        expect(
          screen.queryByText(/김팀장님이 입력 중입니다/)
        ).not.toBeInTheDocument()
      })
    })

    it('타이핑 상태가 일정 시간 후 자동으로 사라져야 한다', async () => {
      vi.useFakeTimers()
      renderChat(<ChatRoom {...defaultProps} />)

      const typingEvent = simulateRealtimeEvents.userTyping('user-2', '이개발')

      act(() => {
        mockLongPolling.emit('user_typing', typingEvent.data)
      })

      await waitFor(() => {
        expect(screen.getByText(/이개발님이 입력 중입니다/)).toBeInTheDocument()
      })

      // 5초 후 타이핑 상태 자동 제거
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      await waitFor(() => {
        expect(
          screen.queryByText(/이개발님이 입력 중입니다/)
        ).not.toBeInTheDocument()
      })

      vi.useRealTimers()
    })
  })

  describe('연결 상태', () => {
    it('연결 상태가 표시되어야 한다', () => {
      renderChat(<ChatRoom {...defaultProps} />)

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText('연결됨')).toBeInTheDocument()
    })

    it('연결 끊김 시 재연결 시도 표시가 나타나야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      act(() => {
        mockLongPolling.forceDisconnect('Network error')
      })

      await waitFor(() => {
        expect(screen.getByText(/연결이 끊어졌습니다/)).toBeInTheDocument()
        expect(screen.getByText(/재연결 중.../)).toBeInTheDocument()
      })
    })

    it('재연결 성공 시 정상 상태로 돌아가야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      // 연결 끊김
      act(() => {
        mockLongPolling.forceDisconnect('Network error')
      })

      await waitFor(() => {
        expect(screen.getByText(/연결이 끊어졌습니다/)).toBeInTheDocument()
      })

      // 재연결 성공
      act(() => {
        mockLongPolling.setState({ isConnected: true, retryCount: 0 })
        mockLongPolling.emit('connect')
      })

      await waitFor(() => {
        expect(screen.getByText('연결됨')).toBeInTheDocument()
      })
    })

    it('최대 재시도 횟수 초과 시 에러 메시지가 표시되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      act(() => {
        mockLongPolling.emit('connection_failed', {
          error: new Error('Max retries exceeded'),
          retryCount: 3,
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/연결에 실패했습니다/)).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: /다시 시도/ })
        ).toBeInTheDocument()
      })
    })
  })

  describe('일정 연동', () => {
    it('일정 관련 메시지 클릭 시 콜백이 호출되어야 한다', async () => {
      const onScheduleClick = vi.fn()
      const user = userEvent.setup()

      renderChat(
        <ChatRoom {...defaultProps} onScheduleClick={onScheduleClick} />
      )

      // 일정 관련 메시지 찾기
      const scheduleMessage = screen.getByText(/일정이 변경되었습니다/)
      await user.click(scheduleMessage)

      expect(onScheduleClick).toHaveBeenCalledWith('schedule-1')
    })

    it('일정 업데이트 메시지에 특별한 스타일이 적용되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      const scheduleUpdateEvent = simulateRealtimeEvents.scheduleUpdate(
        'schedule-1',
        {}
      )

      act(() => {
        mockLongPolling.emit('schedule_update', scheduleUpdateEvent.data)
      })

      await waitFor(() => {
        const scheduleMessage = screen.getByText(/일정이 변경되었습니다/)
        expect(scheduleMessage.closest('[data-message-id]')).toHaveClass(
          'schedule-message'
        )
      })
    })
  })

  describe('성능', () => {
    it('대량 메시지 렌더링이 원활해야 한다', async () => {
      // 가상화를 위한 대량 메시지 테스트
      const startTime = performance.now()

      realtimeTestScenarios.highVolumeMessages(mockLongPolling)
      renderChat(<ChatRoom {...defaultProps} />)

      // 50개 메시지 로딩
      act(() => {
        for (let i = 0; i < 50; i++) {
          mockLongPolling.emit('new_message', {
            id: i + 100,
            content: `성능 테스트 메시지 ${i + 1}`,
            user_id: 'user-1',
            user_name: '성능 테스터',
            team_id: 'team-1',
            message_date: '2024-12-25',
            created_at: new Date().toISOString(),
            message_type: 'text',
            related_schedule_id: null,
          })
        }
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 렌더링 시간이 합리적인 범위 내에 있는지 확인 (500ms 이하)
      expect(renderTime).toBeLessThan(500)
    })

    it('스크롤 성능이 원활해야 한다', async () => {
      const { container } = renderChat(<ChatRoom {...defaultProps} />)
      const messageList = container.querySelector(
        '[data-testid="message-list"]'
      ) as HTMLElement

      // 스크롤 이벤트 성능 측정
      const scrollStartTime = performance.now()

      act(() => {
        messageList.scrollTop = messageList.scrollHeight
      })

      const scrollEndTime = performance.now()
      const scrollTime = scrollEndTime - scrollStartTime

      // 스크롤 시간이 합리적인 범위 내에 있는지 확인 (100ms 이하)
      expect(scrollTime).toBeLessThan(100)
    })
  })

  describe('에러 처리', () => {
    it('메시지 전송 실패 시 에러 메시지가 표시되어야 한다', async () => {
      // API 에러 시뮬레이션
      server.use(
        http.post('http://localhost:3000/api/teams/:teamId/messages', () => {
          return HttpResponse.json(
            { error: 'Message send failed' },
            { status: 500 }
          )
        })
      )

      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '실패할 메시지')
      await user.click(sendButton)

      await waitFor(() => {
        expect(
          screen.getByText(/메시지 전송에 실패했습니다/)
        ).toBeInTheDocument()
      })
    })

    it('네트워크 에러 시 적절한 메시지가 표시되어야 한다', async () => {
      renderChat(<ChatRoom {...defaultProps} />)

      act(() => {
        mockLongPolling.emit('error', new Error('Network Error'))
      })

      await waitFor(() => {
        expect(
          screen.getByText(/네트워크 연결을 확인해주세요/)
        ).toBeInTheDocument()
      })
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 속성이 설정되어야 한다', () => {
      renderChat(<ChatRoom {...defaultProps} />)

      expect(screen.getByTestId('chat-room')).toHaveAttribute('role', 'main')
      expect(screen.getByTestId('message-list')).toHaveAttribute('role', 'log')
      expect(screen.getByTestId('message-list')).toHaveAttribute(
        'aria-live',
        'polite'
      )
      expect(screen.getByTestId('message-input')).toHaveAttribute(
        'aria-label',
        '메시지 입력'
      )
    })

    it('키보드 네비게이션이 가능해야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<ChatRoom {...defaultProps} />)

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // Tab으로 포커스 이동
      await user.tab()
      expect(messageInput).toHaveFocus()

      await user.tab()
      expect(sendButton).toHaveFocus()
    })

    it('스크린 리더를 위한 라이브 영역이 올바르게 설정되어야 한다', () => {
      renderChat(<ChatRoom {...defaultProps} />)

      const messageList = screen.getByTestId('message-list')
      const typingIndicator = screen.getByTestId('typing-indicator')
      const connectionStatus = screen.getByTestId('connection-status')

      expect(messageList).toHaveAttribute('aria-live', 'polite')
      expect(typingIndicator).toHaveAttribute('aria-live', 'polite')
      expect(connectionStatus).toHaveAttribute('aria-live', 'polite')
    })
  })
})
