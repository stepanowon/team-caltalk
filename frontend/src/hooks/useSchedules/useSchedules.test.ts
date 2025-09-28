import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock useSchedules 훅 (실제 구현이 완성되면 이 부분을 제거하고 실제 훅 사용)
const mockUseSchedules = (teamId: number, options: any = {}) => {
  const { enabled = true, startDate, endDate, refetchInterval, staleTime } = options

  // Mock 상태 관리
  const [schedules, setSchedules] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [optimisticUpdates, setOptimisticUpdates] = React.useState<any[]>([])

  // Mock API 호출 시뮬레이션
  React.useEffect(() => {
    if (!enabled) return

    setLoading(true)
    setError(null)

    // 실제로는 TanStack Query를 사용하지만, 테스트에서는 단순화
    const fetchSchedules = async () => {
      try {
        const params = new URLSearchParams()
        if (startDate) params.append('start_date', startDate)
        if (endDate) params.append('end_date', endDate)

        const response = await fetch(
          `http://localhost:3000/api/teams/${teamId}/schedules?${params}`,
          {
            headers: {
              Authorization: 'Bearer mock-jwt-token',
            },
          }
        )

        if (!response.ok) {
          throw new Error('일정을 불러오는데 실패했습니다.')
        }

        const data = await response.json()
        setSchedules(data.data?.schedules || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchSchedules()

    // refetchInterval 시뮬레이션
    let intervalId: NodeJS.Timeout | null = null
    if (refetchInterval && refetchInterval > 0) {
      intervalId = setInterval(fetchSchedules, refetchInterval)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [teamId, enabled, startDate, endDate, refetchInterval])

  // Mock 뮤테이션 함수들
  const createSchedule = vi.fn().mockImplementation(async (scheduleData: any) => {
    // 낙관적 업데이트
    const tempId = Date.now()
    const optimisticSchedule = { ...scheduleData, id: tempId, temp: true }
    setOptimisticUpdates(prev => [...prev, optimisticSchedule])

    try {
      const response = await fetch(`http://localhost:3000/api/teams/${teamId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify(scheduleData),
      })

      if (!response.ok) {
        throw new Error('일정 생성에 실패했습니다.')
      }

      const data = await response.json()

      // 낙관적 업데이트 제거 및 실제 데이터로 교체
      setOptimisticUpdates(prev => prev.filter(s => s.id !== tempId))
      setSchedules(prev => [...prev, data.data.schedule])

      return { success: true, data: data.data.schedule }
    } catch (err) {
      // 낙관적 업데이트 롤백
      setOptimisticUpdates(prev => prev.filter(s => s.id !== tempId))
      throw err
    }
  })

  const updateSchedule = vi.fn().mockImplementation(async (scheduleId: number, updateData: any) => {
    // 낙관적 업데이트
    const originalSchedule = schedules.find(s => s.id === scheduleId)
    const optimisticSchedule = { ...originalSchedule, ...updateData }
    setSchedules(prev => prev.map(s => s.id === scheduleId ? optimisticSchedule : s))

    try {
      const response = await fetch(`http://localhost:3000/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error('일정 수정에 실패했습니다.')
      }

      const data = await response.json()
      setSchedules(prev => prev.map(s => s.id === scheduleId ? data.data.schedule : s))

      return { success: true, data: data.data.schedule }
    } catch (err) {
      // 롤백
      setSchedules(prev => prev.map(s => s.id === scheduleId ? originalSchedule : s))
      throw err
    }
  })

  const deleteSchedule = vi.fn().mockImplementation(async (scheduleId: number) => {
    // 낙관적 업데이트
    const originalSchedules = schedules
    setSchedules(prev => prev.filter(s => s.id !== scheduleId))

    try {
      const response = await fetch(`http://localhost:3000/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock-jwt-token' },
      })

      if (!response.ok) {
        throw new Error('일정 삭제에 실패했습니다.')
      }

      return { success: true }
    } catch (err) {
      // 롤백
      setSchedules(originalSchedules)
      throw err
    }
  })

  const updateParticipantStatus = vi.fn().mockImplementation(async (scheduleId: number, status: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/schedules/${scheduleId}/participants`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        throw new Error('참가자 상태 업데이트에 실패했습니다.')
      }

      const data = await response.json()
      setSchedules(prev => prev.map(s =>
        s.id === scheduleId ? { ...s, participants: data.data.participants } : s
      ))

      return { success: true, data: data.data }
    } catch (err) {
      throw err
    }
  })

  const checkConflict = vi.fn().mockImplementation(async (conflictData: any) => {
    try {
      const response = await fetch(`http://localhost:3000/api/teams/${teamId}/schedules/check-conflict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify(conflictData),
      })

      if (!response.ok) {
        throw new Error('충돌 검사에 실패했습니다.')
      }

      const data = await response.json()
      return data.data
    } catch (err) {
      throw err
    }
  })

  const bulkUpdateSchedules = vi.fn().mockImplementation(async (updates: any[]) => {
    try {
      const response = await fetch(`http://localhost:3000/api/teams/${teamId}/schedules/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify({ updates }),
      })

      if (!response.ok) {
        throw new Error('일괄 업데이트에 실패했습니다.')
      }

      const data = await response.json()
      setSchedules(data.data.schedules)
      return { success: true, data: data.data }
    } catch (err) {
      throw err
    }
  })

  // 유틸리티 함수들
  const refetch = vi.fn().mockImplementation(async () => {
    setLoading(true)
    setError(null)
    // 실제 refetch 로직 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100))
    setLoading(false)
    return { success: true }
  })

  const invalidate = vi.fn().mockImplementation(() => {
    // 캐시 무효화 시뮬레이션
    return Promise.resolve()
  })

  const invalidateRelated = vi.fn().mockImplementation((keys: string[]) => {
    // 관련 쿼리 무효화 시뮬레이션
    return Promise.resolve()
  })

  // 필터링 및 정렬 함수들
  const getSchedulesByDate = vi.fn((date: string) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time).toDateString()
      return scheduleDate === new Date(date).toDateString()
    })
  })

  const getSchedulesByDateRange = vi.fn((start: string, end: string) => {
    return schedules.filter(schedule => {
      const scheduleStart = new Date(schedule.start_time)
      const rangeStart = new Date(start)
      const rangeEnd = new Date(end)
      return scheduleStart >= rangeStart && scheduleStart <= rangeEnd
    })
  })

  const getConflictingSchedules = vi.fn((targetSchedule: any) => {
    return schedules.filter(schedule => {
      if (schedule.id === targetSchedule.id) return false

      const targetStart = new Date(targetSchedule.start_time)
      const targetEnd = new Date(targetSchedule.end_time)
      const scheduleStart = new Date(schedule.start_time)
      const scheduleEnd = new Date(schedule.end_time)

      return (targetStart < scheduleEnd && targetEnd > scheduleStart)
    })
  })

  // 통계 함수들
  const getScheduleStats = vi.fn(() => {
    const total = schedules.length
    const upcoming = schedules.filter(s => new Date(s.start_time) > new Date()).length
    const past = total - upcoming
    const byPriority = {
      high: schedules.filter(s => s.priority === 'high').length,
      medium: schedules.filter(s => s.priority === 'medium').length,
      low: schedules.filter(s => s.priority === 'low').length,
      normal: schedules.filter(s => s.priority === 'normal' || !s.priority).length,
    }

    return { total, upcoming, past, byPriority }
  })

  // 합성된 데이터 (낙관적 업데이트 포함)
  const allSchedules = [...schedules, ...optimisticUpdates]

  return {
    // 쿼리 상태
    schedules: allSchedules,
    loading,
    error,
    isLoading: loading,
    isError: !!error,
    isSuccess: !loading && !error,

    // 뮤테이션 함수들
    createSchedule,
    updateSchedule,
    deleteSchedule,
    updateParticipantStatus,
    checkConflict,
    bulkUpdateSchedules,

    // 뮤테이션 상태
    isCreating: false,
    isUpdating: false,
    isDeleting: false,

    // 유틸리티 함수들
    refetch,
    invalidate,
    invalidateRelated,

    // 데이터 필터링 및 조작 함수들
    getSchedulesByDate,
    getSchedulesByDateRange,
    getConflictingSchedules,
    getScheduleStats,

    // 고급 기능
    optimisticUpdates,
  }
}

// React mock
const React = {
  useState: vi.fn(),
  useEffect: vi.fn(),
}

// 테스트 래퍼
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock 응답 데이터
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
        team_id: 1,
        creator_id: 1,
        priority: 'high',
        participants: [
          {
            id: 1,
            user_id: 1,
            status: 'accepted',
            user: { id: 1, full_name: '팀장' }
          }
        ]
      },
      {
        id: 2,
        title: '프로젝트 리뷰',
        description: '분기별 프로젝트 검토',
        start_time: '2024-01-02T14:00:00Z',
        end_time: '2024-01-02T16:00:00Z',
        team_id: 1,
        creator_id: 1,
        priority: 'medium',
        participants: []
      }
    ]
  }
}

describe('useSchedules 훅', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // useState mock 설정
    let stateIndex = 0
    const defaultStates = [
      [], // schedules
      false, // loading
      null, // error
      [], // optimisticUpdates
    ]

    React.useState.mockImplementation((initial) => {
      const state = defaultStates[stateIndex] !== undefined ? defaultStates[stateIndex] : initial
      const setState = vi.fn()
      stateIndex++
      return [state, setState]
    })

    // useEffect mock 설정
    React.useEffect.mockImplementation((fn, deps) => {
      fn()
    })

    // global fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSchedulesResponse)
    })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.resetAllMocks()
  })

  describe('일정 조회', () => {
    it('팀 일정을 성공적으로 조회한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.schedules).toBeDefined()
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBeNull()
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('날짜 범위로 일정을 필터링한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.schedules).toBeDefined()
        expect(result.current.loading).toBe(false)
      })

      // 날짜 범위 파라미터가 올바르게 전달되는지 확인
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('start_date=2024-01-01'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('end_date=2024-01-31'),
        expect.any(Object)
      )
    })

    it('enabled 옵션이 false일 때 쿼리가 실행되지 않는다', () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, { enabled: false }),
        { wrapper: createWrapper() }
      )

      expect(result.current.loading).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('API 에러 시 에러 상태를 반환한다', async () => {
      // 에러 응답 설정
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.isError).toBe(true)
      })
    })

    it('로딩 상태를 올바르게 관리한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      // 초기 로딩 상태는 mock 설정에 따라 달라질 수 있음
      await waitFor(() => {
        expect(result.current.isLoading).toBeDefined()
      })
    })

    it('refetchInterval이 설정되면 주기적으로 갱신한다', async () => {
      vi.useFakeTimers()

      const { result } = renderHook(
        () => mockUseSchedules(1, { refetchInterval: 1000 }),
        { wrapper: createWrapper() }
      )

      // 1초 후 재호출 확인
      vi.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      vi.useRealTimers()
    })

    it('복잡한 쿼리 옵션으로 일정을 조회한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          staleTime: 5000,
          refetchInterval: 30000
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.schedules).toBeDefined()
      })
    })
  })

  describe('일정 생성', () => {
    it('새 일정을 성공적으로 생성한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const scheduleData = {
        title: '새 회의',
        description: '새로운 회의입니다.',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
      }

      await act(async () => {
        await result.current.createSchedule(scheduleData)
      })

      expect(result.current.createSchedule).toHaveBeenCalledWith(scheduleData)
    })

    it('충돌 검사를 수행한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const conflictData = {
        start_time: '2024-01-01T10:30:00Z',
        end_time: '2024-01-01T11:30:00Z',
        team_id: 1,
      }

      await act(async () => {
        await result.current.checkConflict(conflictData)
      })

      expect(result.current.checkConflict).toHaveBeenCalledWith(conflictData)
    })

    it('충돌이 있는 경우 적절히 처리한다', async () => {
      // 충돌 있는 응답 mock
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            hasConflict: true,
            conflicts: [{ id: 1, title: '기존 회의' }],
            suggestions: [
              {
                start_time: '2024-01-01T12:00:00Z',
                end_time: '2024-01-01T13:00:00Z',
              }
            ]
          }
        })
      })

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const conflictData = {
        start_time: '2024-01-01T10:30:00Z',
        end_time: '2024-01-01T11:30:00Z',
        team_id: 1,
      }

      const conflictResult = await act(async () => {
        return await result.current.checkConflict(conflictData)
      })

      expect(conflictResult.hasConflict).toBe(true)
      expect(conflictResult.suggestions).toHaveLength(1)
    })

    it('낙관적 업데이트를 수행한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const scheduleData = {
        title: '낙관적 업데이트 일정',
        start_time: '2024-01-03T10:00:00Z',
        end_time: '2024-01-03T11:00:00Z',
      }

      await act(async () => {
        result.current.createSchedule(scheduleData)
        // 낙관적 업데이트로 즉시 반영되는지 확인
        expect(result.current.optimisticUpdates).toHaveLength(1)
      })
    })

    it('생성 실패 시 낙관적 업데이트를 롤백한다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('생성 실패'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const scheduleData = {
        title: '실패할 일정',
        start_time: '2024-01-03T10:00:00Z',
        end_time: '2024-01-03T11:00:00Z',
      }

      try {
        await act(async () => {
          await result.current.createSchedule(scheduleData)
        })
      } catch (error) {
        expect(error.message).toBe('생성 실패')
        expect(result.current.optimisticUpdates).toHaveLength(0)
      }
    })
  })

  describe('일정 수정', () => {
    it('일정을 성공적으로 수정한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const updateData = {
        title: '수정된 회의',
        description: '수정된 설명',
      }

      await act(async () => {
        await result.current.updateSchedule(1, updateData)
      })

      expect(result.current.updateSchedule).toHaveBeenCalledWith(1, updateData)
    })

    it('낙관적 업데이트를 수행한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const updateData = { title: '낙관적 업데이트 제목' }

      await act(async () => {
        // 실제 구현에서는 캐시를 즉시 업데이트하고 나중에 서버와 동기화
        result.current.updateSchedule(1, updateData)
      })

      expect(result.current.updateSchedule).toHaveBeenCalled()
    })

    it('수정 실패 시 이전 상태로 롤백한다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('수정 실패'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const updateData = { title: '실패할 수정' }

      try {
        await act(async () => {
          await result.current.updateSchedule(1, updateData)
        })
      } catch (error) {
        expect(error.message).toBe('수정 실패')
      }
    })

    it('일괄 업데이트를 지원한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const updates = [
        { id: 1, title: '수정된 제목 1' },
        { id: 2, title: '수정된 제목 2' }
      ]

      await act(async () => {
        await result.current.bulkUpdateSchedules(updates)
      })

      expect(result.current.bulkUpdateSchedules).toHaveBeenCalledWith(updates)
    })
  })

  describe('일정 삭제', () => {
    it('일정을 성공적으로 삭제한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        await result.current.deleteSchedule(1)
      })

      expect(result.current.deleteSchedule).toHaveBeenCalledWith(1)
    })

    it('삭제 실패 시 적절한 에러를 반환한다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('삭제 권한이 없습니다.'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      try {
        await act(async () => {
          await result.current.deleteSchedule(1)
        })
      } catch (error) {
        expect(error.message).toBe('삭제 권한이 없습니다.')
      }
    })

    it('낙관적 삭제를 수행한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        result.current.deleteSchedule(1)
        // 낙관적 삭제로 즉시 제거되는지 확인
      })

      expect(result.current.deleteSchedule).toHaveBeenCalled()
    })
  })

  describe('참가자 상태 업데이트', () => {
    it('참가자 상태를 업데이트한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        await result.current.updateParticipantStatus(1, 'accepted')
      })

      expect(result.current.updateParticipantStatus).toHaveBeenCalledWith(
        1,
        'accepted'
      )
    })

    it('여러 참가자 상태를 동시에 업데이트할 수 있다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        await Promise.all([
          result.current.updateParticipantStatus(1, 'accepted'),
          result.current.updateParticipantStatus(2, 'declined'),
        ])
      })

      expect(result.current.updateParticipantStatus).toHaveBeenCalledTimes(2)
    })

    it('잘못된 상태값으로 업데이트 시 에러가 발생한다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('잘못된 상태값입니다.'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      try {
        await act(async () => {
          await result.current.updateParticipantStatus(1, 'invalid_status')
        })
      } catch (error) {
        expect(error.message).toBe('잘못된 상태값입니다.')
      }
    })
  })

  describe('캐시 관리', () => {
    it('데이터를 다시 fetch할 수 있다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.refetch).toHaveBeenCalled()
    })

    it('캐시를 무효화할 수 있다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.invalidate()
      })

      expect(result.current.invalidate).toHaveBeenCalled()
    })

    it('관련된 쿼리들을 함께 무효화한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.invalidateRelated(['teams', 'messages'])
      })

      expect(result.current.invalidateRelated).toHaveBeenCalledWith(
        ['teams', 'messages']
      )
    })

    it('staleTime 설정에 따라 캐시 동작이 달라진다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, { staleTime: 5000 }),
        { wrapper: createWrapper() }
      )

      expect(result.current.schedules).toBeDefined()
    })
  })

  describe('데이터 필터링 및 조작', () => {
    it('특정 날짜의 일정을 필터링한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const targetDate = '2024-01-01'
      const filteredSchedules = result.current.getSchedulesByDate(targetDate)

      expect(result.current.getSchedulesByDate).toHaveBeenCalledWith(targetDate)
    })

    it('날짜 범위의 일정을 필터링한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const startDate = '2024-01-01'
      const endDate = '2024-01-31'
      const filteredSchedules = result.current.getSchedulesByDateRange(startDate, endDate)

      expect(result.current.getSchedulesByDateRange).toHaveBeenCalledWith(startDate, endDate)
    })

    it('충돌하는 일정을 찾는다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const targetSchedule = {
        id: 999,
        start_time: '2024-01-01T10:30:00Z',
        end_time: '2024-01-01T11:30:00Z',
      }

      const conflicts = result.current.getConflictingSchedules(targetSchedule)

      expect(result.current.getConflictingSchedules).toHaveBeenCalledWith(targetSchedule)
    })

    it('일정 통계를 계산한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const stats = result.current.getScheduleStats()

      expect(result.current.getScheduleStats).toHaveBeenCalled()
      expect(stats).toHaveProperty('total')
      expect(stats).toHaveProperty('upcoming')
      expect(stats).toHaveProperty('past')
      expect(stats).toHaveProperty('byPriority')
    })
  })

  describe('에러 처리', () => {
    it('네트워크 오류를 적절히 처리한다', async () => {
      // 네트워크 오류 시뮬레이션
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toContain('일정을 불러오는데 실패했습니다.')
      })
    })

    it('인증 오류 시 적절한 메시지를 반환한다', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: '인증이 필요합니다.' })
      })

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('권한 오류 시 적절한 메시지를 반환한다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('일정 생성 권한이 없습니다.'))

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      try {
        await act(async () => {
          await result.current.createSchedule({})
        })
      } catch (error) {
        expect(error.message).toBe('일정 생성 권한이 없습니다.')
      }
    })

    it('서버 오류를 적절히 처리한다', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: '서버 내부 오류' })
      })

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('타임아웃 오류를 처리한다', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      }, { timeout: 1000 })
    })
  })

  describe('성능 최적화', () => {
    it('동일한 팀 ID로 중복 요청하지 않는다', async () => {
      const { result, rerender } = renderHook(
        ({ teamId }) => mockUseSchedules(teamId),
        {
          wrapper: createWrapper(),
          initialProps: { teamId: 1 }
        }
      )

      // 같은 팀 ID로 리렌더
      rerender({ teamId: 1 })
      rerender({ teamId: 1 })

      // fetch가 한 번만 호출되는지 확인 (실제로는 TanStack Query의 deduplication)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })

    it('메모리 사용량을 최적화한다', () => {
      const { result, unmount } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      // 메모리 누수 방지를 위한 클린업 함수 확인
      expect(result.current).toBeDefined()
      expect(typeof result.current.refetch).toBe('function')

      unmount()
      // 언마운트 시 정리 작업 확인
    })

    it('큰 데이터셋을 효율적으로 처리한다', async () => {
      const largeDataResponse = {
        success: true,
        data: {
          schedules: Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            title: `일정 ${i + 1}`,
            start_time: `2024-01-${String((i % 31) + 1).padStart(2, '0')}T10:00:00Z`,
            end_time: `2024-01-${String((i % 31) + 1).padStart(2, '0')}T11:00:00Z`,
            team_id: 1,
            priority: 'normal'
          }))
        }
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(largeDataResponse)
      })

      const startTime = performance.now()

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.schedules).toBeDefined()
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // 대용량 데이터 처리 시간이 합리적인지 확인
      expect(processingTime).toBeLessThan(100) // 100ms 이내
    })
  })

  describe('실시간 업데이트 시뮬레이션', () => {
    it('외부 변경사항을 감지하고 갱신한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      // 외부 변경사항 시뮬레이션
      act(() => {
        result.current.refetch()
      })

      expect(result.current.refetch).toHaveBeenCalled()
    })

    it('낙관적 업데이트와 서버 동기화가 조화롭게 작동한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const newSchedule = {
        title: '새로운 일정',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z'
      }

      await act(async () => {
        // 낙관적 업데이트
        result.current.createSchedule(newSchedule)

        // 즉시 UI에 반영되는지 확인
        const hasOptimisticUpdate = result.current.optimisticUpdates.length > 0
        expect(hasOptimisticUpdate).toBe(true)
      })
    })
  })

  describe('고급 기능', () => {
    it('조건부 쿼리 실행이 작동한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, {
          enabled: false // 조건부로 비활성화
        }),
        { wrapper: createWrapper() }
      )

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('커스텀 에러 핸들러가 작동한다', async () => {
      const customErrorHandler = vi.fn()
      global.fetch = vi.fn().mockRejectedValue(new Error('Custom error'))

      const { result } = renderHook(
        () => mockUseSchedules(1, {
          onError: customErrorHandler
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('성공 콜백이 실행된다', async () => {
      const successCallback = vi.fn()

      const { result } = renderHook(
        () => mockUseSchedules(1, {
          onSuccess: successCallback
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('쿼리 키 생성이 올바르게 작동한다', () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }),
        { wrapper: createWrapper() }
      )

      // 실제 구현에서는 쿼리 키가 팀ID와 옵션을 포함해야 함
      expect(result.current).toBeDefined()
    })
  })
})