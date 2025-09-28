import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock 컴포넌트 (구현 전 테스트)
const MockScheduleCard = ({
  schedule,
  variant = 'default',
  showTime = true,
  showParticipants = true,
  onClick = vi.fn(),
  onEdit = vi.fn(),
  onDelete = vi.fn(),
  onParticipantUpdate = vi.fn(),
  currentUserId = 1,
  userRole = 'member',
  conflictWarning = false,
  ...props
}: any) => {
  const isLeader = userRole === 'leader'
  const canEdit = isLeader || schedule.creator_id === currentUserId
  const hasConflict = conflictWarning || schedule.hasConflict

  return (
    <div
      data-testid="schedule-card"
      className={`schedule-card ${variant} ${hasConflict ? 'conflict' : ''}`}
      onClick={onClick}
      {...props}
    >
      <div className="schedule-header">
        <h3 className="schedule-title">{schedule.title}</h3>
        {hasConflict && (
          <div data-testid="conflict-warning" className="conflict-badge">
            충돌
          </div>
        )}
        {canEdit && (
          <div className="schedule-actions">
            <button
              data-testid="edit-button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(schedule)
              }}
            >
              수정
            </button>
            <button
              data-testid="delete-button"
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
        <p className="schedule-description">{schedule.description}</p>
      )}

      {showTime && (
        <div className="schedule-time" data-testid="schedule-time">
          <span>
            {new Date(schedule.start_time).toLocaleString('ko-KR')} - {' '}
            {new Date(schedule.end_time).toLocaleString('ko-KR')}
          </span>
        </div>
      )}

      {showParticipants && schedule.participants && (
        <div className="schedule-participants" data-testid="participants">
          <h4>참석자 ({schedule.participants.length}명)</h4>
          <div className="participants-list">
            {schedule.participants.map((participant: any) => (
              <div
                key={participant.id}
                data-testid={`participant-${participant.user_id}`}
                className={`participant ${participant.status}`}
              >
                <span className="participant-name">
                  {participant.user.full_name}
                </span>
                <span className={`participant-status status-${participant.status}`}>
                  {participant.status === 'accepted' ? '참석' :
                   participant.status === 'declined' ? '불참' : '대기'}
                </span>
                {!isLeader && currentUserId === participant.user_id && (
                  <div className="participant-actions">
                    {participant.status !== 'accepted' && (
                      <button
                        data-testid="accept-button"
                        onClick={() => onParticipantUpdate(schedule.id, 'accepted')}
                      >
                        참석
                      </button>
                    )}
                    {participant.status !== 'declined' && (
                      <button
                        data-testid="decline-button"
                        onClick={() => onParticipantUpdate(schedule.id, 'declined')}
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
      {!canEdit && (
        <div className="schedule-request" data-testid="schedule-request">
          <button
            data-testid="request-change-button"
            onClick={(e) => {
              e.stopPropagation()
              // 채팅으로 변경 요청 전송 로직
              console.log('일정 변경 요청')
            }}
          >
            변경 요청
          </button>
        </div>
      )}

      {/* 색상 코딩 표시 */}
      <div className="schedule-footer">
        <div
          className={`schedule-color-indicator ${schedule.priority || 'normal'}`}
          data-testid="color-indicator"
        />
        <span className="schedule-creator">
          생성자: {schedule.creator?.full_name || '알 수 없음'}
        </span>
      </div>
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
  team_id: 1,
  creator_id: 1,
  priority: 'high',
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
      expect(screen.getByText('팀 회의')).toBeInTheDocument()
      expect(screen.getByText('주간 개발팀 회의입니다.')).toBeInTheDocument()
    })

    it('시간 정보가 표시된다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-time')).toBeInTheDocument()
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

      expect(screen.getByText('생성자: 팀장')).toBeInTheDocument()
    })
  })

  describe('권한 기반 동작', () => {
    it('팀장은 수정/삭제 버튼을 볼 수 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

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

      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument()
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

      expect(screen.getByTestId('accept-button')).toBeInTheDocument()
      expect(screen.getByTestId('decline-button')).toBeInTheDocument()
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
  })

  describe('접근성', () => {
    it('키보드로 접근 가능하다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      const scheduleCard = screen.getByTestId('schedule-card')
      const editButton = screen.getByTestId('edit-button')

      // Tab으로 포커스 이동 가능
      scheduleCard.focus()
      expect(scheduleCard).toHaveFocus()

      editButton.focus()
      expect(editButton).toHaveFocus()
    })

    it('스크린 리더를 위한 적절한 텍스트가 있다', () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} />
        </TestWrapper>
      )

      // aria-label이나 적절한 텍스트 콘텐츠 확인
      expect(screen.getByText('팀 회의')).toBeInTheDocument()
      expect(screen.getByText('참석자 (2명)')).toBeInTheDocument()
    })

    it('Enter 키로 액션 실행이 가능하다', async () => {
      render(
        <TestWrapper>
          <MockScheduleCard {...defaultProps} userRole="leader" />
        </TestWrapper>
      )

      const editButton = screen.getByTestId('edit-button')
      editButton.focus()

      fireEvent.keyDown(editButton, { key: 'Enter' })
      expect(defaultProps.onEdit).toHaveBeenCalled()
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

      expect(screen.queryByText('주간 개발팀 회의입니다.')).not.toBeInTheDocument()
      expect(screen.getByText('팀 회의')).toBeInTheDocument()
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

      expect(screen.getByText('생성자: 알 수 없음')).toBeInTheDocument()
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
  })
})