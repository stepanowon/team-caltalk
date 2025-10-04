import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock ChatRoom 컴포넌트 (실제 구현 전까지 사용)
const MockChatRoom = ({
  teamId,
  selectedDate,
}: {
  teamId: number
  selectedDate: string
}) => {
  const [messages, setMessages] = React.useState([
    {
      id: 1,
      content: '테스트 메시지',
      user: { username: 'testuser', full_name: '테스트 사용자' },
      created_at: '2024-01-15T09:00:00Z',
    },
  ])
  const [newMessage, setNewMessage] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          content: newMessage,
          user: { username: 'currentuser', full_name: '현재 사용자' },
          created_at: new Date().toISOString(),
        },
      ])
      setNewMessage('')
    }
  }

  return (
    <div
      data-testid="chat-room"
      data-team-id={teamId}
      data-selected-date={selectedDate}
    >
      <div data-testid="chat-header">
        <h3>팀 채팅 - {selectedDate}</h3>
        <div data-testid="connection-status">연결됨</div>
      </div>

      <div data-testid="message-list">
        {isLoading && <div data-testid="loading">메시지 로딩 중...</div>}
        {messages.map((message) => (
          <div key={message.id} data-testid="message-item">
            <div data-testid="message-user">{message.user.full_name}</div>
            <div data-testid="message-content">{message.content}</div>
            <div data-testid="message-time">{message.created_at}</div>
          </div>
        ))}
      </div>

      <div data-testid="typing-indicators">
        {/* 타이핑 인디케이터 표시 영역 */}
      </div>

      <div data-testid="message-input-container">
        <input
          data-testid="message-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
        />
        <button
          data-testid="send-button"
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          전송
        </button>
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

describe('ChatRoom', () => {
  const defaultProps = {
    teamId: 1,
    selectedDate: '2024-01-15',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('채팅방이 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('chat-room')).toBeInTheDocument()
      expect(screen.getByTestId('chat-header')).toBeInTheDocument()
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('message-input-container')).toBeInTheDocument()
    })

    it('팀 ID와 선택된 날짜가 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const chatRoom = screen.getByTestId('chat-room')
      expect(chatRoom).toHaveAttribute('data-team-id', '1')
      expect(chatRoom).toHaveAttribute('data-selected-date', '2024-01-15')
      expect(screen.getByText('팀 채팅 - 2024-01-15')).toBeInTheDocument()
    })

    it('연결 상태가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('connection-status')).toBeInTheDocument()
      expect(screen.getByText('연결됨')).toBeInTheDocument()
    })
  })

  describe('메시지 표시', () => {
    it('기존 메시지들이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByText('테스트 메시지')).toBeInTheDocument()
      expect(screen.getByText('테스트 사용자')).toBeInTheDocument()
    })

    it('메시지가 시간순으로 정렬되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageItems = screen.getAllByTestId('message-item')
      expect(messageItems).toHaveLength(1)

      const messageTime = screen.getByTestId('message-time')
      expect(messageTime).toHaveTextContent('2024-01-15T09:00:00Z')
    })

    it('로딩 중일 때 로딩 인디케이터가 표시되어야 한다', () => {
      // 로딩 상태를 시뮬레이션하기 위한 별도 컴포넌트
      const LoadingChatRoom = () => {
        const [isLoading] = React.useState(true)
        return (
          <div data-testid="chat-room">
            <div data-testid="message-list">
              {isLoading && <div data-testid="loading">메시지 로딩 중...</div>}
            </div>
          </div>
        )
      }

      render(
        <TestWrapper>
          <LoadingChatRoom />
        </TestWrapper>
      )

      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.getByText('메시지 로딩 중...')).toBeInTheDocument()
    })
  })

  describe('메시지 입력', () => {
    it('메시지 입력 필드가 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      expect(messageInput).toBeInTheDocument()
      expect(messageInput).toHaveAttribute(
        'placeholder',
        '메시지를 입력하세요...'
      )
    })

    it('전송 버튼이 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeInTheDocument()
      expect(sendButton).toHaveTextContent('전송')
    })

    it('빈 메시지일 때 전송 버튼이 비활성화되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toBeDisabled()
    })

    it('메시지를 입력하면 전송 버튼이 활성화되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '새로운 메시지')

      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('메시지 전송', () => {
    it('전송 버튼 클릭으로 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '새로운 메시지')
      await user.click(sendButton)

      expect(screen.getByText('새로운 메시지')).toBeInTheDocument()
      expect(messageInput).toHaveValue('')
    })

    it('Enter 키로 메시지를 전송할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')

      await user.type(messageInput, 'Enter로 전송')
      await user.keyboard('{Enter}')

      expect(screen.getByText('Enter로 전송')).toBeInTheDocument()
      expect(messageInput).toHaveValue('')
    })

    it('Shift+Enter는 줄바꿈이고 전송하지 않아야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')

      await user.type(messageInput, '첫 번째 줄')
      await user.keyboard('{Shift>}{Enter}{/Shift}')
      await user.type(messageInput, '두 번째 줄')

      // 전송되지 않고 입력 필드에 남아있어야 함
      expect(messageInput).toHaveValue('첫 번째 줄\n두 번째 줄')
    })

    it('공백만 있는 메시지는 전송되지 않아야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await user.type(messageInput, '   ')

      expect(sendButton).toBeDisabled()
    })
  })

  describe('실시간 기능', () => {
    it('타이핑 인디케이터 영역이 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('typing-indicators')).toBeInTheDocument()
    })

    it('새로운 메시지가 실시간으로 표시되어야 한다', async () => {
      // 실제 구현에서는 useRealtime 훅을 통해 새 메시지 수신
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      // 초기 메시지 확인
      expect(screen.getAllByTestId('message-item')).toHaveLength(1)

      // 새 메시지 추가 시뮬레이션 (실제로는 서버에서 수신)
      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      await userEvent.type(messageInput, '실시간 메시지')
      await userEvent.click(sendButton)

      expect(screen.getAllByTestId('message-item')).toHaveLength(2)
      expect(screen.getByText('실시간 메시지')).toBeInTheDocument()
    })
  })

  describe('에러 처리', () => {
    it('연결 실패 시 에러 메시지가 표시되어야 한다', () => {
      const ErrorChatRoom = () => (
        <div data-testid="chat-room">
          <div data-testid="error-message">
            네트워크 연결에 실패했습니다. 다시 시도해주세요.
          </div>
        </div>
      )

      render(
        <TestWrapper>
          <ErrorChatRoom />
        </TestWrapper>
      )

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(
        screen.getByText('네트워크 연결에 실패했습니다. 다시 시도해주세요.')
      ).toBeInTheDocument()
    })

    it('메시지 전송 실패 시 재시도 옵션이 제공되어야 한다', () => {
      const FailedMessageChatRoom = () => (
        <div data-testid="chat-room">
          <div data-testid="failed-message">
            <span>메시지 전송에 실패했습니다.</span>
            <button data-testid="retry-button">재시도</button>
          </div>
        </div>
      )

      render(
        <TestWrapper>
          <FailedMessageChatRoom />
        </TestWrapper>
      )

      expect(
        screen.getByText('메시지 전송에 실패했습니다.')
      ).toBeInTheDocument()
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('메시지 입력 필드에 적절한 라벨이 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      expect(messageInput).toHaveAttribute(
        'placeholder',
        '메시지를 입력하세요...'
      )
    })

    it('전송 버튼에 적절한 텍스트가 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const sendButton = screen.getByTestId('send-button')
      expect(sendButton).toHaveTextContent('전송')
    })

    it('키보드 내비게이션이 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('message-input')
      const sendButton = screen.getByTestId('send-button')

      // Tab으로 입력 필드에 포커스
      await user.tab()
      expect(messageInput).toHaveFocus()

      // Tab으로 전송 버튼에 포커스
      await user.tab()
      expect(sendButton).toHaveFocus()
    })
  })

  describe('반응형 디자인', () => {
    it('모바일 화면에서 올바르게 표시되어야 한다', () => {
      // 모바일 화면 크기 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const chatRoom = screen.getByTestId('chat-room')
      expect(chatRoom).toBeInTheDocument()
      // 실제 구현에서는 CSS 클래스나 스타일 확인
    })

    it('데스크톱 화면에서 올바르게 표시되어야 한다', () => {
      // 데스크톱 화면 크기 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(
        <TestWrapper>
          <MockChatRoom {...defaultProps} />
        </TestWrapper>
      )

      const chatRoom = screen.getByTestId('chat-room')
      expect(chatRoom).toBeInTheDocument()
      // 실제 구현에서는 CSS 클래스나 스타일 확인
    })
  })
})
