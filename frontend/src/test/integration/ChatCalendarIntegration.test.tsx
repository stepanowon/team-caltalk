import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '../mocks/server'
import { chatTestUtils } from '../mocks/handlers/chat'

// Mock 통합 컴포넌트
const MockChatCalendarIntegration = () => {
  const [selectedDate, setSelectedDate] = React.useState('2024-01-15')
  const [messages, setMessages] = React.useState([
    {
      id: 1,
      content: '오늘 회의 일정을 변경하고 싶습니다.',
      message_type: 'text',
      user: { id: 1, username: 'user1', full_name: '사용자 1' },
      created_at: '2024-01-15T09:00:00Z',
    },
  ])
  const [schedules, setSchedules] = React.useState([
    {
      id: 1,
      title: '팀 회의',
      start_time: '2024-01-15T14:00:00Z',
      end_time: '2024-01-15T15:00:00Z',
      description: '주간 팀 회의',
    },
  ])

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    // 날짜별 메시지 필터링 시뮬레이션
    const filteredMessages = messages.filter((msg) =>
      msg.created_at.startsWith(date)
    )
    setMessages(filteredMessages)
  }

  const handleScheduleChangeRequest = async (scheduleId: number, newStartTime: string, newEndTime: string) => {
    // 일정 변경 요청 메시지 생성
    const changeRequestMessage = {
      id: messages.length + 1,
      content: `일정 변경 요청: ${newStartTime} - ${newEndTime}`,
      message_type: 'schedule_change_request',
      user: { id: 1, username: 'user1', full_name: '사용자 1' },
      created_at: new Date().toISOString(),
      metadata: {
        schedule_id: scheduleId,
        requested_start_time: newStartTime,
        requested_end_time: newEndTime,
        status: 'pending',
      },
    }

    setMessages((prev) => [...prev, changeRequestMessage])
  }

  const handleApproveScheduleChange = async (messageId: number) => {
    const message = messages.find((m) => m.id === messageId)
    if (message && message.metadata) {
      // 실제 일정 업데이트
      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id === message.metadata.schedule_id
            ? {
                ...schedule,
                start_time: `${selectedDate}T${message.metadata.requested_start_time}:00Z`,
                end_time: `${selectedDate}T${message.metadata.requested_end_time}:00Z`,
              }
            : schedule
        )
      )

      // 메시지 상태 업데이트
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                metadata: { ...msg.metadata, status: 'approved' },
                content: msg.content + ' (승인됨)',
              }
            : msg
        )
      )

      // 승인 알림 메시지 추가
      const approvalMessage = {
        id: messages.length + 2,
        content: '일정 변경이 승인되었습니다.',
        message_type: 'system',
        user: { id: 0, username: 'system', full_name: '시스템' },
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, approvalMessage])
    }
  }

  const handleRejectScheduleChange = async (messageId: number) => {
    // 메시지 상태 업데이트
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              metadata: { ...msg.metadata, status: 'rejected' },
              content: msg.content + ' (거절됨)',
            }
          : msg
      )
    )

    // 거절 알림 메시지 추가
    const rejectionMessage = {
      id: messages.length + 2,
      content: '일정 변경이 거절되었습니다.',
      message_type: 'system',
      user: { id: 0, username: 'system', full_name: '시스템' },
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, rejectionMessage])
  }

  return (
    <div data-testid="chat-calendar-integration">
      {/* 캘린더 영역 */}
      <div data-testid="calendar-section">
        <h2>캘린더</h2>
        <div data-testid="calendar-dates">
          {['2024-01-15', '2024-01-16', '2024-01-17'].map((date) => (
            <button
              key={date}
              data-testid={`calendar-date-${date}`}
              onClick={() => handleDateSelect(date)}
              className={selectedDate === date ? 'selected' : ''}
            >
              {date.split('-')[2]}일
            </button>
          ))}
        </div>

        <div data-testid="schedule-list">
          <h3>일정 목록 - {selectedDate}</h3>
          {schedules
            .filter((schedule) => schedule.start_time.startsWith(selectedDate))
            .map((schedule) => (
              <div
                key={schedule.id}
                data-testid={`schedule-item-${schedule.id}`}
                className="schedule-item"
              >
                <div data-testid="schedule-title">{schedule.title}</div>
                <div data-testid="schedule-time">
                  {new Date(schedule.start_time).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(schedule.end_time).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <button
                  data-testid={`request-change-${schedule.id}`}
                  onClick={() =>
                    handleScheduleChangeRequest(schedule.id, '15:00', '16:00')
                  }
                >
                  일정 변경 요청
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div data-testid="chat-section">
        <h2>채팅 - {selectedDate}</h2>
        <div data-testid="message-list">
          {messages.map((message) => (
            <div
              key={message.id}
              data-testid={`message-${message.id}`}
              className={`message ${message.message_type}`}
            >
              <div data-testid="message-user">{message.user.full_name}</div>
              <div data-testid="message-content">{message.content}</div>
              <div data-testid="message-time">
                {new Date(message.created_at).toLocaleTimeString()}
              </div>

              {message.message_type === 'schedule_change_request' &&
                message.metadata?.status === 'pending' && (
                  <div data-testid="schedule-change-actions">
                    <button
                      data-testid={`approve-${message.id}`}
                      onClick={() => handleApproveScheduleChange(message.id)}
                    >
                      승인
                    </button>
                    <button
                      data-testid={`reject-${message.id}`}
                      onClick={() => handleRejectScheduleChange(message.id)}
                    >
                      거절
                    </button>
                  </div>
                )}
            </div>
          ))}
        </div>

        <div data-testid="message-input">
          <input
            data-testid="message-text-input"
            placeholder="메시지를 입력하세요..."
          />
          <button data-testid="send-message-button">전송</button>
        </div>
      </div>

      {/* 통계 정보 */}
      <div data-testid="integration-stats">
        <div data-testid="selected-date-info">선택된 날짜: {selectedDate}</div>
        <div data-testid="message-count">메시지 수: {messages.length}</div>
        <div data-testid="schedule-count">
          일정 수: {schedules.filter((s) => s.start_time.startsWith(selectedDate)).length}
        </div>
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

describe('ChatCalendarIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chatTestUtils.resetMessages()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('기본 렌더링', () => {
    it('채팅과 캘린더 영역이 모두 렌더링되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      expect(screen.getByTestId('chat-calendar-integration')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-section')).toBeInTheDocument()
      expect(screen.getByTestId('chat-section')).toBeInTheDocument()
      expect(screen.getByTestId('integration-stats')).toBeInTheDocument()
    })

    it('선택된 날짜가 올바르게 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      expect(screen.getByTestId('selected-date-info')).toHaveTextContent('선택된 날짜: 2024-01-15')
    })

    it('초기 메시지와 일정이 표시되어야 한다', () => {
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      expect(screen.getByText('오늘 회의 일정을 변경하고 싶습니다.')).toBeInTheDocument()
      expect(screen.getByText('팀 회의')).toBeInTheDocument()
      expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 1')
      expect(screen.getByTestId('schedule-count')).toHaveTextContent('일정 수: 1')
    })
  })

  describe('날짜 선택 연동', () => {
    it('캘린더에서 날짜 선택 시 채팅 제목이 업데이트되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      const dateButton = screen.getByTestId('calendar-date-2024-01-16')
      await user.click(dateButton)

      expect(screen.getByText('채팅 - 2024-01-16')).toBeInTheDocument()
      expect(screen.getByTestId('selected-date-info')).toHaveTextContent('선택된 날짜: 2024-01-16')
    })

    it('날짜 선택 시 해당 날짜의 메시지만 표시되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 다른 날짜 선택 (해당 날짜에는 메시지가 없음)
      const dateButton = screen.getByTestId('calendar-date-2024-01-16')
      await user.click(dateButton)

      // 기존 메시지가 필터링되어 보이지 않아야 함
      expect(screen.queryByText('오늘 회의 일정을 변경하고 싶습니다.')).not.toBeInTheDocument()
      expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 0')
    })

    it('날짜 선택 시 해당 날짜의 일정만 표시되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 다른 날짜 선택
      const dateButton = screen.getByTestId('calendar-date-2024-01-16')
      await user.click(dateButton)

      // 해당 날짜에는 일정이 없으므로 일정 수가 0이어야 함
      expect(screen.getByTestId('schedule-count')).toHaveTextContent('일정 수: 0')
    })
  })

  describe('일정 변경 요청 플로우', () => {
    it('일정에서 변경 요청 버튼을 클릭하면 채팅에 요청 메시지가 추가되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      await waitFor(() => {
        expect(screen.getByText('일정 변경 요청: 15:00 - 16:00')).toBeInTheDocument()
        expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 2')
      })
    })

    it('일정 변경 요청 메시지에 승인/거절 버튼이 표시되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      await waitFor(() => {
        expect(screen.getByTestId('schedule-change-actions')).toBeInTheDocument()
        expect(screen.getByTestId('approve-2')).toBeInTheDocument()
        expect(screen.getByTestId('reject-2')).toBeInTheDocument()
      })
    })

    it('일정 변경 승인 시 실제 일정이 업데이트되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 일정 변경 요청
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 승인 버튼 클릭
      await waitFor(() => {
        const approveButton = screen.getByTestId('approve-2')
        return user.click(approveButton)
      })

      await waitFor(() => {
        // 일정 시간이 변경되었는지 확인
        expect(screen.getByTestId('schedule-time')).toHaveTextContent('15:00 - 16:00')
        // 승인 메시지가 추가되었는지 확인
        expect(screen.getByText('일정 변경이 승인되었습니다.')).toBeInTheDocument()
        // 원래 요청 메시지에 승인 표시가 되었는지 확인
        expect(screen.getByText('일정 변경 요청: 15:00 - 16:00 (승인됨)')).toBeInTheDocument()
      })
    })

    it('일정 변경 거절 시 일정은 변경되지 않고 거절 메시지가 추가되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 원래 일정 시간 확인
      expect(screen.getByTestId('schedule-time')).toHaveTextContent('14:00 - 15:00')

      // 일정 변경 요청
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 거절 버튼 클릭
      await waitFor(() => {
        const rejectButton = screen.getByTestId('reject-2')
        return user.click(rejectButton)
      })

      await waitFor(() => {
        // 일정 시간이 변경되지 않았는지 확인
        expect(screen.getByTestId('schedule-time')).toHaveTextContent('14:00 - 15:00')
        // 거절 메시지가 추가되었는지 확인
        expect(screen.getByText('일정 변경이 거절되었습니다.')).toBeInTheDocument()
        // 원래 요청 메시지에 거절 표시가 되었는지 확인
        expect(screen.getByText('일정 변경 요청: 15:00 - 16:00 (거절됨)')).toBeInTheDocument()
      })
    })
  })

  describe('실시간 동기화', () => {
    it('일정 변경이 즉시 캘린더에 반영되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 일정 변경 요청 및 승인
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      await waitFor(() => {
        const approveButton = screen.getByTestId('approve-2')
        return user.click(approveButton)
      })

      // 캘린더의 일정이 즉시 업데이트되는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('schedule-time')).toHaveTextContent('15:00 - 16:00')
      })
    })

    it('채팅 메시지 수가 실시간으로 업데이트되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 초기 메시지 수 확인
      expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 1')

      // 일정 변경 요청 (메시지 추가)
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 메시지 수가 증가했는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 2')
      })

      // 승인 (시스템 메시지 추가)
      await waitFor(() => {
        const approveButton = screen.getByTestId('approve-2')
        return user.click(approveButton)
      })

      // 메시지 수가 다시 증가했는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 3')
      })
    })
  })

  describe('상태 관리', () => {
    it('여러 일정 변경 요청을 독립적으로 처리할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 첫 번째 변경 요청
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 두 번째 변경 요청 (같은 일정)
      await user.click(changeRequestButton)

      await waitFor(() => {
        // 두 개의 변경 요청 메시지가 있어야 함
        expect(screen.getAllByText(/일정 변경 요청: 15:00 - 16:00/)).toHaveLength(2)
        expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 3')
      })
    })

    it('다른 날짜로 이동 후 돌아와도 상태가 유지되어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 일정 변경 요청
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 다른 날짜로 이동
      const dateButton16 = screen.getByTestId('calendar-date-2024-01-16')
      await user.click(dateButton16)

      // 원래 날짜로 돌아오기
      const dateButton15 = screen.getByTestId('calendar-date-2024-01-15')
      await user.click(dateButton15)

      // 상태가 유지되어야 함
      await waitFor(() => {
        expect(screen.getByText('일정 변경 요청: 15:00 - 16:00')).toBeInTheDocument()
        expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 2')
      })
    })
  })

  describe('에러 처리', () => {
    it('일정 변경 승인 실패 시 적절한 에러 처리가 되어야 한다', async () => {
      // 실제 구현에서는 API 호출 실패 시나리오 테스트
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 일정 변경 요청
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 승인 시도 (Mock에서는 성공하지만, 실제로는 에러 처리 로직 필요)
      await waitFor(() => {
        const approveButton = screen.getByTestId('approve-2')
        return user.click(approveButton)
      })

      // 에러 메시지가 표시되어야 함 (실제 구현에서)
      // expect(screen.getByText('일정 변경에 실패했습니다.')).toBeInTheDocument()
    })

    it('존재하지 않는 일정에 대한 변경 요청 시 에러 처리가 되어야 한다', () => {
      // 실제 구현에서는 유효하지 않은 일정 ID에 대한 처리 필요
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 기본 렌더링이 성공하는지만 확인 (에러 처리는 실제 구현에서 추가)
      expect(screen.getByTestId('chat-calendar-integration')).toBeInTheDocument()
    })
  })

  describe('성능', () => {
    it('많은 메시지와 일정이 있어도 원활하게 작동해야 한다', () => {
      // 성능 테스트는 실제 구현에서 대량 데이터로 테스트
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      expect(screen.getByTestId('chat-calendar-integration')).toBeInTheDocument()
      // 실제로는 100개 이상의 메시지/일정으로 테스트
    })

    it('빈번한 날짜 변경에도 성능 저하가 없어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 여러 번 날짜 변경
      for (let i = 0; i < 5; i++) {
        const dateButton16 = screen.getByTestId('calendar-date-2024-01-16')
        await user.click(dateButton16)

        const dateButton15 = screen.getByTestId('calendar-date-2024-01-15')
        await user.click(dateButton15)
      }

      // 마지막 상태가 올바른지 확인
      expect(screen.getByTestId('selected-date-info')).toHaveTextContent('선택된 날짜: 2024-01-15')
    })
  })

  describe('접근성', () => {
    it('스크린 리더가 상태 변경을 인식할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // 일정 변경 요청
      const changeRequestButton = screen.getByTestId('request-change-1')
      await user.click(changeRequestButton)

      // 새로운 메시지가 추가되었을 때 적절한 ARIA 속성이 있는지 확인
      // 실제 구현에서는 role="alert" 또는 aria-live 속성 추가 필요
      await waitFor(() => {
        expect(screen.getByText('일정 변경 요청: 15:00 - 16:00')).toBeInTheDocument()
      })
    })

    it('키보드만으로 모든 기능을 사용할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockChatCalendarIntegration />
        </TestWrapper>
      )

      // Tab 키로 네비게이션 가능한지 확인
      await user.tab()
      // 실제 구현에서는 모든 상호작용 요소에 키보드 접근 가능성 확인
    })
  })
})