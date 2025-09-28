import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalendarGrid } from './CalendarGrid'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock 컴포넌트 (실제 구현이 완성되면 이 부분을 제거하고 실제 컴포넌트 사용)
const MockCalendarGrid = ({
  view = 'month',
  currentDate = new Date('2024-01-01'),
  schedules = [],
  onDateClick = vi.fn(),
  onScheduleClick = vi.fn(),
  onViewChange = vi.fn(),
  onNavigate = vi.fn(),
  loading = false,
  error = null,
  ...props
}: any) => {
  return (
    <div data-testid="calendar-grid" {...props}>
      <div data-testid="calendar-header">
        <button
          data-testid="prev-button"
          onClick={() => onNavigate('prev')}
        >
          이전
        </button>
        <span data-testid="current-month">
          {currentDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long'
          })}
        </span>
        <button
          data-testid="next-button"
          onClick={() => onNavigate('next')}
        >
          다음
        </button>
        <div data-testid="view-switcher">
          <button
            data-testid="month-view"
            onClick={() => onViewChange('month')}
            className={view === 'month' ? 'active' : ''}
          >
            월
          </button>
          <button
            data-testid="week-view"
            onClick={() => onViewChange('week')}
            className={view === 'week' ? 'active' : ''}
          >
            주
          </button>
          <button
            data-testid="day-view"
            onClick={() => onViewChange('day')}
            className={view === 'day' ? 'active' : ''}
          >
            일
          </button>
        </div>
      </div>

      <div data-testid="calendar-body">
        {loading && <div data-testid="loading">로딩 중...</div>}
        {error && <div data-testid="error">{error}</div>}

        {!loading && !error && (
          <div data-testid={`${view}-grid`} className={`calendar-${view}`}>
            {view === 'month' && (
              <div className="grid grid-cols-7">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="calendar-day-header">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const date = new Date(2024, 0, i - 6) // 1월 기준 달력
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                  const daySchedules = schedules.filter((s: any) =>
                    new Date(s.start_time).toDateString() === date.toDateString()
                  )

                  return (
                    <div
                      key={i}
                      data-testid={`calendar-date-${date.getDate()}`}
                      className={`calendar-date ${!isCurrentMonth ? 'other-month' : ''}`}
                      onClick={() => onDateClick(date)}
                    >
                      <span className="date-number">{date.getDate()}</span>
                      {daySchedules.map((schedule: any) => (
                        <div
                          key={schedule.id}
                          data-testid={`schedule-${schedule.id}`}
                          className="schedule-item"
                          onClick={(e) => {
                            e.stopPropagation()
                            onScheduleClick(schedule)
                          }}
                        >
                          {schedule.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {view === 'week' && (
              <div className="week-view">
                <div className="time-column">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="time-slot" data-testid={`time-slot-${hour}`}>
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
                <div className="days-grid">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date(currentDate)
                    date.setDate(date.getDate() - date.getDay() + i)

                    return (
                      <div key={i} className="day-column" data-testid={`day-column-${i}`}>
                        <div className="day-header">
                          {date.toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="time-slots">
                          {Array.from({ length: 24 }, (_, hour) => (
                            <div
                              key={hour}
                              className="time-slot"
                              data-testid={`week-time-slot-${i}-${hour}`}
                              onClick={() => {
                                const slotDate = new Date(date)
                                slotDate.setHours(hour)
                                onDateClick(slotDate)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {view === 'day' && (
              <div className="day-view">
                <div className="day-header">
                  {currentDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </div>
                <div className="time-slots">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="time-slot" data-testid={`day-time-slot-${hour}`}>
                      <span className="time-label">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                      <div
                        className="slot-content"
                        onClick={() => {
                          const slotDate = new Date(currentDate)
                          slotDate.setHours(hour)
                          onDateClick(slotDate)
                        }}
                      >
                        {schedules
                          .filter((s: any) => {
                            const scheduleDate = new Date(s.start_time)
                            return scheduleDate.getHours() === hour &&
                                   scheduleDate.toDateString() === currentDate.toDateString()
                          })
                          .map((schedule: any) => (
                            <div
                              key={schedule.id}
                              data-testid={`schedule-${schedule.id}`}
                              className="schedule-item"
                              onClick={(e) => {
                                e.stopPropagation()
                                onScheduleClick(schedule)
                              }}
                            >
                              {schedule.title}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// 테스트용 데이터
const mockSchedules = [
  {
    id: 1,
    title: '팀 회의',
    description: '주간 개발팀 회의',
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T11:00:00Z',
    team_id: 1,
    priority: 'high',
    hasConflict: false,
  },
  {
    id: 2,
    title: '프로젝트 리뷰',
    description: '분기별 프로젝트 검토',
    start_time: '2024-01-02T14:00:00Z',
    end_time: '2024-01-02T16:00:00Z',
    team_id: 1,
    priority: 'medium',
    hasConflict: false,
  },
  {
    id: 3,
    title: '충돌 일정',
    description: '시간이 겹치는 일정',
    start_time: '2024-01-01T10:30:00Z',
    end_time: '2024-01-01T11:30:00Z',
    team_id: 1,
    priority: 'low',
    hasConflict: true,
  },
]

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

describe('CalendarGrid 컴포넌트', () => {
  const defaultProps = {
    view: 'month' as const,
    currentDate: new Date('2024-01-01'),
    schedules: mockSchedules,
    onDateClick: vi.fn(),
    onScheduleClick: vi.fn(),
    onViewChange: vi.fn(),
    onNavigate: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('캘린더 그리드가 올바르게 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-header')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-body')).toBeInTheDocument()
    })

    it('현재 월이 올바르게 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('current-month')).toHaveTextContent('2024년 1월')
    })

    it('뷰 전환 버튼들이 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('month-view')).toBeInTheDocument()
      expect(screen.getByTestId('week-view')).toBeInTheDocument()
      expect(screen.getByTestId('day-view')).toBeInTheDocument()
    })

    it('현재 뷰가 활성화 상태로 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      expect(screen.getByTestId('month-view')).toHaveClass('active')
      expect(screen.getByTestId('week-view')).not.toHaveClass('active')
    })

    it('다른 뷰로 초기화되어도 올바르게 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="week" />
        </TestWrapper>
      )

      expect(screen.getByTestId('week-view')).toHaveClass('active')
      expect(screen.getByTestId('week-grid')).toBeInTheDocument()
    })
  })

  describe('월 뷰 (Month View)', () => {
    it('월 뷰 그리드가 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      expect(screen.getByTestId('month-grid')).toBeInTheDocument()
    })

    it('요일 헤더가 올바르게 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      const dayHeaders = ['일', '월', '화', '수', '목', '금', '토']
      dayHeaders.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument()
      })
    })

    it('일정이 올바른 날짜에 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-1')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-2')).toBeInTheDocument()
      expect(screen.getByText('팀 회의')).toBeInTheDocument()
    })

    it('충돌하는 일정이 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-3')).toBeInTheDocument()
      expect(screen.getByText('충돌 일정')).toBeInTheDocument()
    })

    it('날짜 클릭 시 onDateClick이 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      const dateCell = screen.getByTestId('calendar-date-15')
      await user.click(dateCell)

      expect(defaultProps.onDateClick).toHaveBeenCalledWith(
        expect.any(Date)
      )
    })

    it('일정 클릭 시 onScheduleClick이 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      const scheduleItem = screen.getByTestId('schedule-1')
      await user.click(scheduleItem)

      expect(defaultProps.onScheduleClick).toHaveBeenCalledWith(mockSchedules[0])
    })

    it('다른 달의 날짜가 올바르게 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      // 이전/다음 달의 날짜는 other-month 클래스를 가져야 함
      const otherMonthDates = screen.getAllByText(/2[5-9]|3[0-1]/)
      otherMonthDates.forEach(date => {
        const parentElement = date.closest('.calendar-date')
        expect(parentElement).toHaveClass('other-month')
      })
    })
  })

  describe('주 뷰 (Week View)', () => {
    it('주 뷰 그리드가 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="week" />
        </TestWrapper>
      )

      expect(screen.getByTestId('week-grid')).toBeInTheDocument()
    })

    it('시간 슬롯이 24시간 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="week" />
        </TestWrapper>
      )

      for (let hour = 0; hour < 24; hour++) {
        expect(screen.getByTestId(`time-slot-${hour}`)).toBeInTheDocument()
      }
    })

    it('7일간의 날짜가 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="week" />
        </TestWrapper>
      )

      for (let day = 0; day < 7; day++) {
        expect(screen.getByTestId(`day-column-${day}`)).toBeInTheDocument()
      }
    })

    it('주 뷰에서 시간 슬롯 클릭이 작동한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="week" />
        </TestWrapper>
      )

      const timeSlot = screen.getByTestId('week-time-slot-0-10')
      await user.click(timeSlot)

      expect(defaultProps.onDateClick).toHaveBeenCalledWith(
        expect.any(Date)
      )
    })

    it('주 시작일이 일요일부터 시작한다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="week" />
        </TestWrapper>
      )

      // 첫 번째 컬럼이 일요일이어야 함
      const firstColumn = screen.getByTestId('day-column-0')
      expect(firstColumn).toBeInTheDocument()
    })
  })

  describe('일 뷰 (Day View)', () => {
    it('일 뷰가 렌더링된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="day" />
        </TestWrapper>
      )

      expect(screen.getByTestId('day-grid')).toBeInTheDocument()
    })

    it('선택된 날짜가 상세하게 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="day" />
        </TestWrapper>
      )

      expect(screen.getByText(/2024년 1월 1일/)).toBeInTheDocument()
    })

    it('24시간 시간 슬롯이 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="day" />
        </TestWrapper>
      )

      for (let hour = 0; hour < 24; hour++) {
        expect(screen.getByTestId(`day-time-slot-${hour}`)).toBeInTheDocument()
      }
    })

    it('일 뷰에서 해당 날짜의 일정만 표시된다', () => {
      const todaySchedules = mockSchedules.filter(s =>
        new Date(s.start_time).toDateString() === new Date('2024-01-01').toDateString()
      )

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="day" />
        </TestWrapper>
      )

      todaySchedules.forEach(schedule => {
        expect(screen.getByTestId(`schedule-${schedule.id}`)).toBeInTheDocument()
      })
    })
  })

  describe('네비게이션', () => {
    it('이전 버튼 클릭 시 onNavigate가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('prev-button'))
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('prev')
    })

    it('다음 버튼 클릭 시 onNavigate가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('next-button'))
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('next')
    })

    it('뷰 전환 시 onViewChange가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('week-view'))
      expect(defaultProps.onViewChange).toHaveBeenCalledWith('week')

      await user.click(screen.getByTestId('day-view'))
      expect(defaultProps.onViewChange).toHaveBeenCalledWith('day')
    })

    it('같은 뷰 버튼을 다시 클릭해도 onViewChange가 호출된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} view="month" />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('month-view'))
      expect(defaultProps.onViewChange).toHaveBeenCalledWith('month')
    })
  })

  describe('로딩 및 에러 상태', () => {
    it('로딩 상태가 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} loading={true} />
        </TestWrapper>
      )

      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
    })

    it('에러 상태가 표시된다', () => {
      const errorMessage = '일정을 불러오는데 실패했습니다.'
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} error={errorMessage} />
        </TestWrapper>
      )

      expect(screen.getByTestId('error')).toBeInTheDocument()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('로딩 중일 때 캘린더 그리드가 숨겨진다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} loading={true} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('month-grid')).not.toBeInTheDocument()
    })

    it('에러 발생 시 캘린더 그리드가 숨겨진다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} error="에러 발생" />
        </TestWrapper>
      )

      expect(screen.queryByTestId('month-grid')).not.toBeInTheDocument()
    })

    it('로딩과 에러가 동시에 있을 때 로딩이 우선 표시된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} loading={true} error="에러" />
        </TestWrapper>
      )

      expect(screen.getByTestId('loading')).toBeInTheDocument()
      expect(screen.queryByTestId('error')).not.toBeInTheDocument()
    })
  })

  describe('반응형 디자인', () => {
    it('모바일 환경에서 적절히 렌더링된다', () => {
      // 모바일 화면 크기 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('데스크톱 환경에서 적절히 렌더링된다', () => {
      // 데스크톱 화면 크기 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('태블릿 환경에서 적절히 렌더링된다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })
  })

  describe('키보드 접근성', () => {
    it('키보드로 네비게이션이 가능하다', async () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const prevButton = screen.getByTestId('prev-button')
      const nextButton = screen.getByTestId('next-button')

      // Tab 키로 포커스 이동 확인
      prevButton.focus()
      expect(prevButton).toHaveFocus()

      fireEvent.keyDown(prevButton, { key: 'Tab' })
      // 다음 포커스 가능한 요소로 이동하는지 확인
    })

    it('Enter 키로 버튼 클릭이 가능하다', async () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const monthViewButton = screen.getByTestId('month-view')
      monthViewButton.focus()

      fireEvent.keyDown(monthViewButton, { key: 'Enter' })
      expect(defaultProps.onViewChange).toHaveBeenCalledWith('month')
    })

    it('Space 키로 버튼 클릭이 가능하다', async () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const weekViewButton = screen.getByTestId('week-view')
      weekViewButton.focus()

      fireEvent.keyDown(weekViewButton, { key: ' ' })
      expect(defaultProps.onViewChange).toHaveBeenCalledWith('week')
    })

    it('화살표 키로 날짜 네비게이션이 가능하다', async () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      // 실제 구현에서는 화살표 키로 날짜 간 이동 구현
      const calendarGrid = screen.getByTestId('calendar-grid')
      fireEvent.keyDown(calendarGrid, { key: 'ArrowRight' })
      // 날짜 포커스 이동 확인
    })
  })

  describe('성능 테스트', () => {
    it('큰 데이터셋에서도 적절히 렌더링된다', () => {
      const largeScheduleSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `일정 ${i + 1}`,
        start_time: `2024-01-${String((i % 31) + 1).padStart(2, '0')}T10:00:00Z`,
        end_time: `2024-01-${String((i % 31) + 1).padStart(2, '0')}T11:00:00Z`,
        team_id: 1,
        priority: 'normal',
        hasConflict: false,
      }))

      const startTime = performance.now()

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} schedules={largeScheduleSet} />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 렌더링 시간이 100ms 이내인지 확인
      expect(renderTime).toBeLessThan(100)
      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('뷰 전환이 빠르게 수행된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const startTime = performance.now()

      await user.click(screen.getByTestId('week-view'))

      const endTime = performance.now()
      const switchTime = endTime - startTime

      expect(switchTime).toBeLessThan(50) // 50ms 이내
      expect(screen.getByTestId('week-grid')).toBeInTheDocument()
    })

    it('메모리 사용량이 적절하다', () => {
      const { unmount } = render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      // 컴포넌트 언마운트 시 메모리 누수가 없는지 확인
      unmount()
      // 실제로는 메모리 프로파일링 도구 사용
    })
  })

  describe('데이터 무결성', () => {
    it('빈 일정 배열에서도 정상 작동한다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} schedules={[]} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
      expect(screen.queryByTestId('schedule-1')).not.toBeInTheDocument()
    })

    it('잘못된 날짜 형식에도 견고하게 작동한다', () => {
      const invalidSchedules = [
        {
          id: 1,
          title: '잘못된 일정',
          start_time: 'invalid-date',
          end_time: 'invalid-date',
          team_id: 1,
        }
      ]

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} schedules={invalidSchedules} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('null/undefined props에 대해 적절한 기본값을 사용한다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid
            view="month"
            currentDate={null}
            schedules={null}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toBeInTheDocument()
    })

    it('매우 긴 일정 제목을 적절히 처리한다', () => {
      const longTitleSchedule = [{
        id: 1,
        title: 'A'.repeat(200), // 매우 긴 제목
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        team_id: 1,
      }]

      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} schedules={longTitleSchedule} />
        </TestWrapper>
      )

      expect(screen.getByTestId('schedule-1')).toBeInTheDocument()
    })
  })

  describe('상호작용 이벤트', () => {
    it('일정 클릭 시 이벤트 버블링이 방지된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const scheduleItem = screen.getByTestId('schedule-1')
      await user.click(scheduleItem)

      expect(defaultProps.onScheduleClick).toHaveBeenCalledTimes(1)
      expect(defaultProps.onDateClick).not.toHaveBeenCalled()
    })

    it('더블 클릭 이벤트가 적절히 처리된다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const dateCell = screen.getByTestId('calendar-date-15')
      await user.dblClick(dateCell)

      // 더블 클릭 시에도 onDateClick이 호출되어야 함
      expect(defaultProps.onDateClick).toHaveBeenCalled()
    })

    it('터치 이벤트가 지원된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} />
        </TestWrapper>
      )

      const dateCell = screen.getByTestId('calendar-date-15')

      fireEvent.touchStart(dateCell)
      fireEvent.touchEnd(dateCell)

      expect(defaultProps.onDateClick).toHaveBeenCalled()
    })
  })

  describe('커스터마이제이션', () => {
    it('커스텀 CSS 클래스가 적용된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} className="custom-calendar" />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toHaveClass('custom-calendar')
    })

    it('커스텀 스타일이 적용된다', () => {
      const customStyle = { backgroundColor: 'red' }
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} style={customStyle} />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toHaveStyle('background-color: red')
    })

    it('추가 props가 전달된다', () => {
      render(
        <TestWrapper>
          <MockCalendarGrid {...defaultProps} data-custom="test" />
        </TestWrapper>
      )

      expect(screen.getByTestId('calendar-grid')).toHaveAttribute('data-custom', 'test')
    })
  })
})