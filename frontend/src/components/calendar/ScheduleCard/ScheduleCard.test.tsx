import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock 컴포넌트 (실제 구현이 완성되면 이 부분을 제거하고 실제 컴포넌트 사용)
const MockScheduleCard = ({
  schedule,
  variant = 'default',
  showTime = true,
  showParticipants = true,
  onClick = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onParticipantUpdate = vi.fn(),
  onRequestChange = vi.fn(),
  currentUserId = 1,
  userRole = 'member',
  conflictWarning = false,
  isEditable = false,
  showActions = true,
  ...props
}: any) => {
  const isLeader = userRole === 'leader'
  const canEdit = isLeader || schedule.creator_id === currentUserId || isEditable
  const hasConflict = conflictWarning || schedule.hasConflict

  return (
    <div
      data-testid="schedule-card"
      className={`schedule-card ${variant} ${hasConflict ? 'conflict' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`일정: ${schedule.title}`}
      {...props}
    >
      <div className="schedule-header">
        <h3 className="schedule-title" data-testid="schedule-title">
          {schedule.title}
        </h3>
        {hasConflict && (
          <div
            data-testid="conflict-warning"
            className="conflict-badge"
            role="alert"
            aria-label="일정 충돌 경고"
          >
            충돌
          </div>
        )}
        {canEdit && showActions && (
          <div className="schedule-actions" data-testid="schedule-actions">
            <button
              data-testid="edit-button"
              aria-label="일정 수정"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(schedule)
              }}
            >
              수정
            </button>
            <button
              data-testid="delete-button"
              aria-label="일정 삭제"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(schedule.id)
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {schedule.description && (
        <p className="schedule-description" data-testid="schedule-description">
          {schedule.description}
        </p>
      )}

      {showTime && (
        <div className="schedule-time" data-testid="schedule-time">
          <time dateTime={schedule.start_time}>
            {new Date(schedule.start_time).toLocaleString('ko-KR')}
          </time>
          {' - '}
          <time dateTime={schedule.end_time}>
            {new Date(schedule.end_time).toLocaleString('ko-KR')}
          </time>
        </div>
      )}

      {schedule.location && (
        <div className="schedule-location" data-testid="schedule-location">
          📍 {schedule.location}
        </div>
      )}

      {showParticipants && schedule.participants && (
        <div className="schedule-participants" data-testid="participants">
          <h4>참석자 ({schedule.participants.length}명)</h4>
          <div className="participants-list" role="list">
            {schedule.participants.map((participant: any) => (
              <div
                key={participant.id}
                data-testid={`participant-${participant.user_id}`}
                className={`participant ${participant.status}`}
                role="listitem"
              >
                <span className="participant-name">
                  {participant.user.full_name}
                </span>
                <span
                  className={`participant-status status-${participant.status}`}
                  data-testid={`participant-status-${participant.user_id}`}
                >
                  {participant.status === 'accepted' ? '참석' :
                   participant.status === 'declined' ? '불참' : '대기'}
                </span>
                {!isLeader && currentUserId === participant.user_id && (
                  <div className="participant-actions" data-testid="participant-actions">
                    {participant.status !== 'accepted' && (
                      <button
                        data-testid="accept-button"
                        aria-label="참석 확인"
                        onClick={(e) => {
                          e.stopPropagation()
                          onParticipantUpdate(schedule.id, 'accepted')
                        }}
                      >
                        참석
                      </button>
                    )}
                    {participant.status !== 'declined' && (
                      <button
                        data-testid="decline-button"
                        aria-label="참석 거부"
                        onClick={(e) => {
                          e.stopPropagation()
                          onParticipantUpdate(schedule.id, 'declined')
                        }}
                      >
                        불참
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 팀원의 일정 변경 요청 */}
      {!canEdit && showActions && (
        <div className="schedule-request" data-testid="schedule-request">
          <button
            data-testid="request-change-button"
            aria-label="일정 변경 요청"
            onClick={(e) => {
              e.stopPropagation()
              onRequestChange(schedule)
            }}
          >
            변경 요청
          </button>
        </div>
      )}

      {/* 우선순위 표시 */}
      {schedule.priority && schedule.priority !== 'normal' && (
        <div
          className={`priority-indicator priority-${schedule.priority}`}
          data-testid="priority-indicator"
          aria-label={`우선순위: ${schedule.priority}`}
        >
          {schedule.priority === 'high' ? '🔴' :
           schedule.priority === 'medium' ? '🟡' : '🟢'}
        </div>
      )}

      {/* 색상 코딩 표시 */}
      <div className="schedule-footer">
        <div
          className={`schedule-color-indicator ${schedule.priority || 'normal'}`}
          data-testid="color-indicator"
          aria-hidden="true"
        />
        <span className="schedule-creator" data-testid="schedule-creator">
          생성자: {schedule.creator?.full_name || '알 수 없음'}
        </span>
        {schedule.created_at && (
          <span className="schedule-created" data-testid="schedule-created">
            생성일: {new Date(schedule.created_at).toLocaleDateString('ko-KR')}
          </span>
        )}
      </div>

      {/* 반복 일정 표시 */}
      {schedule.recurring && (
        <div className="recurring-indicator" data-testid="recurring-indicator">
          🔄 반복 일정
        </div>
      )}

      {/* 알림 설정 표시 */}
      {schedule.reminder_minutes && (
        <div className="reminder-indicator" data-testid="reminder-indicator">
          🔔 {schedule.reminder_minutes}분 전 알림
        </div>
      )}
    </div>
  )
}

// 테스트용 데이터
const mockSchedule = {
  id: 1,
  title: '팀 회의',
  description: '주간 개발팀 회의입니다.',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T11:00:00Z',
  location: '회의실 A',
  team_id: 1,
  creator_id: 1,
  priority: 'high',
  hasConflict: false,
  created_at: '2023-12-28T09:00:00Z',
  recurring: false,
  reminder_minutes: 15,
  creator: {
    id: 1,
    full_name: '팀장',
  },
  participants: [
    {
      id: 1,
      schedule_id: 1,
      user_id: 1,
      status: 'accepted',
      user: {
        id: 1,
        username: 'leader',
        full_name: '팀장',
      },
    },
    {
      id: 2,
      schedule_id: 1,
      user_id: 2,
      status: 'pending',
      user: {
        id: 2,
        username: 'member',
        full_name: '팀원',
      },
    },
  ],
}

const conflictSchedule = {
  ...mockSchedule,
  id: 2,
  title: '충돌 일정',
  hasConflict: true,
}

const recurringSchedule = {
  ...mockSchedule,
  id: 3,
  title: '매주 반복 회의',
  recurring: true,
}

const minimalSchedule = {
  id: 4,
  title: '최소 정보 일정',
  start_time: '2024-01-01T14:00:00Z',
  end_time: '2024-01-01T15:00:00Z',
  team_id: 1,
  creator_id: 1,
}

// 테스트 래퍼
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('ScheduleCard 컴포넌트', () => {
  const defaultProps = {
    schedule: mockSchedule,
    onClick: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onParticipantUpdate: vi.fn(),
    onRequestChange: vi.fn(),
    currentUserId: 1,
    userRole: 'member',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('일정 카드가 올바르게 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-title')).toHaveTextContent('팀 회의')
      expect(screen.getByTestId('schedule-description')).toHaveTextContent('주간 개발팀 회의입니다.')
    })

    it('시간 정보가 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-time')).toBeInTheDocument()
      const timeElement = screen.getByTestId('schedule-time')
      expect(timeElement).toHaveTextContent('2024. 1. 1.')
    })

    it('위치 정보가 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-location')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-location')).toHaveTextContent('📍 회의실 A')
    })

    it('참가자 정보가 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('participants')).toBeInTheDocument()
      expect(screen.getByText('참석자 (2명)')).toBeInTheDocument()
      expect(screen.getByTestId('participant-1')).toBeInTheDocument()
      expect(screen.getByTestId('participant-2')).toBeInTheDocument()
    })

    it('색상 표시기가 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('color-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('color-indicator')).toHaveClass('high')
    })

    it('생성자 정보가 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-creator')).toHaveTextContent('생성자: 팀장')
    })

    it('생성일이 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-created')).toBeInTheDocument()
    })

    it('우선순위 표시기가 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('priority-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('priority-indicator')).toHaveTextContent('🔴')
    })

    it('알림 설정이 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('reminder-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('reminder-indicator')).toHaveTextContent('🔔 15분 전 알림')
    })
  })

  describe('권한 기반 동작', () => {
    it('팀장은 수정/삭제 버튼을 볼 수 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-actions')).toBeInTheDocument()
      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
    })

    it('일정 생성자는 수정/삭제 버튼을 볼 수 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={1} // 생성자와 동일
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-actions')).toBeInTheDocument()
      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('delete-button')).toBeInTheDocument()
    })

    it('일반 팀원은 변경 요청 버튼만 볼 수 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={2} // 생성자와 다름
          />
        </TestWrapper>
      )

      expect(screen.queryByTestId('schedule-actions')).not.toBeInTheDocument()
      expect(screen.getByTestId('schedule-request')).toBeInTheDocument()
      expect(screen.getByTestId('request-change-button')).toBeInTheDocument()
    })

    it('팀원은 자신의 참석 상태를 변경할 수 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={2} // participant 2와 동일
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('participant-actions')).toBeInTheDocument()
      expect(screen.getByTestId('accept-button')).toBeInTheDocument()
      expect(screen.getByTestId('decline-button')).toBeInTheDocument()
    })

    it('이미 참석 확인한 사용자는 참석 버튼이 보이지 않는다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={1} // participant 1 (이미 accepted)
          />
        </TestWrapper>
      )

      expect(screen.queryByTestId('accept-button')).not.toBeInTheDocument()
      expect(screen.getByTestId('decline-button')).toBeInTheDocument()
    })

    it('isEditable prop이 true면 일반 사용자도 수정할 수 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={3} // 생성자 아님
            isEditable={true}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-actions')).toBeInTheDocument()
    })

    it('showActions이 false면 액션 버튼들이 숨겨진다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="leader"
            showActions={false}
          />
        </TestWrapper>
      )

      expect(screen.queryByTestId('schedule-actions')).not.toBeInTheDocument()
      expect(screen.queryByTestId('schedule-request')).not.toBeInTheDocument()
    })
  })

  describe('사용자 상호작용', () => {
    it('카드 클릭 시 onClick이 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('schedule-card'))
      expect(defaultProps.onClick).toHaveBeenCalled()
    })

    it('수정 버튼 클릭 시 onEdit이 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('edit-button'))
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockSchedule)
    })

    it('삭제 버튼 클릭 시 onDelete가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('delete-button'))
      expect(defaultProps.onDelete).toHaveBeenCalledWith(mockSchedule.id)
    })

    it('참석 버튼 클릭 시 onParticipantUpdate가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={2}
          />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('accept-button'))
      expect(defaultProps.onParticipantUpdate).toHaveBeenCalledWith(
        mockSchedule.id,
        'accepted'
      )
    })

    it('불참 버튼 클릭 시 onParticipantUpdate가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={2}
          />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('decline-button'))
      expect(defaultProps.onParticipantUpdate).toHaveBeenCalledWith(
        mockSchedule.id,
        'declined'
      )
    })

    it('변경 요청 버튼 클릭 시 onRequestChange가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={2}
          />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('request-change-button'))
      expect(defaultProps.onRequestChange).toHaveBeenCalledWith(mockSchedule)
    })

    it('액션 버튼 클릭 시 카드 클릭 이벤트가 전파되지 않는다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('edit-button'))
      expect(defaultProps.onClick).not.toHaveBeenCalled()
    })

    it('키보드로 카드가 활성화된다', async () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      card.focus()

      fireEvent.keyDown(card, { key: 'Enter' })
      expect(defaultProps.onClick).toHaveBeenCalled()
    })

    it('Space 키로 카드가 활성화된다', async () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      card.focus()

      fireEvent.keyDown(card, { key: ' ' })
      expect(defaultProps.onClick).toHaveBeenCalled()
    })
  })

  describe('충돌 경고', () => {
    it('충돌 경고가 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={conflictSchedule}
            conflictWarning={true}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('conflict-warning')).toBeInTheDocument()
      expect(screen.getByText('충돌')).toBeInTheDocument()
    })

    it('충돌 스타일이 적용된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={conflictSchedule}
            conflictWarning={true}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toHaveClass('conflict')
    })

    it('충돌이 없는 경우 경고가 표시되지 않는다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('conflict-warning')).not.toBeInTheDocument()
      expect(screen.getByTestId('schedule-card')).not.toHaveClass('conflict')
    })

    it('hasConflict 속성에 의해서도 충돌이 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={conflictSchedule}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('conflict-warning')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-card')).toHaveClass('conflict')
    })
  })

  describe('카드 변형 (Variants)', () => {
    it('컴팩트 변형이 적용된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            variant="compact"
            showTime={false}
            showParticipants={false}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toHaveClass('compact')
      expect(screen.queryByTestId('schedule-time')).not.toBeInTheDocument()
      expect(screen.queryByTestId('participants')).not.toBeInTheDocument()
    })

    it('상세 변형이 적용된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            variant="detailed"
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toHaveClass('detailed')
      expect(screen.getByTestId('schedule-time')).toBeInTheDocument()
      expect(screen.getByTestId('participants')).toBeInTheDocument()
    })

    it('미니 변형에서는 최소 정보만 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            variant="mini"
            showTime={false}
            showParticipants={false}
            showActions={false}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toHaveClass('mini')
      expect(screen.getByTestId('schedule-title')).toBeInTheDocument()
      expect(screen.queryByTestId('schedule-time')).not.toBeInTheDocument()
      expect(screen.queryByTestId('participants')).not.toBeInTheDocument()
      expect(screen.queryByTestId('schedule-actions')).not.toBeInTheDocument()
    })
  })

  describe('참가자 상태 표시', () => {
    it('참석 상태가 올바르게 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const acceptedParticipant = screen.getByTestId('participant-1')
      const pendingParticipant = screen.getByTestId('participant-2')

      expect(within(acceptedParticipant).getByText('참석')).toBeInTheDocument()
      expect(within(pendingParticipant).getByText('대기')).toBeInTheDocument()
    })

    it('불참 상태가 올바르게 표시된다', () => {
      const scheduleWithDeclined = {
        ...mockSchedule,
        participants: [
          ...mockSchedule.participants,
          {
            id: 3,
            schedule_id: 1,
            user_id: 3,
            status: 'declined',
            user: {
              id: 3,
              username: 'declined-user',
              full_name: '불참자',
            },
          },
        ],
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={scheduleWithDeclined}
          />
        </TestWrapper>
      )

      const declinedParticipant = screen.getByTestId('participant-3')
      expect(within(declinedParticipant).getByText('불참')).toBeInTheDocument()
    })

    it('참가자별 상태 테스트 ID가 올바르게 생성된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('participant-status-1')).toHaveTextContent('참석')
      expect(screen.getByTestId('participant-status-2')).toHaveTextContent('대기')
    })
  })

  describe('특수 기능 표시', () => {
    it('반복 일정 표시기가 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={recurringSchedule}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('recurring-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('recurring-indicator')).toHaveTextContent('🔄 반복 일정')
    })

    it('일반 일정에서는 반복 표시기가 보이지 않는다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('recurring-indicator')).not.toBeInTheDocument()
    })

    it('우선순위별로 다른 아이콘이 표시된다', () => {
      const mediumPrioritySchedule = { ...mockSchedule, priority: 'medium' }
      const lowPrioritySchedule = { ...mockSchedule, priority: 'low' }

      const { rerender } = render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} schedule={mediumPrioritySchedule} />
        </TestWrapper>
      )

      expect(screen.getByTestId('priority-indicator')).toHaveTextContent('🟡')

      rerender(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} schedule={lowPrioritySchedule} />
        </TestWrapper>
      )

      expect(screen.getByTestId('priority-indicator')).toHaveTextContent('🟢')
    })

    it('일반 우선순위에서는 우선순위 표시기가 보이지 않는다', () => {
      const normalPrioritySchedule = { ...mockSchedule, priority: 'normal' }

      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} schedule={normalPrioritySchedule} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('priority-indicator')).not.toBeInTheDocument()
    })

    it('알림이 설정되지 않은 경우 알림 표시기가 보이지 않는다', () => {
      const noReminderSchedule = { ...mockSchedule, reminder_minutes: null }

      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} schedule={noReminderSchedule} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('reminder-indicator')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('스크린 리더를 위한 적절한 라벨이 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      expect(card).toHaveAttribute('aria-label', '일정: 팀 회의')
      expect(card).toHaveAttribute('role', 'button')
    })

    it('충돌 경고가 스크린 리더에 알려진다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={conflictSchedule}
          />
        </TestWrapper>
      )

      const conflictWarning = screen.getByTestId('conflict-warning')
      expect(conflictWarning).toHaveAttribute('role', 'alert')
      expect(conflictWarning).toHaveAttribute('aria-label', '일정 충돌 경고')
    })

    it('버튼들이 적절한 aria-label을 가진다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      expect(screen.getByTestId('edit-button')).toHaveAttribute('aria-label', '일정 수정')
      expect(screen.getByTestId('delete-button')).toHaveAttribute('aria-label', '일정 삭제')
    })

    it('참가자 액션 버튼들이 적절한 aria-label을 가진다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            userRole="member"
            currentUserId={2}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('accept-button')).toHaveAttribute('aria-label', '참석 확인')
      expect(screen.getByTestId('decline-button')).toHaveAttribute('aria-label', '참석 거부')
    })

    it('참가자 목록이 적절한 role을 가진다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const participantsList = screen.getByRole('list')
      expect(participantsList).toBeInTheDocument()

      const participantItems = screen.getAllByRole('listitem')
      expect(participantItems).toHaveLength(2)
    })

    it('시간 정보가 적절한 datetime 속성을 가진다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const timeElements = screen.getAllByRole('time')
      expect(timeElements[0]).toHaveAttribute('dateTime', mockSchedule.start_time)
      expect(timeElements[1]).toHaveAttribute('dateTime', mockSchedule.end_time)
    })

    it('키보드 포커스가 가능하다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      expect(card).toHaveAttribute('tabIndex', '0')

      card.focus()
      expect(card).toHaveFocus()
    })
  })

  describe('에지 케이스', () => {
    it('참가자가 없는 일정도 렌더링된다', () => {
      const scheduleWithoutParticipants = {
        ...mockSchedule,
        participants: [],
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={scheduleWithoutParticipants}
          />
        </TestWrapper>
      )

      expect(screen.getByText('참석자 (0명)')).toBeInTheDocument()
    })

    it('설명이 없는 일정도 렌더링된다', () => {
      const scheduleWithoutDescription = {
        ...mockSchedule,
        description: '',
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={scheduleWithoutDescription}
          />
        </TestWrapper>
      )

      expect(screen.queryByTestId('schedule-description')).not.toBeInTheDocument()
      expect(screen.getByTestId('schedule-title')).toHaveTextContent('팀 회의')
    })

    it('생성자 정보가 없는 경우 적절히 처리된다', () => {
      const scheduleWithoutCreator = {
        ...mockSchedule,
        creator: null,
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={scheduleWithoutCreator}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-creator')).toHaveTextContent('생성자: 알 수 없음')
    })

    it('위치 정보가 없는 경우 위치 표시기가 보이지 않는다', () => {
      const scheduleWithoutLocation = {
        ...mockSchedule,
        location: '',
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={scheduleWithoutLocation}
          />
        </TestWrapper>
      )

      expect(screen.queryByTestId('schedule-location')).not.toBeInTheDocument()
    })

    it('최소한의 정보만 있는 일정도 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={minimalSchedule}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-title')).toHaveTextContent('최소 정보 일정')
    })

    it('매우 긴 제목을 적절히 처리한다', () => {
      const longTitleSchedule = {
        ...mockSchedule,
        title: 'A'.repeat(200), // 매우 긴 제목
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={longTitleSchedule}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-title')).toBeInTheDocument()
    })

    it('잘못된 날짜 형식에도 견고하게 작동한다', () => {
      const invalidDateSchedule = {
        ...mockSchedule,
        start_time: 'invalid-date',
        end_time: 'invalid-date',
      }

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={invalidDateSchedule}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toBeInTheDocument()
    })
  })

  describe('성능', () => {
    it('많은 참가자가 있어도 적절히 렌더링된다', () => {
      const scheduleWithManyParticipants = {
        ...mockSchedule,
        participants: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          schedule_id: 1,
          user_id: i + 1,
          status: i % 3 === 0 ? 'accepted' : i % 3 === 1 ? 'pending' : 'declined',
          user: {
            id: i + 1,
            username: `user${i + 1}`,
            full_name: `사용자 ${i + 1}`,
          },
        })),
      }

      const startTime = performance.now()

      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            schedule={scheduleWithManyParticipants}
          />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(50) // 50ms 이내 렌더링
      expect(screen.getByText('참석자 (50명)')).toBeInTheDocument()
    })

    it('컴포넌트 언마운트가 깔끔하게 처리된다', () => {
      const { unmount } = render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(() => unmount()).not.toThrow()
    })
  })

  describe('커스터마이제이션', () => {
    it('커스텀 CSS 클래스가 적용된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} className="custom-schedule" />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-card')).toHaveClass('custom-schedule')
    })

    it('커스텀 스타일이 적용된다', () => {
      const customStyle = { backgroundColor: 'blue', color: 'white' }
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} style={customStyle} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      expect(card).toHaveStyle('background-color: blue')
      expect(card).toHaveStyle('color: white')
    })

    it('추가 props가 전달된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard
            {...defaultProps}
            data-custom="test"
            id="custom-id"
          />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      expect(card).toHaveAttribute('data-custom', 'test')
      expect(card).toHaveAttribute('id', 'custom-id')
    })
  })

  describe('이벤트 핸들링', () => {
    it('마우스 이벤트가 적절히 처리된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')

      await user.hover(card)
      await user.unhover(card)
      await user.click(card)

      expect(defaultProps.onClick).toHaveBeenCalled()
    })

    it('터치 이벤트가 지원된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')

      fireEvent.touchStart(card)
      fireEvent.touchEnd(card)

      expect(defaultProps.onClick).toHaveBeenCalled()
    })

    it('컨텍스트 메뉴 이벤트가 처리된다', () => {
      const onContextMenu = vi.fn()
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} onContextMenu={onContextMenu} />
        </TestWrapper>
      )

      const card = screen.getByTestId('schedule-card')
      fireEvent.contextMenu(card)

      expect(onContextMenu).toHaveBeenCalled()
    })
  })
})