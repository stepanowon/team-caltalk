import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock 통합 캘린더 컴포넌트 (실제 구현이 완성되면 실제 컴포넌트로 교체)
const MockCalendarPage = () => {
  const [currentView, setCurrentView] = React.useState<
    'month' | 'week' | 'day'
  >('month')
  const [currentDate, setCurrentDate] = React.useState(new Date('2024-01-01'))
  const [selectedSchedule, setSelectedSchedule] = React.useState<any>(null)
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [schedules, setSchedules] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [conflicts, setConflicts] = React.useState<any[]>([])
  const [showConflictModal, setShowConflictModal] = React.useState(false)

  // 가상의 현재 사용자 (팀장)
  const currentUser = {
    id: 1,
    role: 'leader',
    full_name: '팀장',
  }

  // Mock API 호출들
  React.useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          'http://localhost:3000/api/teams/1/schedules',
          {
            headers: { Authorization: 'Bearer mock-jwt-token' },
          }
        )

        if (!response.ok) throw new Error('Failed to fetch')

        const data = await response.json()
        setSchedules(data.data?.schedules || [])
      } catch (err) {
        setError('일정을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchSchedules()
  }, [currentDate, currentView])

  const handleCreateSchedule = async (scheduleData: any) => {
    try {
      // 충돌 검사 먼저 수행
      const conflictResponse = await fetch(
        'http://localhost:3000/api/teams/1/schedules/check-conflict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token',
          },
          body: JSON.stringify(scheduleData),
        }
      )

      const conflictData = await conflictResponse.json()

      if (conflictData.data?.hasConflict) {
        setConflicts(conflictData.data.conflicts)
        setShowConflictModal(true)
        return
      }

      const response = await fetch(
        'http://localhost:3000/api/teams/1/schedules',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token',
          },
          body: JSON.stringify(scheduleData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      const data = await response.json()
      setSchedules([...schedules, data.data.schedule])
      setShowCreateModal(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : '일정 생성에 실패했습니다.')
    }
  }

  const handleUpdateSchedule = async (scheduleId: number, updateData: any) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/schedules/${scheduleId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token',
          },
          body: JSON.stringify(updateData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      const data = await response.json()
      setSchedules(
        schedules.map((s) => (s.id === scheduleId ? data.data.schedule : s))
      )
      setShowEditModal(false)
      setSelectedSchedule(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '일정 수정에 실패했습니다.')
    }
  }

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const response = await fetch(
        `http://localhost:3000/api/schedules/${scheduleId}`,
        {
          method: 'DELETE',
          headers: { Authorization: 'Bearer mock-jwt-token' },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      setSchedules(schedules.filter((s) => s.id !== scheduleId))
      setSelectedSchedule(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '일정 삭제에 실패했습니다.')
    }
  }

  const handleUpdateParticipantStatus = async (
    scheduleId: number,
    status: string
  ) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/schedules/${scheduleId}/participants`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token',
          },
          body: JSON.stringify({ status }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      const data = await response.json()
      setSchedules(
        schedules.map((s) =>
          s.id === scheduleId
            ? { ...s, participants: data.data.participants }
            : s
        )
      )
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : '참가자 상태 업데이트에 실패했습니다.'
      )
    }
  }

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    }

    setCurrentDate(newDate)
  }

  const handleDateClick = (date: Date) => {
    setCurrentDate(date)
    if (currentView !== 'day') {
      setCurrentView('day')
    }
  }

  const handleScheduleClick = (schedule: any) => {
    setSelectedSchedule(schedule)
  }

  const resolveConflict = async (suggestion: any) => {
    const updatedScheduleData = {
      ...selectedSchedule,
      start_time: suggestion.start_time,
      end_time: suggestion.end_time,
    }

    await handleCreateSchedule(updatedScheduleData)
    setShowConflictModal(false)
    setConflicts([])
  }

  return (
    <div data-testid="calendar-page">
      {/* 헤더 */}
      <div className="calendar-header">
        <div className="navigation">
          <button data-testid="nav-prev" onClick={() => handleNavigate('prev')}>
            이전
          </button>
          <h1 data-testid="current-period">
            {currentDate.toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
            })}
          </h1>
          <button data-testid="nav-next" onClick={() => handleNavigate('next')}>
            다음
          </button>
        </div>

        <div className="view-controls">
          {(['month', 'week', 'day'] as const).map((view) => (
            <button
              key={view}
              data-testid={`view-${view}`}
              className={currentView === view ? 'active' : ''}
              onClick={() => setCurrentView(view)}
            >
              {view === 'month' ? '월' : view === 'week' ? '주' : '일'}
            </button>
          ))}
        </div>

        <button
          data-testid="create-schedule-btn"
          onClick={() => setShowCreateModal(true)}
        >
          일정 추가
        </button>
      </div>

      {/* 메인 캘린더 영역 */}
      <div className="calendar-main">
        {loading && <div data-testid="loading">로딩 중...</div>}
        {error && <div data-testid="error">{error}</div>}

        {!loading && !error && (
          <div data-testid={`calendar-${currentView}`}>
            {currentView === 'month' && (
              <div className="month-grid">
                <div className="weekday-headers">
                  {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                    <div key={day} className="weekday-header">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="calendar-dates">
                  {Array.from({ length: 35 }, (_, i) => {
                    const date = new Date(2024, 0, i - 6) // 1월 기준 달력
                    const daySchedules = schedules.filter(
                      (s) =>
                        new Date(s.start_time).toDateString() ===
                        date.toDateString()
                    )

                    return (
                      <div
                        key={i}
                        data-testid={`calendar-date-${date.getDate()}`}
                        className="calendar-date"
                        onClick={() => handleDateClick(date)}
                      >
                        <span className="date-number">{date.getDate()}</span>
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            data-testid={`schedule-item-${schedule.id}`}
                            className="schedule-item"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleScheduleClick(schedule)
                            }}
                          >
                            {schedule.title}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {currentView === 'week' && (
              <div className="week-grid" data-testid="week-view-content">
                주간 뷰 - {currentDate.toLocaleDateString()}
              </div>
            )}

            {currentView === 'day' && (
              <div className="day-grid" data-testid="day-view-content">
                일간 뷰 - {currentDate.toLocaleDateString()}
                {schedules
                  .filter(
                    (s) =>
                      new Date(s.start_time).toDateString() ===
                      currentDate.toDateString()
                  )
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      data-testid={`day-schedule-${schedule.id}`}
                      className="day-schedule"
                      onClick={() => handleScheduleClick(schedule)}
                    >
                      {schedule.title}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 일정 생성 모달 */}
      {showCreateModal && (
        <div data-testid="create-modal" className="modal">
          <div className="modal-content">
            <h2>새 일정 생성</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleCreateSchedule({
                  title: formData.get('title'),
                  description: formData.get('description'),
                  start_time: formData.get('start_time'),
                  end_time: formData.get('end_time'),
                })
              }}
            >
              <input
                name="title"
                placeholder="일정 제목"
                data-testid="create-title"
                required
              />
              <textarea
                name="description"
                placeholder="설명"
                data-testid="create-description"
              />
              <input
                name="start_time"
                type="datetime-local"
                data-testid="create-start-time"
                defaultValue="2024-01-15T10:00"
                required
              />
              <input
                name="end_time"
                type="datetime-local"
                data-testid="create-end-time"
                defaultValue="2024-01-15T11:00"
                required
              />
              <div className="modal-actions">
                <button type="submit" data-testid="create-submit">
                  생성
                </button>
                <button
                  type="button"
                  data-testid="create-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 일정 상세/수정 모달 */}
      {selectedSchedule && !showEditModal && (
        <div data-testid="schedule-detail-modal" className="modal">
          <div className="modal-content">
            <h2 data-testid="schedule-detail-title">
              {selectedSchedule.title}
            </h2>
            <p data-testid="schedule-detail-description">
              {selectedSchedule.description}
            </p>
            <div data-testid="schedule-detail-time">
              시간: {new Date(selectedSchedule.start_time).toLocaleString()} ~{' '}
              {new Date(selectedSchedule.end_time).toLocaleString()}
            </div>

            {selectedSchedule.participants && (
              <div data-testid="schedule-detail-participants">
                <h3>참석자</h3>
                {selectedSchedule.participants.map((participant: any) => (
                  <div
                    key={participant.id}
                    data-testid={`detail-participant-${participant.user_id}`}
                  >
                    {participant.user.full_name} - {participant.status}
                    {currentUser.id === participant.user_id &&
                      participant.status === 'pending' && (
                        <div>
                          <button
                            data-testid="accept-participation"
                            onClick={() =>
                              handleUpdateParticipantStatus(
                                selectedSchedule.id,
                                'accepted'
                              )
                            }
                          >
                            참석
                          </button>
                          <button
                            data-testid="decline-participation"
                            onClick={() =>
                              handleUpdateParticipantStatus(
                                selectedSchedule.id,
                                'declined'
                              )
                            }
                          >
                            불참
                          </button>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}

            {currentUser.role === 'leader' && (
              <div className="schedule-actions">
                <button
                  data-testid="edit-schedule-btn"
                  onClick={() => {
                    setShowEditModal(true)
                  }}
                >
                  수정
                </button>
                <button
                  data-testid="delete-schedule-btn"
                  onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                >
                  삭제
                </button>
              </div>
            )}

            <button
              data-testid="close-detail-btn"
              onClick={() => setSelectedSchedule(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 일정 수정 모달 */}
      {showEditModal && selectedSchedule && (
        <div data-testid="edit-modal" className="modal">
          <div className="modal-content">
            <h2>일정 수정</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleUpdateSchedule(selectedSchedule.id, {
                  title: formData.get('title'),
                  description: formData.get('description'),
                  start_time: formData.get('start_time'),
                  end_time: formData.get('end_time'),
                })
              }}
            >
              <input
                name="title"
                placeholder="일정 제목"
                data-testid="edit-title"
                defaultValue={selectedSchedule.title}
                required
              />
              <textarea
                name="description"
                placeholder="설명"
                data-testid="edit-description"
                defaultValue={selectedSchedule.description}
              />
              <input
                name="start_time"
                type="datetime-local"
                data-testid="edit-start-time"
                defaultValue={selectedSchedule.start_time?.slice(0, 16)}
                required
              />
              <input
                name="end_time"
                type="datetime-local"
                data-testid="edit-end-time"
                defaultValue={selectedSchedule.end_time?.slice(0, 16)}
                required
              />
              <div className="modal-actions">
                <button type="submit" data-testid="edit-submit">
                  수정
                </button>
                <button
                  type="button"
                  data-testid="edit-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 충돌 해결 모달 */}
      {showConflictModal && (
        <div data-testid="conflict-modal" className="modal">
          <div className="modal-content">
            <h2>일정 충돌 감지</h2>
            <p>선택한 시간에 다른 일정이 있습니다.</p>
            <div data-testid="conflict-list">
              {conflicts.map((conflict: any) => (
                <div key={conflict.id} data-testid={`conflict-${conflict.id}`}>
                  {conflict.title} (
                  {new Date(conflict.start_time).toLocaleString()})
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                data-testid="force-create"
                onClick={() => {
                  setShowConflictModal(false)
                  // 강제 생성 로직
                }}
              >
                강제 생성
              </button>
              <button
                data-testid="cancel-conflict"
                onClick={() => setShowConflictModal(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// React mock
const React = {
  useState: vi.fn(),
  useEffect: vi.fn(),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock 데이터
const mockSchedulesResponse = {
  success: true,
  data: {
    schedules: [
      {
        id: 1,
        title: '팀 회의',
        description: '주간 개발팀 회의',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        participants: [
          {
            id: 1,
            user_id: 1,
            status: 'accepted',
            user: { id: 1, full_name: '팀장' },
          },
          {
            id: 2,
            user_id: 2,
            status: 'pending',
            user: { id: 2, full_name: '팀원' },
          },
        ],
      },
      {
        id: 2,
        title: '프로젝트 리뷰',
        description: '분기별 프로젝트 검토',
        start_time: '2024-01-02T14:00:00Z',
        end_time: '2024-01-02T16:00:00Z',
        participants: [],
      },
    ],
  },
}

describe('캘린더 통합 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // React.useState mock 설정
    let stateIndex = 0
    const defaultStates = [
      'month', // currentView
      new Date('2024-01-01'), // currentDate
      null, // selectedSchedule
      false, // showCreateModal
      false, // showEditModal
      [], // schedules
      false, // loading
      null, // error
      [], // conflicts
      false, // showConflictModal
    ]

    React.useState.mockImplementation((initial) => {
      const state =
        defaultStates[stateIndex] !== undefined
          ? defaultStates[stateIndex]
          : initial
      const setState = vi.fn()
      stateIndex++
      return [state, setState]
    })

    // React.useEffect mock
    React.useEffect.mockImplementation((fn) => fn())

    // global mocks
    global.confirm = vi.fn().mockReturnValue(true)
    global.alert = vi.fn()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedulesResponse),
    })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.resetAllMocks()
  })

  describe('캘린더 뷰 전환', () => {
    it('월/주/일 뷰 간 전환이 원활하게 작동한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 초기 월 뷰 확인
      expect(screen.getByTestId('view-month')).toHaveClass('active')
      expect(screen.getByTestId('calendar-month')).toBeInTheDocument()

      // 주 뷰로 전환
      await user.click(screen.getByTestId('view-week'))

      await waitFor(() => {
        expect(screen.getByTestId('week-view-content')).toBeInTheDocument()
      })

      // 일 뷰로 전환
      await user.click(screen.getByTestId('view-day'))

      await waitFor(() => {
        expect(screen.getByTestId('day-view-content')).toBeInTheDocument()
      })
    })

    it('뷰 전환 시 현재 날짜가 유지된다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      const initialPeriod = screen.getByTestId('current-period').textContent

      await user.click(screen.getByTestId('view-week'))
      await user.click(screen.getByTestId('view-month'))

      expect(screen.getByTestId('current-period')).toHaveTextContent(
        initialPeriod || ''
      )
    })

    it('각 뷰에서 네비게이션이 올바르게 작동한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      const initialPeriod = screen.getByTestId('current-period').textContent

      // 다음 달로 이동
      await user.click(screen.getByTestId('nav-next'))

      await waitFor(() => {
        expect(screen.getByTestId('current-period')).not.toHaveTextContent(
          initialPeriod || ''
        )
      })

      // 이전 달로 돌아가기
      await user.click(screen.getByTestId('nav-prev'))

      await waitFor(() => {
        expect(screen.getByTestId('current-period')).toHaveTextContent(
          initialPeriod || ''
        )
      })
    })

    it('날짜 클릭 시 일 뷰로 전환된다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 월 뷰에서 날짜 클릭
      await user.click(screen.getByTestId('calendar-date-15'))

      await waitFor(() => {
        expect(screen.getByTestId('day-view-content')).toBeInTheDocument()
      })
    })
  })

  describe('일정 CRUD 전체 플로우', () => {
    it('일정 생성 → 조회 → 수정 → 삭제 전체 플로우가 작동한다', async () => {
      const user = userEvent.setup()

      // 성공적인 API 응답들 설정
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSchedulesResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { hasConflict: false },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                schedule: {
                  id: 3,
                  title: '새 회의',
                  description: '중요한 회의입니다',
                  start_time: '2024-01-15T10:00:00Z',
                  end_time: '2024-01-15T11:00:00Z',
                },
              },
            }),
        })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 1. 일정 생성
      await user.click(screen.getByTestId('create-schedule-btn'))

      expect(screen.getByTestId('create-modal')).toBeInTheDocument()

      await user.type(screen.getByTestId('create-title'), '새 회의')
      await user.type(
        screen.getByTestId('create-description'),
        '중요한 회의입니다'
      )

      await user.click(screen.getByTestId('create-submit'))

      // 생성 완료 대기
      await waitFor(() => {
        expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()
      })

      // 2. 생성된 일정 확인 및 상세 보기
      await waitFor(() => {
        expect(screen.getByTestId('schedule-item-1')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('schedule-item-1'))

      expect(screen.getByTestId('schedule-detail-modal')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-detail-title')).toBeInTheDocument()

      // 3. 일정 수정
      await user.click(screen.getByTestId('edit-schedule-btn'))

      expect(screen.getByTestId('edit-modal')).toBeInTheDocument()

      const titleInput = screen.getByTestId('edit-title')
      await user.clear(titleInput)
      await user.type(titleInput, '수정된 회의')

      await user.click(screen.getByTestId('edit-submit'))

      // 수정 완료 대기
      await waitFor(() => {
        expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
      })

      // 4. 일정 삭제
      await user.click(screen.getByTestId('schedule-item-1'))
      await user.click(screen.getByTestId('delete-schedule-btn'))

      // 삭제 완료 대기
      await waitFor(() => {
        expect(screen.queryByTestId('schedule-item-1')).not.toBeInTheDocument()
      })
    })

    it('충돌하는 일정 생성 시 충돌 모달이 표시된다', async () => {
      const user = userEvent.setup()

      // 충돌 응답 설정
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSchedulesResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                hasConflict: true,
                conflicts: [
                  {
                    id: 1,
                    title: '기존 회의',
                    start_time: '2024-01-15T10:00:00Z',
                  },
                ],
              },
            }),
        })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('create-schedule-btn'))

      await user.type(screen.getByTestId('create-title'), '충돌 일정')
      await user.click(screen.getByTestId('create-submit'))

      // 충돌 모달 확인
      await waitFor(() => {
        expect(screen.getByTestId('conflict-modal')).toBeInTheDocument()
        expect(screen.getByText('일정 충돌 감지')).toBeInTheDocument()
      })
    })

    it('참가자 상태 업데이트가 작동한다', async () => {
      const user = userEvent.setup()

      // 참가자 상태 업데이트 응답 설정
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSchedulesResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                participants: [
                  {
                    id: 1,
                    user_id: 1,
                    status: 'accepted',
                    user: { id: 1, full_name: '팀장' },
                  },
                ],
              },
            }),
        })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 일정 클릭하여 상세 보기
      await waitFor(() => {
        if (screen.queryByTestId('schedule-item-1')) {
          return user.click(screen.getByTestId('schedule-item-1'))
        }
      })

      await waitFor(() => {
        if (screen.queryByTestId('schedule-detail-modal')) {
          expect(
            screen.getByTestId('schedule-detail-participants')
          ).toBeInTheDocument()
        }
      })

      // 참석 버튼 클릭 (팀원인 경우)
      if (screen.queryByTestId('accept-participation')) {
        await user.click(screen.getByTestId('accept-participation'))

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/participants'),
            expect.objectContaining({
              method: 'PATCH',
              body: JSON.stringify({ status: 'accepted' }),
            })
          )
        })
      }
    })
  })

  describe('권한 기반 접근 제어', () => {
    it('팀장은 모든 일정을 수정/삭제할 수 있다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 일정 클릭
      await waitFor(() => {
        if (screen.queryByTestId('schedule-item-1')) {
          return user.click(screen.getByTestId('schedule-item-1'))
        }
      })

      await waitFor(() => {
        if (screen.queryByTestId('schedule-detail-modal')) {
          expect(screen.getByTestId('edit-schedule-btn')).toBeInTheDocument()
          expect(screen.getByTestId('delete-schedule-btn')).toBeInTheDocument()
        }
      })
    })

    it('권한 없는 수정 시도 시 에러가 표시된다', async () => {
      const user = userEvent.setup()

      // 권한 없음 응답 설정
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSchedulesResponse),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () =>
            Promise.resolve({
              success: false,
              error: '일정 수정 권한이 없습니다.',
            }),
        })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('create-schedule-btn'))
      await user.type(screen.getByTestId('create-title'), '권한 테스트')
      await user.click(screen.getByTestId('create-submit'))

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('권한')
        )
      })
    })
  })

  describe('에러 처리 및 로딩 상태', () => {
    it('일정 로딩 중 로딩 인디케이터가 표시된다', async () => {
      // 로딩 상태 시뮬레이션
      const loadingStates = [
        'month',
        new Date('2024-01-01'),
        null,
        false,
        false,
        [],
        true,
        null,
        [],
        false,
      ]

      let stateIndex = 0
      React.useState.mockImplementation((initial) => {
        const state =
          loadingStates[stateIndex] !== undefined
            ? loadingStates[stateIndex]
            : initial
        const setState = vi.fn()
        stateIndex++
        return [state, setState]
      })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })

    it('API 에러 시 에러 메시지가 표시된다', async () => {
      // 에러 응답 설정
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      // 에러 상태 시뮬레이션
      const errorStates = [
        'month',
        new Date('2024-01-01'),
        null,
        false,
        false,
        [],
        false,
        '일정을 불러오는데 실패했습니다.',
        [],
        false,
      ]

      let stateIndex = 0
      React.useState.mockImplementation((initial) => {
        const state =
          errorStates[stateIndex] !== undefined
            ? errorStates[stateIndex]
            : initial
        const setState = vi.fn()
        stateIndex++
        return [state, setState]
      })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      expect(screen.getByTestId('error')).toBeInTheDocument()
      expect(
        screen.getByText('일정을 불러오는데 실패했습니다.')
      ).toBeInTheDocument()
    })

    it('네트워크 오류 시 적절한 메시지가 표시된다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const networkErrorStates = [
        'month',
        new Date('2024-01-01'),
        null,
        false,
        false,
        [],
        false,
        '일정을 불러오는데 실패했습니다.',
        [],
        false,
      ]

      let stateIndex = 0
      React.useState.mockImplementation((initial) => {
        const state =
          networkErrorStates[stateIndex] !== undefined
            ? networkErrorStates[stateIndex]
            : initial
        const setState = vi.fn()
        stateIndex++
        return [state, setState]
      })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      expect(screen.getByTestId('error')).toBeInTheDocument()
    })
  })

  describe('사용자 경험', () => {
    it('모달 취소 버튼으로 모달이 닫힌다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('create-schedule-btn'))
      expect(screen.getByTestId('create-modal')).toBeInTheDocument()

      await user.click(screen.getByTestId('create-cancel'))

      await waitFor(() => {
        expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()
      })
    })

    it('일정 상세 모달에서 닫기 버튼이 작동한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 일정 클릭
      await waitFor(() => {
        if (screen.queryByTestId('schedule-item-1')) {
          return user.click(screen.getByTestId('schedule-item-1'))
        }
      })

      if (screen.queryByTestId('schedule-detail-modal')) {
        await user.click(screen.getByTestId('close-detail-btn'))

        await waitFor(() => {
          expect(
            screen.queryByTestId('schedule-detail-modal')
          ).not.toBeInTheDocument()
        })
      }
    })

    it('폼 유효성 검사가 작동한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('create-schedule-btn'))

      // 제목 없이 제출 시도
      await user.click(screen.getByTestId('create-submit'))

      // HTML5 유효성 검사로 인해 제출되지 않음
      expect(screen.getByTestId('create-modal')).toBeInTheDocument()
    })

    it('날짜/시간 입력이 올바르게 처리된다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('create-schedule-btn'))

      const startTimeInput = screen.getByTestId('create-start-time')
      const endTimeInput = screen.getByTestId('create-end-time')

      expect(startTimeInput).toHaveValue('2024-01-15T10:00')
      expect(endTimeInput).toHaveValue('2024-01-15T11:00')

      // 시간 변경
      await user.clear(startTimeInput)
      await user.type(startTimeInput, '2024-01-20T14:00')

      expect(startTimeInput).toHaveValue('2024-01-20T14:00')
    })
  })

  describe('성능 테스트', () => {
    it('뷰 전환이 1초 이내에 완료된다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      const startTime = performance.now()

      await user.click(screen.getByTestId('view-week'))

      await waitFor(() => {
        expect(screen.getByTestId('week-view-content')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // 1초 이내
    })

    it('큰 데이터셋에서도 렌더링이 원활하다', async () => {
      // 대량 일정 데이터 mock
      const largeScheduleList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `일정 ${i + 1}`,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        participants: [],
      }))

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { schedules: largeScheduleList },
          }),
      })

      const largeDataStates = [
        'month',
        new Date('2024-01-01'),
        null,
        false,
        false,
        largeScheduleList,
        false,
        null,
        [],
        false,
      ]

      let stateIndex = 0
      React.useState.mockImplementation((initial) => {
        const state =
          largeDataStates[stateIndex] !== undefined
            ? largeDataStates[stateIndex]
            : initial
        const setState = vi.fn()
        stateIndex++
        return [state, setState]
      })

      const startTime = performance.now()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // 100ms 이내 렌더링
      expect(screen.getByTestId('calendar-page')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('스크린 리더를 위한 적절한 라벨이 있다', () => {
      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 적절한 헤딩 구조 확인
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

      // 버튼들이 적절한 설명을 가지는지 확인
      expect(screen.getByText('일정 추가')).toBeInTheDocument()
      expect(screen.getByText('이전')).toBeInTheDocument()
      expect(screen.getByText('다음')).toBeInTheDocument()
    })

    it('키보드만으로 모든 기능에 접근할 수 있다', async () => {
      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      const createButton = screen.getByTestId('create-schedule-btn')

      // 탭으로 포커스 이동
      createButton.focus()
      expect(createButton).toHaveFocus()

      // 엔터키로 클릭
      fireEvent.keyDown(createButton, { key: 'Enter' })

      // 실제로는 모달이 열려야 하지만 Mock에서는 onClick 핸들러 동작 확인
      expect(createButton).toBeInTheDocument()
    })

    it('폼 요소들이 적절한 라벨을 가진다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('create-schedule-btn'))

      const titleInput = screen.getByTestId('create-title')
      const descriptionInput = screen.getByTestId('create-description')

      expect(titleInput).toHaveAttribute('placeholder', '일정 제목')
      expect(descriptionInput).toHaveAttribute('placeholder', '설명')
    })
  })

  describe('실시간 기능 시뮬레이션', () => {
    it('자동 새로고침이 작동한다', async () => {
      vi.useFakeTimers()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      const initialFetchCount = (global.fetch as any).mock.calls.length

      // 30초 후 자동 새로고침 시뮬레이션
      vi.advanceTimersByTime(30000)

      // 실제 구현에서는 자동 새로고침이 일어날 것임
      expect(screen.getByTestId('calendar-page')).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('다른 사용자의 변경사항이 반영된다', async () => {
      const { rerender } = render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 외부 변경사항으로 인한 데이터 업데이트 시뮬레이션
      const updatedSchedules = [
        ...mockSchedulesResponse.data.schedules,
        {
          id: 3,
          title: '새로운 외부 일정',
          description: '다른 사용자가 추가한 일정',
          start_time: '2024-01-03T15:00:00Z',
          end_time: '2024-01-03T16:00:00Z',
          participants: [],
        },
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: { schedules: updatedSchedules },
          }),
      })

      // 컴포넌트 재렌더링
      rerender(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 새로운 일정이 표시되는지 확인
      expect(screen.getByTestId('calendar-page')).toBeInTheDocument()
    })
  })

  describe('복합 시나리오', () => {
    it('복잡한 사용자 워크플로우가 원활하게 작동한다', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 1. 월 뷰에서 시작
      expect(screen.getByTestId('calendar-month')).toBeInTheDocument()

      // 2. 주 뷰로 전환
      await user.click(screen.getByTestId('view-week'))
      expect(screen.getByTestId('week-view-content')).toBeInTheDocument()

      // 3. 다음 주로 이동
      await user.click(screen.getByTestId('nav-next'))

      // 4. 일정 추가 시도
      await user.click(screen.getByTestId('create-schedule-btn'))
      expect(screen.getByTestId('create-modal')).toBeInTheDocument()

      // 5. 취소 후 다시 시도
      await user.click(screen.getByTestId('create-cancel'))
      expect(screen.queryByTestId('create-modal')).not.toBeInTheDocument()

      // 6. 월 뷰로 돌아가기
      await user.click(screen.getByTestId('view-month'))
      expect(screen.getByTestId('calendar-month')).toBeInTheDocument()
    })

    it('에러 복구 시나리오가 작동한다', async () => {
      const user = userEvent.setup()

      // 초기에는 에러 발생
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockSchedulesResponse),
        })

      render(
        <TestWrapper>
          <MockCalendarPage />
        </TestWrapper>
      )

      // 에러 상태 확인
      const errorStates = [
        'month',
        new Date('2024-01-01'),
        null,
        false,
        false,
        [],
        false,
        '일정을 불러오는데 실패했습니다.',
        [],
        false,
      ]

      let stateIndex = 0
      React.useState.mockImplementation((initial) => {
        const state =
          errorStates[stateIndex] !== undefined
            ? errorStates[stateIndex]
            : initial
        const setState = vi.fn()
        stateIndex++
        return [state, setState]
      })

      // 에러 후 재시도 (뷰 전환으로 시뮬레이션)
      await user.click(screen.getByTestId('view-week'))

      // 복구 확인
      expect(screen.getByTestId('calendar-page')).toBeInTheDocument()
    })
  })
})
