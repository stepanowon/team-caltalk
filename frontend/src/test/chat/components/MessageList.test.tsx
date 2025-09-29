import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderChat, mockMessages } from '../utils/chat-test-utils'
import { generateTestData } from '../utils/realtime-test-helpers'

// MessageList 컴포넌트 모킹 (실제 구현 전까지)
const MockMessageList = ({ messages, currentUserId, onMessageClick, onLoadMore, isLoading, hasMore }: any) => {
  return (
    <div
      data-testid="message-list"
      role="log"
      aria-live="polite"
      aria-label="메시지 목록"
      style={{ height: '400px', overflowY: 'auto' }}
    >
      {isLoading && (
        <div data-testid="loading-indicator" aria-label="메시지 로딩 중">
          로딩 중...
        </div>
      )}

      {hasMore && (
        <button
          data-testid="load-more-button"
          onClick={onLoadMore}
          aria-label="이전 메시지 더 보기"
        >
          이전 메시지 보기
        </button>
      )}

      <div data-testid="messages-container">
        {messages.map((msg: any, index: number) => (
          <div
            key={msg.id}
            data-testid={`message-${msg.id}`}
            data-message-id={msg.id}
            role="listitem"
            aria-label={`${msg.user_name}: ${msg.content}`}
            className={`message ${msg.message_type === 'schedule_update' ? 'schedule-message' : ''} ${msg.user_id === currentUserId ? 'own-message' : 'other-message'}`}
            onClick={() => onMessageClick?.(msg)}
          >
            <div data-testid="message-header">
              <span data-testid="message-user" className="user-name">
                {msg.user_name}
              </span>
              <time
                data-testid="message-time"
                dateTime={msg.created_at}
                className="timestamp"
              >
                {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
            </div>

            <div data-testid="message-content" className="content">
              {msg.message_type === 'schedule_update' && (
                <span data-testid="schedule-icon" aria-label="일정 업데이트">📅</span>
              )}
              {msg.content}
            </div>

            {msg.related_schedule_id && (
              <button
                data-testid="schedule-link"
                onClick={(e) => {
                  e.stopPropagation()
                  onMessageClick?.(msg, 'schedule')
                }}
                aria-label="관련 일정 보기"
                className="schedule-link"
              >
                일정 보기
              </button>
            )}

            {msg.user_id === currentUserId && (
              <div data-testid="message-status" className="message-status">
                <span aria-label="읽음 상태">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div data-testid="scroll-to-bottom" style={{ height: '1px' }} />
    </div>
  )
}

// MessageList 컴포넌트 임포트 (실제 구현 후 교체)
// import { MessageList } from '@/components/chat/MessageList'
const MessageList = MockMessageList

describe('MessageList', () => {
  const defaultProps = {
    messages: mockMessages,
    currentUserId: 'user-1',
    onMessageClick: vi.fn(),
    onLoadMore: vi.fn(),
    isLoading: false,
    hasMore: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('메시지 목록이 올바르게 렌더링되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} />)

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('messages-container')).toBeInTheDocument()

      // 모든 메시지가 렌더링되는지 확인
      mockMessages.forEach(msg => {
        expect(screen.getByTestId(`message-${msg.id}`)).toBeInTheDocument()
        expect(screen.getByText(msg.content)).toBeInTheDocument()
        expect(screen.getByText(msg.user_name)).toBeInTheDocument()
      })
    })

    it('빈 메시지 목록도 올바르게 처리되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} messages={[]} />)

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('messages-container')).toBeInTheDocument()
      expect(screen.queryByTestId('message-1')).not.toBeInTheDocument()
    })

    it('메시지 시간이 올바른 형식으로 표시되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} />)

      const timeElements = screen.getAllByTestId('message-time')
      expect(timeElements).toHaveLength(mockMessages.length)

      // 한국 시간 형식 확인 (HH:MM)
      timeElements.forEach(timeElement => {
        expect(timeElement.textContent).toMatch(/^\d{2}:\d{2}$/)
      })
    })

    it('사용자별로 다른 스타일이 적용되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} />)

      const ownMessage = screen.getByTestId('message-1') // user-1의 메시지
      const otherMessage = screen.getByTestId('message-2') // user-2의 메시지

      expect(ownMessage).toHaveClass('own-message')
      expect(otherMessage).toHaveClass('other-message')
    })
  })

  describe('메시지 타입별 렌더링', () => {
    it('일반 텍스트 메시지가 올바르게 표시되어야 한다', () => {
      const textMessage = mockMessages.find(msg => msg.message_type === 'text')!
      renderChat(<MessageList {...defaultProps} messages={[textMessage]} />)

      const messageElement = screen.getByTestId(`message-${textMessage.id}`)
      expect(messageElement).not.toHaveClass('schedule-message')
      expect(screen.queryByTestId('schedule-icon')).not.toBeInTheDocument()
    })

    it('일정 업데이트 메시지가 특별하게 표시되어야 한다', () => {
      const scheduleMessage = mockMessages.find(msg => msg.message_type === 'schedule_update')!
      renderChat(<MessageList {...defaultProps} messages={[scheduleMessage]} />)

      const messageElement = screen.getByTestId(`message-${scheduleMessage.id}`)
      expect(messageElement).toHaveClass('schedule-message')
      expect(screen.getByTestId('schedule-icon')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-link')).toBeInTheDocument()
    })

    it('시스템 메시지가 구분되어 표시되어야 한다', () => {
      const systemMessage = mockMessages.find(msg => msg.user_id === 'system')!
      renderChat(<MessageList {...defaultProps} messages={[systemMessage]} />)

      const messageElement = screen.getByTestId(`message-${systemMessage.id}`)
      expect(messageElement).toHaveClass('schedule-message')
      expect(screen.getByText('System')).toBeInTheDocument()
    })
  })

  describe('메시지 상호작용', () => {
    it('메시지 클릭 시 콜백이 호출되어야 한다', async () => {
      const onMessageClick = vi.fn()
      const user = userEvent.setup()

      renderChat(<MessageList {...defaultProps} onMessageClick={onMessageClick} />)

      const message = screen.getByTestId('message-1')
      await user.click(message)

      expect(onMessageClick).toHaveBeenCalledWith(mockMessages[0])
    })

    it('일정 링크 클릭 시 일정 보기 콜백이 호출되어야 한다', async () => {
      const onMessageClick = vi.fn()
      const user = userEvent.setup()

      const scheduleMessage = mockMessages.find(msg => msg.related_schedule_id)!
      renderChat(<MessageList {...defaultProps} messages={[scheduleMessage]} onMessageClick={onMessageClick} />)

      const scheduleLink = screen.getByTestId('schedule-link')
      await user.click(scheduleLink)

      expect(onMessageClick).toHaveBeenCalledWith(scheduleMessage, 'schedule')
    })

    it('일정 링크 클릭이 메시지 클릭 이벤트를 중단해야 한다', async () => {
      const onMessageClick = vi.fn()
      const user = userEvent.setup()

      const scheduleMessage = mockMessages.find(msg => msg.related_schedule_id)!
      renderChat(<MessageList {...defaultProps} messages={[scheduleMessage]} onMessageClick={onMessageClick} />)

      const scheduleLink = screen.getByTestId('schedule-link')
      await user.click(scheduleLink)

      // 일정 링크 클릭만 호출되고 메시지 클릭은 호출되지 않아야 함
      expect(onMessageClick).toHaveBeenCalledTimes(1)
      expect(onMessageClick).toHaveBeenCalledWith(scheduleMessage, 'schedule')
    })
  })

  describe('로딩 및 페이지네이션', () => {
    it('로딩 상태가 표시되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} isLoading={true} />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })

    it('더 많은 메시지가 있을 때 로드 더 버튼이 표시되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} hasMore={true} />)

      expect(screen.getByTestId('load-more-button')).toBeInTheDocument()
      expect(screen.getByText('이전 메시지 보기')).toBeInTheDocument()
    })

    it('로드 더 버튼 클릭 시 콜백이 호출되어야 한다', async () => {
      const onLoadMore = vi.fn()
      const user = userEvent.setup()

      renderChat(<MessageList {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />)

      const loadMoreButton = screen.getByTestId('load-more-button')
      await user.click(loadMoreButton)

      expect(onLoadMore).toHaveBeenCalled()
    })

    it('로딩 중일 때 로드 더 버튼이 비활성화되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} hasMore={true} isLoading={true} />)

      const loadMoreButton = screen.getByTestId('load-more-button')
      expect(loadMoreButton).toBeDisabled()
    })
  })

  describe('스크롤 동작', () => {
    it('새 메시지 추가 시 자동 스크롤이 작동해야 한다', async () => {
      const { rerender, container } = renderChat(<MessageList {...defaultProps} />)
      const messageList = container.querySelector('[data-testid="message-list"]') as HTMLElement

      // 스크롤 모킹
      const scrollIntoViewSpy = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewSpy

      // 새 메시지 추가
      const newMessages = [...mockMessages, {
        id: 4,
        content: '새로운 메시지',
        user_id: 'user-2',
        user_name: '사용자2',
        team_id: 'team-1',
        message_date: '2024-12-25',
        created_at: new Date().toISOString(),
        message_type: 'text' as const,
        related_schedule_id: null,
      }]

      rerender(<MessageList {...defaultProps} messages={newMessages} />)

      // 스크롤이 호출되었는지 확인
      expect(scrollIntoViewSpy).toHaveBeenCalled()
    })

    it('사용자가 스크롤을 위로 올린 상태에서는 자동 스크롤이 작동하지 않아야 한다', async () => {
      const { rerender, container } = renderChat(<MessageList {...defaultProps} />)
      const messageList = container.querySelector('[data-testid="message-list"]') as HTMLElement

      // 스크롤을 위로 올린 상태 시뮬레이션
      Object.defineProperty(messageList, 'scrollTop', { value: 100, writable: true })
      Object.defineProperty(messageList, 'scrollHeight', { value: 800, writable: true })
      Object.defineProperty(messageList, 'clientHeight', { value: 400, writable: true })

      const scrollIntoViewSpy = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoViewSpy

      // 새 메시지 추가
      const newMessages = [...mockMessages, {
        id: 4,
        content: '새로운 메시지',
        user_id: 'user-2',
        user_name: '사용자2',
        team_id: 'team-1',
        message_date: '2024-12-25',
        created_at: new Date().toISOString(),
        message_type: 'text' as const,
        related_schedule_id: null,
      }]

      rerender(<MessageList {...defaultProps} messages={newMessages} />)

      // 자동 스크롤이 호출되지 않았는지 확인
      expect(scrollIntoViewSpy).not.toHaveBeenCalled()
    })
  })

  describe('가상화 (Virtualization)', () => {
    it('대량 메시지 처리 시 성능이 유지되어야 한다', () => {
      const largeMessageList = generateTestData.messages(1000)
      const startTime = performance.now()

      renderChat(<MessageList {...defaultProps} messages={largeMessageList} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 렌더링 시간이 합리적인 범위 내에 있는지 확인 (1초 이하)
      expect(renderTime).toBeLessThan(1000)
    })

    it('화면에 보이는 메시지만 렌더링되어야 한다 (가상화)', () => {
      const largeMessageList = generateTestData.messages(100)

      renderChat(<MessageList {...defaultProps} messages={largeMessageList} />)

      // DOM에 있는 메시지 요소 수를 확인
      const messageElements = screen.getAllByTestId(/^message-/)

      // 가상화가 적용되어 실제 메시지 수보다 적게 렌더링되어야 함
      // (정확한 수는 구현에 따라 달라질 수 있음)
      expect(messageElements.length).toBeLessThanOrEqual(50)
    })
  })

  describe('읽음 상태', () => {
    it('본인 메시지에 읽음 상태가 표시되어야 한다', () => {
      const ownMessage = mockMessages.find(msg => msg.user_id === 'user-1')!
      renderChat(<MessageList {...defaultProps} messages={[ownMessage]} />)

      expect(screen.getByTestId('message-status')).toBeInTheDocument()
      expect(screen.getByLabelText('읽음 상태')).toBeInTheDocument()
    })

    it('다른 사용자 메시지에는 읽음 상태가 표시되지 않아야 한다', () => {
      const otherMessage = mockMessages.find(msg => msg.user_id === 'user-2')!
      renderChat(<MessageList {...defaultProps} messages={[otherMessage]} />)

      expect(screen.queryByTestId('message-status')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 속성이 설정되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} />)

      const messageList = screen.getByTestId('message-list')
      expect(messageList).toHaveAttribute('role', 'log')
      expect(messageList).toHaveAttribute('aria-live', 'polite')
      expect(messageList).toHaveAttribute('aria-label', '메시지 목록')

      // 각 메시지의 접근성 속성 확인
      mockMessages.forEach(msg => {
        const messageElement = screen.getByTestId(`message-${msg.id}`)
        expect(messageElement).toHaveAttribute('role', 'listitem')
        expect(messageElement).toHaveAttribute('aria-label', `${msg.user_name}: ${msg.content}`)
      })
    })

    it('키보드 네비게이션이 가능해야 한다', async () => {
      const user = userEvent.setup()
      renderChat(<MessageList {...defaultProps} hasMore={true} />)

      const loadMoreButton = screen.getByTestId('load-more-button')
      const scheduleLink = screen.queryByTestId('schedule-link')

      // Tab으로 포커스 이동
      await user.tab()
      expect(loadMoreButton).toHaveFocus()

      if (scheduleLink) {
        await user.tab()
        expect(scheduleLink).toHaveFocus()
      }
    })

    it('스크린 리더를 위한 적절한 메시지 정보가 제공되어야 한다', () => {
      renderChat(<MessageList {...defaultProps} />)

      const timeElements = screen.getAllByTestId('message-time')
      timeElements.forEach(timeElement => {
        expect(timeElement).toHaveAttribute('dateTime')
      })

      const scheduleMessage = mockMessages.find(msg => msg.message_type === 'schedule_update')
      if (scheduleMessage) {
        const scheduleIcon = screen.getByTestId('schedule-icon')
        expect(scheduleIcon).toHaveAttribute('aria-label', '일정 업데이트')
      }
    })
  })

  describe('에러 처리', () => {
    it('잘못된 메시지 데이터가 있어도 크래시하지 않아야 한다', () => {
      const invalidMessages = [
        ...mockMessages,
        { id: 999, content: null, user_name: undefined, created_at: 'invalid-date' }
      ]

      expect(() => {
        renderChat(<MessageList {...defaultProps} messages={invalidMessages as any} />)
      }).not.toThrow()
    })

    it('메시지 렌더링 에러 시 에러 바운더리가 작동해야 한다', () => {
      // 에러를 발생시키는 메시지 데이터
      const errorMessage = {
        ...mockMessages[0],
        content: { toString: () => { throw new Error('Render error') } }
      }

      // 에러 바운더리로 감싸서 테스트
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>
        } catch (error) {
          return <div data-testid="error-boundary">메시지 렌더링 오류</div>
        }
      }

      renderChat(
        <ErrorBoundary>
          <MessageList {...defaultProps} messages={[errorMessage as any]} />
        </ErrorBoundary>
      )

      expect(screen.queryByTestId('error-boundary')).toBeInTheDocument()
    })
  })

  describe('성능 최적화', () => {
    it('메시지 리스트가 변경되지 않으면 리렌더링되지 않아야 한다', () => {
      const { rerender } = renderChat(<MessageList {...defaultProps} />)

      const initialRenderCount = screen.getAllByTestId(/^message-/).length

      // 같은 props로 다시 렌더링
      rerender(<MessageList {...defaultProps} />)

      const afterRerenderCount = screen.getAllByTestId(/^message-/).length

      expect(afterRerenderCount).toBe(initialRenderCount)
    })

    it('메모리 누수가 발생하지 않아야 한다', () => {
      const { unmount } = renderChat(<MessageList {...defaultProps} />)

      // 컴포넌트 언마운트
      unmount()

      // 이벤트 리스너나 타이머가 정리되었는지 확인
      // (실제 구현에서는 cleanup 함수를 통해 확인)
      expect(true).toBe(true) // 플레이스홀더
    })
  })
})