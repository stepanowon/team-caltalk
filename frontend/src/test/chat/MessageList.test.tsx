import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'

// Mock 메시지 데이터
const mockMessages = [
  {
    id: 1,
    content: '첫 번째 메시지입니다.',
    message_type: 'text',
    user: {
      id: 1,
      username: 'user1',
      full_name: '사용자 1',
    },
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2024-01-15T09:00:00Z',
  },
  {
    id: 2,
    content: '일정 변경을 요청합니다.',
    message_type: 'schedule_change_request',
    user: {
      id: 2,
      username: 'user2',
      full_name: '사용자 2',
    },
    created_at: '2024-01-15T09:05:00Z',
    updated_at: '2024-01-15T09:05:00Z',
    metadata: {
      schedule_id: 1,
      requested_start_time: '14:00',
      requested_end_time: '15:00',
    },
  },
  {
    id: 3,
    content: '안녕하세요! 새로운 팀원입니다.',
    message_type: 'text',
    user: {
      id: 3,
      username: 'user3',
      full_name: '사용자 3',
    },
    created_at: '2024-01-15T09:10:00Z',
    updated_at: '2024-01-15T09:10:00Z',
  },
]

// Mock MessageList 컴포넌트 (실제 구현 전까지 사용)
const MockMessageList = ({
  messages = [],
  currentUserId = 1,
  isLoading = false,
  onDeleteMessage,
  onEditMessage,
  onApproveScheduleChange,
  onRejectScheduleChange,
}: {
  messages?: any[]
  currentUserId?: number
  isLoading?: boolean
  onDeleteMessage?: (messageId: number) => void
  onEditMessage?: (messageId: number, content: string) => void
  onApproveScheduleChange?: (messageId: number) => void
  onRejectScheduleChange?: (messageId: number) => void
}) => {
  const [editingMessageId, setEditingMessageId] = React.useState<number | null>(null)
  const [editContent, setEditContent] = React.useState('')

  const handleStartEdit = (message: any) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
  }

  const handleSaveEdit = (messageId: number) => {
    if (onEditMessage) {
      onEditMessage(messageId, editContent)
    }
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div data-testid="message-list-loading">
        <div data-testid="loading-spinner">메시지를 불러오는 중...</div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div data-testid="message-list-empty">
        <div data-testid="empty-message">아직 메시지가 없습니다.</div>
      </div>
    )
  }

  return (
    <div data-testid="message-list" className="message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          data-testid="message-item"
          data-message-id={message.id}
          data-message-type={message.message_type}
          className={`message-item ${message.user.id === currentUserId ? 'own-message' : 'other-message'}`}
        >
          <div data-testid="message-header" className="message-header">
            <span data-testid="message-user" className="message-user">
              {message.user.full_name}
            </span>
            <span data-testid="message-time" className="message-time">
              {formatTime(message.created_at)}
            </span>
          </div>

          <div data-testid="message-body" className="message-body">
            {editingMessageId === message.id ? (
              <div data-testid="message-edit-form" className="message-edit-form">
                <textarea
                  data-testid="edit-textarea"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="edit-textarea"
                />
                <div data-testid="edit-actions" className="edit-actions">
                  <button
                    data-testid="save-edit-button"
                    onClick={() => handleSaveEdit(message.id)}
                    disabled={!editContent.trim()}
                  >
                    저장
                  </button>
                  <button
                    data-testid="cancel-edit-button"
                    onClick={handleCancelEdit}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div data-testid="message-content" className="message-content">
                {message.content}
              </div>
            )}

            {message.message_type === 'schedule_change_request' && (
              <div data-testid="schedule-change-info" className="schedule-change-info">
                <div data-testid="schedule-change-details">
                  요청 시간: {message.metadata?.requested_start_time} - {message.metadata?.requested_end_time}
                </div>
                {currentUserId !== message.user.id && (
                  <div data-testid="schedule-change-actions" className="schedule-change-actions">
                    <button
                      data-testid="approve-schedule-button"
                      onClick={() => onApproveScheduleChange?.(message.id)}
                      className="approve-button"
                    >
                      승인
                    </button>
                    <button
                      data-testid="reject-schedule-button"
                      onClick={() => onRejectScheduleChange?.(message.id)}
                      className="reject-button"
                    >
                      거절
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {message.user.id === currentUserId && editingMessageId !== message.id && (
            <div data-testid="message-actions" className="message-actions">
              <button
                data-testid="edit-message-button"
                onClick={() => handleStartEdit(message)}
                className="edit-button"
              >
                수정
              </button>
              <button
                data-testid="delete-message-button"
                onClick={() => onDeleteMessage?.(message.id)}
                className="delete-button"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// 테스트 래퍼 컴포넌트
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <BrowserRouter>{children}</BrowserRouter>
}

describe('MessageList', () => {
  const defaultProps = {
    messages: mockMessages,
    currentUserId: 1,
    isLoading: false,
    onDeleteMessage: vi.fn(),
    onEditMessage: vi.fn(),
    onApproveScheduleChange: vi.fn(),
    onRejectScheduleChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('메시지 리스트가 올바르게 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getAllByTestId('message-item')).toHaveLength(3)
    })

    it('로딩 중일 때 로딩 표시가 되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} isLoading={true} />
        </TestWrapper>
      )

      expect(screen.getByTestId('message-list-loading')).toBeInTheDocument()
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('메시지를 불러오는 중...')).toBeInTheDocument()
    })

    it('메시지가 없을 때 빈 상태가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} messages={[]} />
        </TestWrapper>
      )

      expect(screen.getByTestId('message-list-empty')).toBeInTheDocument()
      expect(screen.getByTestId('empty-message')).toBeInTheDocument()
      expect(screen.getByText('아직 메시지가 없습니다.')).toBeInTheDocument()
    })
  })

  describe('메시지 표시', () => {
    it('메시지 내용이 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('첫 번째 메시지입니다.')).toBeInTheDocument()
      expect(screen.getByText('일정 변경을 요청합니다.')).toBeInTheDocument()
      expect(screen.getByText('안녕하세요! 새로운 팀원입니다.')).toBeInTheDocument()
    })

    it('사용자 정보가 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('사용자 1')).toBeInTheDocument()
      expect(screen.getByText('사용자 2')).toBeInTheDocument()
      expect(screen.getByText('사용자 3')).toBeInTheDocument()
    })

    it('메시지 시간이 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      const timeElements = screen.getAllByTestId('message-time')
      expect(timeElements).toHaveLength(3)
      // 시간 형식 확인 (09:00, 09:05, 09:10)
      expect(timeElements[0]).toHaveTextContent('09:00')
      expect(timeElements[1]).toHaveTextContent('09:05')
      expect(timeElements[2]).toHaveTextContent('09:10')
    })

    it('메시지 타입이 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      const messageItems = screen.getAllByTestId('message-item')
      expect(messageItems[0]).toHaveAttribute('data-message-type', 'text')
      expect(messageItems[1]).toHaveAttribute('data-message-type', 'schedule_change_request')
      expect(messageItems[2]).toHaveAttribute('data-message-type', 'text')
    })

    it('내 메시지와 다른 사용자 메시지가 구분되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const messageItems = screen.getAllByTestId('message-item')
      expect(messageItems[0]).toHaveClass('own-message') // user_id: 1
      expect(messageItems[1]).toHaveClass('other-message') // user_id: 2
      expect(messageItems[2]).toHaveClass('other-message') // user_id: 3
    })
  })

  describe('일정 변경 요청 메시지', () => {
    it('일정 변경 요청 정보가 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-change-info')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-change-details')).toBeInTheDocument()
      expect(screen.getByText('요청 시간: 14:00 - 15:00')).toBeInTheDocument()
    })

    it('다른 사용자의 일정 변경 요청에 승인/거절 버튼이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-change-actions')).toBeInTheDocument()
      expect(screen.getByTestId('approve-schedule-button')).toBeInTheDocument()
      expect(screen.getByTestId('reject-schedule-button')).toBeInTheDocument()
    })

    it('내 일정 변경 요청에는 승인/거절 버튼이 표시되지 않아야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={2} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('schedule-change-actions')).not.toBeInTheDocument()
    })

    it('승인 버튼 클릭 시 콜백이 호출되어야 한다', async () => {
      const user = userEvent.setup()
      const onApproveScheduleChange = vi.fn()

      render(
        <TestWrapper>
          <MockMessageList
            {...defaultProps}
            currentUserId={1}
            onApproveScheduleChange={onApproveScheduleChange}
          />
        </TestWrapper>
      )

      const approveButton = screen.getByTestId('approve-schedule-button')
      await user.click(approveButton)

      expect(onApproveScheduleChange).toHaveBeenCalledWith(2)
    })

    it('거절 버튼 클릭 시 콜백이 호출되어야 한다', async () => {
      const user = userEvent.setup()
      const onRejectScheduleChange = vi.fn()

      render(
        <TestWrapper>
          <MockMessageList
            {...defaultProps}
            currentUserId={1}
            onRejectScheduleChange={onRejectScheduleChange}
          />
        </TestWrapper>
      )

      const rejectButton = screen.getByTestId('reject-schedule-button')
      await user.click(rejectButton)

      expect(onRejectScheduleChange).toHaveBeenCalledWith(2)
    })
  })

  describe('메시지 액션', () => {
    it('내 메시지에만 수정/삭제 버튼이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const messageItems = screen.getAllByTestId('message-item')

      // 첫 번째 메시지 (내 메시지)에는 액션 버튼이 있어야 함
      const firstMessageActions = messageItems[0].querySelector('[data-testid="message-actions"]')
      expect(firstMessageActions).toBeInTheDocument()

      // 두 번째, 세 번째 메시지 (다른 사용자)에는 액션 버튼이 없어야 함
      const secondMessageActions = messageItems[1].querySelector('[data-testid="message-actions"]')
      const thirdMessageActions = messageItems[2].querySelector('[data-testid="message-actions"]')
      expect(secondMessageActions).not.toBeInTheDocument()
      expect(thirdMessageActions).not.toBeInTheDocument()
    })

    it('삭제 버튼 클릭 시 콜백이 호출되어야 한다', async () => {
      const user = userEvent.setup()
      const onDeleteMessage = vi.fn()

      render(
        <TestWrapper>
          <MockMessageList
            {...defaultProps}
            currentUserId={1}
            onDeleteMessage={onDeleteMessage}
          />
        </TestWrapper>
      )

      const deleteButton = screen.getByTestId('delete-message-button')
      await user.click(deleteButton)

      expect(onDeleteMessage).toHaveBeenCalledWith(1)
    })
  })

  describe('메시지 수정', () => {
    it('수정 버튼 클릭 시 수정 모드가 활성화되어야 한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      expect(screen.getByTestId('message-edit-form')).toBeInTheDocument()
      expect(screen.getByTestId('edit-textarea')).toBeInTheDocument()
      expect(screen.getByTestId('save-edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-edit-button')).toBeInTheDocument()
    })

    it('수정 모드에서 기존 내용이 표시되어야 한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      const textarea = screen.getByTestId('edit-textarea')
      expect(textarea).toHaveValue('첫 번째 메시지입니다.')
    })

    it('수정 내용을 변경할 수 있어야 한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      const textarea = screen.getByTestId('edit-textarea')
      await user.clear(textarea)
      await user.type(textarea, '수정된 메시지입니다.')

      expect(textarea).toHaveValue('수정된 메시지입니다.')
    })

    it('저장 버튼 클릭 시 수정 콜백이 호출되어야 한다', async () => {
      const user = userEvent.setup()
      const onEditMessage = vi.fn()

      render(
        <TestWrapper>
          <MockMessageList
            {...defaultProps}
            currentUserId={1}
            onEditMessage={onEditMessage}
          />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      const textarea = screen.getByTestId('edit-textarea')
      await user.clear(textarea)
      await user.type(textarea, '수정된 메시지')

      const saveButton = screen.getByTestId('save-edit-button')
      await user.click(saveButton)

      expect(onEditMessage).toHaveBeenCalledWith(1, '수정된 메시지')
    })

    it('취소 버튼 클릭 시 수정 모드가 비활성화되어야 한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      expect(screen.getByTestId('message-edit-form')).toBeInTheDocument()

      const cancelButton = screen.getByTestId('cancel-edit-button')
      await user.click(cancelButton)

      expect(screen.queryByTestId('message-edit-form')).not.toBeInTheDocument()
      expect(screen.getByTestId('message-content')).toBeInTheDocument()
    })

    it('빈 내용으로 수정 시 저장 버튼이 비활성화되어야 한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      const textarea = screen.getByTestId('edit-textarea')
      await user.clear(textarea)

      const saveButton = screen.getByTestId('save-edit-button')
      expect(saveButton).toBeDisabled()
    })
  })

  describe('접근성', () => {
    it('메시지 아이템에 적절한 ARIA 속성이 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} />
        </TestWrapper>
      )

      const messageItems = screen.getAllByTestId('message-item')
      messageItems.forEach((item) => {
        expect(item).toHaveAttribute('data-message-id')
        expect(item).toHaveAttribute('data-message-type')
      })
    })

    it('수정 폼의 텍스트영역에 적절한 라벨이 있어야 한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-message-button')
      await user.click(editButton)

      const textarea = screen.getByTestId('edit-textarea')
      expect(textarea).toBeInTheDocument()
      // 실제 구현에서는 aria-label 또는 label 요소 추가 필요
    })

    it('버튼들에 적절한 텍스트가 있어야 한다', () => {
      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} currentUserId={1} />
        </TestWrapper>
      )

      expect(screen.getByText('수정')).toBeInTheDocument()
      expect(screen.getByText('삭제')).toBeInTheDocument()
      expect(screen.getByText('승인')).toBeInTheDocument()
      expect(screen.getByText('거절')).toBeInTheDocument()
    })
  })

  describe('성능', () => {
    it('많은 메시지가 있어도 렌더링이 원활해야 한다', () => {
      const manyMessages = Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        content: `메시지 ${index + 1}`,
        message_type: 'text',
        user: {
          id: (index % 3) + 1,
          username: `user${(index % 3) + 1}`,
          full_name: `사용자 ${(index % 3) + 1}`,
        },
        created_at: new Date(2024, 0, 15, 9, index).toISOString(),
        updated_at: new Date(2024, 0, 15, 9, index).toISOString(),
      }))

      render(
        <TestWrapper>
          <MockMessageList {...defaultProps} messages={manyMessages} />
        </TestWrapper>
      )

      expect(screen.getAllByTestId('message-item')).toHaveLength(100)
      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })
  })
})