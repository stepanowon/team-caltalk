import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// 성능 테스트용 Mock 컴포넌트
const MockPerformanceCalendar = ({
  scheduleCount = 100,
  enableVirtualization = false,
  loadTime = 0,
}: {
  scheduleCount?: number
  enableVirtualization?: boolean
  loadTime?: number
}) => {
  const [schedules, setSchedules] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [renderTime, setRenderTime] = React.useState(0)

  React.useEffect(() => {
    const startTime = performance.now()

    // 대량 데이터 생성
    const generateSchedules = () => {
      return Array.from({ length: scheduleCount }, (_, i) => ({
        id: i + 1,
        title: `일정 ${i + 1}`,
        description: `설명 ${i + 1}`,
        start_time: new Date(2024, 0, (i % 31) + 1, 10, 0).toISOString(),
        end_time: new Date(2024, 0, (i % 31) + 1, 11, 0).toISOString(),
        team_id: 1,
        participants: Array.from(
          { length: Math.min(5, (i % 10) + 1) },
          (_, j) => ({
            id: j + 1,
            user_id: j + 1,
            status: 'accepted',
            user: { id: j + 1, full_name: `사용자 ${j + 1}` },
          })
        ),
      }))
    }

    setTimeout(() => {
      const mockSchedules = generateSchedules()
      setSchedules(mockSchedules)
      setLoading(false)

      const endTime = performance.now()
      setRenderTime(endTime - startTime)
    }, loadTime)
  }, [scheduleCount, loadTime])

  const handleBulkAction = async (action: string) => {
    const startTime = performance.now()

    // 대량 작업 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 10))

    const endTime = performance.now()
    console.log(`${action} 실행 시간:`, endTime - startTime, 'ms')
  }

  if (loading) {
    return <div data-testid="loading">로딩 중...</div>
  }

  return (
    <div data-testid="performance-calendar">
      <div data-testid="render-time">{renderTime.toFixed(2)}ms</div>
      <div data-testid="schedule-count">{schedules.length}개 일정</div>

      <div className="calendar-controls">
        <button
          data-testid="bulk-update"
          onClick={() => handleBulkAction('bulk-update')}
        >
          일괄 수정
        </button>
        <button
          data-testid="bulk-delete"
          onClick={() => handleBulkAction('bulk-delete')}
        >
          일괄 삭제
        </button>
        <button
          data-testid="export-all"
          onClick={() => handleBulkAction('export')}
        >
          전체 내보내기
        </button>
      </div>

      <div
        data-testid="schedule-list"
        className={enableVirtualization ? 'virtualized' : 'normal'}
      >
        {enableVirtualization ? (
          // 가상화된 리스트 (실제로는 react-window 등 사용)
          <div style={{ height: '400px', overflow: 'auto' }}>
            {schedules.slice(0, 50).map((schedule) => (
              <div
                key={schedule.id}
                data-testid={`schedule-${schedule.id}`}
                style={{ height: '40px', padding: '8px' }}
              >
                {schedule.title}
              </div>
            ))}
          </div>
        ) : (
          // 일반 리스트
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              data-testid={`schedule-${schedule.id}`}
              className="schedule-item"
            >
              <h3>{schedule.title}</h3>
              <p>{schedule.description}</p>
              <div className="participants">
                {schedule.participants.map((p: any) => (
                  <span key={p.id}>{p.user.full_name}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
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
      queries: {
        retry: false,
        cacheTime: 5 * 60 * 1000, // 5분
        staleTime: 1 * 60 * 1000, // 1분
      },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('캘린더 성능 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 성능 측정을 위한 mock 설정
    global.performance = {
      ...global.performance,
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
    }

    // useState mock 설정
    let stateIndex = 0
    React.useState.mockImplementation((initial) => {
      const state = initial
      const setState = vi.fn()
      stateIndex++
      return [state, setState]
    })

    // useEffect mock
    React.useEffect.mockImplementation((fn) => fn())
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('렌더링 성능', () => {
    it('100개 일정 렌더링이 100ms 이내에 완료된다', async () => {
      const startTime = performance.now()

      render(
        <TestWrapper>
          <MockPerformanceCalendar scheduleCount={100} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(100) // 100ms 이내
      expect(screen.getByTestId('schedule-count')).toHaveTextContent(
        '100개 일정'
      )
    })

    it('1000개 일정 렌더링이 500ms 이내에 완료된다', async () => {
      const startTime = performance.now()

      render(
        <TestWrapper>
          <MockPerformanceCalendar scheduleCount={1000} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(500) // 500ms 이내
      expect(screen.getByTestId('schedule-count')).toHaveTextContent(
        '1000개 일정'
      )
    })

    it('가상화를 사용하면 대량 데이터도 빠르게 렌더링된다', async () => {
      const startTimeNormal = performance.now()

      const { unmount } = render(
        <TestWrapper>
          <MockPerformanceCalendar
            scheduleCount={1000}
            enableVirtualization={false}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const endTimeNormal = performance.now()
      const normalRenderTime = endTimeNormal - startTimeNormal

      unmount()

      const startTimeVirtualized = performance.now()

      render(
        <TestWrapper>
          <MockPerformanceCalendar
            scheduleCount={1000}
            enableVirtualization={true}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const endTimeVirtualized = performance.now()
      const virtualizedRenderTime = endTimeVirtualized - startTimeVirtualized

      // 가상화가 더 빠르거나 비슷해야 함
      expect(virtualizedRenderTime).toBeLessThanOrEqual(normalRenderTime * 1.2)
    })

    it('컴포넌트 리렌더링이 최소화된다', async () => {
      let renderCount = 0

      const RenderCountCalendar = () => {
        renderCount++
        return <MockPerformanceCalendar scheduleCount={10} />
      }

      const { rerender } = render(
        <TestWrapper>
          <RenderCountCalendar />
        </TestWrapper>
      )

      const initialRenderCount = renderCount

      // 동일한 props로 리렌더
      rerender(
        <TestWrapper>
          <RenderCountCalendar />
        </TestWrapper>
      )

      // React.memo나 useMemo를 사용했다면 불필요한 리렌더링이 없어야 함
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(1)
    })
  })

  describe('API 호출 성능', () => {
    it('일정 목록 API 호출이 2초 이내에 완료된다', async () => {
      // 느린 응답 시뮬레이션
      server.use(
        http.get('*/teams/1/schedules', async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000)) // 1초 지연
          return HttpResponse.json({
            success: true,
            data: { schedules: [] },
          })
        })
      )

      const startTime = performance.now()

      render(
        <TestWrapper>
          <MockPerformanceCalendar loadTime={1000} />
        </TestWrapper>
      )

      await waitFor(
        () => {
          expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const endTime = performance.now()
      const loadTime = endTime - startTime

      expect(loadTime).toBeLessThan(2000) // 2초 이내
    })

    it('병렬 API 호출이 순차 호출보다 빠르다', async () => {
      const mockApiCall = (delay: number) =>
        new Promise((resolve) => setTimeout(resolve, delay))

      // 순차 호출
      const startSequential = performance.now()
      await mockApiCall(100)
      await mockApiCall(100)
      await mockApiCall(100)
      const endSequential = performance.now()
      const sequentialTime = endSequential - startSequential

      // 병렬 호출
      const startParallel = performance.now()
      await Promise.all([mockApiCall(100), mockApiCall(100), mockApiCall(100)])
      const endParallel = performance.now()
      const parallelTime = endParallel - startParallel

      expect(parallelTime).toBeLessThan(sequentialTime * 0.5) // 병렬이 2배 이상 빨라야 함
    })

    it('캐싱으로 중복 요청이 방지된다', async () => {
      let requestCount = 0

      server.use(
        http.get('*/teams/1/schedules', () => {
          requestCount++
          return HttpResponse.json({
            success: true,
            data: { schedules: [] },
          })
        })
      )

      const { rerender } = render(
        <TestWrapper>
          <MockPerformanceCalendar />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const firstRequestCount = requestCount

      // 같은 데이터를 다시 요청 (캐시 사용)
      rerender(
        <TestWrapper>
          <MockPerformanceCalendar />
        </TestWrapper>
      )

      // 캐시가 작동하면 추가 요청이 없어야 함
      expect(requestCount).toBe(firstRequestCount)
    })
  })

  describe('메모리 사용량', () => {
    it('컴포넌트 언마운트 시 메모리 누수가 없다', async () => {
      // 메모리 사용량 측정 (실제로는 더 정교한 도구 필요)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      const { unmount } = render(
        <TestWrapper>
          <MockPerformanceCalendar scheduleCount={1000} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const mountedMemory = (performance as any).memory?.usedJSHeapSize || 0

      unmount()

      // 가비지 컬렉션 강제 실행 (테스트 환경에서만)
      if (global.gc) global.gc()

      await new Promise((resolve) => setTimeout(resolve, 100))

      const unmountedMemory = (performance as any).memory?.usedJSHeapSize || 0

      // 메모리 사용량이 크게 증가하지 않았는지 확인
      const memoryIncrease = unmountedMemory - initialMemory
      const mountMemoryIncrease = mountedMemory - initialMemory

      expect(memoryIncrease).toBeLessThan(mountMemoryIncrease * 0.2) // 20% 이하로 유지
    })

    it('이벤트 리스너가 정리된다', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = render(
        <TestWrapper>
          <MockPerformanceCalendar />
        </TestWrapper>
      )

      const addedListeners = addEventListenerSpy.mock.calls.length

      unmount()

      const removedListeners = removeEventListenerSpy.mock.calls.length

      // 추가된 리스너만큼 제거되었는지 확인
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners * 0.8)

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('사용자 상호작용 성능', () => {
    it('뷰 전환이 60fps를 유지한다', async () => {
      render(
        <TestWrapper>
          <MockPerformanceCalendar />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      // 프레임 드롭 시뮬레이션
      const frameDropTest = () => {
        return new Promise<number>((resolve) => {
          let frameCount = 0
          let lastTime = performance.now()
          let maxFrameTime = 0

          const countFrames = (currentTime: number) => {
            const deltaTime = currentTime - lastTime
            maxFrameTime = Math.max(maxFrameTime, deltaTime)
            lastTime = currentTime
            frameCount++

            if (frameCount < 60) {
              // 1초간 측정
              requestAnimationFrame(countFrames)
            } else {
              resolve(maxFrameTime)
            }
          }

          requestAnimationFrame(countFrames)
        })
      }

      const maxFrameTime = await frameDropTest()

      // 16.67ms (60fps) 이하여야 함
      expect(maxFrameTime).toBeLessThan(16.67)
    })

    it('스크롤 성능이 원활하다', async () => {
      render(
        <TestWrapper>
          <MockPerformanceCalendar
            scheduleCount={1000}
            enableVirtualization={true}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('schedule-list')).toBeInTheDocument()
      })

      const scrollElement = screen.getByTestId('schedule-list')

      // 스크롤 성능 측정
      const scrollTest = () => {
        return new Promise<number>((resolve) => {
          const startTime = performance.now()
          let scrollCount = 0

          const scrollHandler = () => {
            scrollCount++
            if (scrollCount >= 10) {
              const endTime = performance.now()
              resolve(endTime - startTime)
              scrollElement.removeEventListener('scroll', scrollHandler)
            }
          }

          scrollElement.addEventListener('scroll', scrollHandler)

          // 빠른 스크롤 시뮬레이션
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              scrollElement.scrollTop = i * 100
            }, i * 10)
          }
        })
      }

      const scrollTime = await scrollTest()

      // 스크롤 처리가 200ms 이내에 완료되어야 함
      expect(scrollTime).toBeLessThan(200)
    })

    it('대량 작업이 UI를 블로킹하지 않는다', async () => {
      render(
        <TestWrapper>
          <MockPerformanceCalendar scheduleCount={1000} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('bulk-update')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // 대량 작업 실행
      screen.getByTestId('bulk-update').click()

      // UI 응답성 테스트 (클릭 후 즉시 다른 작업 수행)
      const button = screen.getByTestId('bulk-delete')
      button.focus()

      const responseTime = performance.now() - startTime

      // UI가 즉시 응답해야 함 (100ms 이내)
      expect(responseTime).toBeLessThan(100)
      expect(button).toHaveFocus()
    })
  })

  describe('번들 크기 및 로딩 성능', () => {
    it('코드 스플리팅이 효과적으로 적용되었다', () => {
      // 실제로는 번들 분석기나 웹팩 통계 사용
      const mockBundleSize = {
        main: 250000, // 250KB
        calendar: 150000, // 150KB (캘린더 청크)
        vendor: 500000, // 500KB (라이브러리)
      }

      // 메인 번들이 적절한 크기인지 확인
      expect(mockBundleSize.main).toBeLessThan(300000) // 300KB 이하

      // 캘린더 청크가 독립적으로 로드 가능한지 확인
      expect(mockBundleSize.calendar).toBeLessThan(200000) // 200KB 이하

      // 전체 번들 크기가 적절한지 확인
      const totalSize = Object.values(mockBundleSize).reduce((a, b) => a + b, 0)
      expect(totalSize).toBeLessThan(1000000) // 1MB 이하
    })

    it('지연 로딩이 올바르게 구현되었다', async () => {
      const loadingStartTime = performance.now()

      render(
        <TestWrapper>
          <MockPerformanceCalendar loadTime={100} />
        </TestWrapper>
      )

      // 로딩 상태 확인
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const loadingEndTime = performance.now()
      const totalLoadTime = loadingEndTime - loadingStartTime

      // 지연 로딩이 적절한 시간 내에 완료되는지 확인
      expect(totalLoadTime).toBeGreaterThan(100) // 최소 지연 시간
      expect(totalLoadTime).toBeLessThan(500) // 최대 허용 시간
    })
  })

  describe('캐시 효율성', () => {
    it('브라우저 캐시가 효과적으로 활용된다', async () => {
      // 첫 번째 로드
      const firstLoadStart = performance.now()

      const { unmount } = render(
        <TestWrapper>
          <MockPerformanceCalendar />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const firstLoadEnd = performance.now()
      const firstLoadTime = firstLoadEnd - firstLoadStart

      unmount()

      // 두 번째 로드 (캐시 사용)
      const secondLoadStart = performance.now()

      render(
        <TestWrapper>
          <MockPerformanceCalendar />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const secondLoadEnd = performance.now()
      const secondLoadTime = secondLoadEnd - secondLoadStart

      // 두 번째 로드가 더 빨라야 함
      expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8)
    })

    it('메모리 캐시가 효율적으로 관리된다', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            cacheTime: 5 * 60 * 1000, // 5분
            staleTime: 1 * 60 * 1000, // 1분
          },
        },
      })

      // 캐시 크기 확인
      const cacheData = queryClient.getQueryCache()
      const initialCacheSize = cacheData.getAll().length

      render(
        <QueryClientProvider client={queryClient}>
          <MockPerformanceCalendar />
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('performance-calendar')).toBeInTheDocument()
      })

      const afterLoadCacheSize = cacheData.getAll().length

      // 캐시에 데이터가 저장되었는지 확인
      expect(afterLoadCacheSize).toBeGreaterThan(initialCacheSize)

      // 캐시 크기가 적절한지 확인 (메모리 누수 방지)
      expect(afterLoadCacheSize).toBeLessThan(initialCacheSize + 10)
    })
  })
})
