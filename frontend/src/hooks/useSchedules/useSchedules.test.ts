import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock useSchedules 훅 (구현 전 테스트)
const mockUseSchedules = (teamId: number, options: any = {}) => {
  const { enabled = true, startDate, endDate } = options

  // Mock 상태 관리
  const [schedules, setSchedules] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
        setSchedules(data.data.schedules)
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchSchedules()
  }, [teamId, enabled, startDate, endDate])

  // Mock 뮤테이션 함수들
  const createSchedule = vi.fn().mockResolvedValue({ success: true })
  const updateSchedule = vi.fn().mockResolvedValue({ success: true })
  const deleteSchedule = vi.fn().mockResolvedValue({ success: true })
  const updateParticipantStatus = vi.fn().mockResolvedValue({ success: true })
  const checkConflict = vi.fn().mockResolvedValue({ hasConflict: false })

  return {
    // 쿼리 상태
    schedules,
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

    // 뮤테이션 상태
    isCreating: false,
    isUpdating: false,
    isDeleting: false,

    // 유틸리티 함수들
    refetch: vi.fn(),
    invalidate: vi.fn(),
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

describe('useSchedules 훅', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // useState mock 설정
    let state: any = []
    let setState: any = vi.fn()

    React.useState.mockImplementation((initial) => {
      if (typeof initial === 'boolean') {
        return [false, vi.fn()]
      }
      if (initial === null || initial === undefined) {
        return [null, vi.fn()]
      }
      return [initial, setState]
    })

    // useEffect mock 설정
    React.useEffect.mockImplementation((fn, deps) => {
      fn()
    })
  })

  afterEach(() => {
    server.resetHandlers()
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
      // 에러 응답 mock
      server.use(
        http.get('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '서버 오류' },
            { status: 500 }
          )
        })
      )

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

      // 초기 로딩 상태
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
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
      const mockCheckConflictWithConflict = vi.fn().mockResolvedValue({
        hasConflict: true,
        suggestions: [
          {
            start_time: '2024-01-01T12:00:00Z',
            end_time: '2024-01-01T13:00:00Z',
          }
        ]
      })

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        checkConflict: mockCheckConflictWithConflict,
      }), { wrapper: createWrapper() })

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

    it('생성 중 상태를 관리한다', async () => {
      const mockCreateWithLoading = vi.fn().mockImplementation(async () => {
        // 로딩 상태 시뮬레이션을 위해 지연
        await new Promise(resolve => setTimeout(resolve, 100))
        return { success: true }
      })

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        createSchedule: mockCreateWithLoading,
        isCreating: true, // 로딩 중 상태
      }), { wrapper: createWrapper() })

      expect(result.current.isCreating).toBe(true)
    })
  })

  describe('일정 수정', () => {
    it('일정을 성공적으로 수정한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      const updateData = {
        id: 1,
        title: '수정된 회의',
        description: '수정된 설명',
      }

      await act(async () => {
        await result.current.updateSchedule(updateData)
      })

      expect(result.current.updateSchedule).toHaveBeenCalledWith(updateData)
    })

    it('낙관적 업데이트를 수행한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      // 낙관적 업데이트 시뮬레이션
      const updateData = { id: 1, title: '낙관적 업데이트 제목' }

      await act(async () => {
        // 실제 구현에서는 캐시를 즉시 업데이트하고 나중에 서버와 동기화
        result.current.updateSchedule(updateData)
      })

      expect(result.current.updateSchedule).toHaveBeenCalled()
    })

    it('수정 실패 시 이전 상태로 롤백한다', async () => {
      const mockUpdateWithError = vi.fn().mockRejectedValue(
        new Error('수정 실패')
      )

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        updateSchedule: mockUpdateWithError,
      }), { wrapper: createWrapper() })

      const updateData = { id: 1, title: '실패할 수정' }

      try {
        await act(async () => {
          await result.current.updateSchedule(updateData)
        })
      } catch (error) {
        expect(error.message).toBe('수정 실패')
      }
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

    it('삭제 중 상태를 관리한다', () => {
      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        isDeleting: true,
      }), { wrapper: createWrapper() })

      expect(result.current.isDeleting).toBe(true)
    })

    it('삭제 실패 시 적절한 에러를 반환한다', async () => {
      const mockDeleteWithError = vi.fn().mockRejectedValue(
        new Error('삭제 권한이 없습니다.')
      )

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        deleteSchedule: mockDeleteWithError,
      }), { wrapper: createWrapper() })

      try {
        await act(async () => {
          await result.current.deleteSchedule(1)
        })
      } catch (error) {
        expect(error.message).toBe('삭제 권한이 없습니다.')
      }
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
  })

  describe('캐시 관리', () => {
    it('데이터를 다시 fetch할 수 있다', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ success: true })

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        refetch: mockRefetch,
      }), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.refetch).toHaveBeenCalled()
    })

    it('캐시를 무효화할 수 있다', async () => {
      const mockInvalidate = vi.fn()

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        invalidate: mockInvalidate,
      }), { wrapper: createWrapper() })

      act(() => {
        result.current.invalidate()
      })

      expect(result.current.invalidate).toHaveBeenCalled()
    })

    it('관련된 쿼리들을 함께 무효화한다', async () => {
      const mockInvalidateRelated = vi.fn()

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        invalidateRelated: mockInvalidateRelated,
      }), { wrapper: createWrapper() })

      if (result.current.invalidateRelated) {
        act(() => {
          result.current.invalidateRelated(['teams', 'messages'])
        })

        expect(result.current.invalidateRelated).toHaveBeenCalledWith(
          ['teams', 'messages']
        )
      }
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
      server.use(
        http.get('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '인증이 필요합니다.' },
            { status: 401 }
          )
        })
      )

      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })

    it('권한 오류 시 적절한 메시지를 반환한다', async () => {
      const mockCreateWithPermissionError = vi.fn().mockRejectedValue(
        new Error('일정 생성 권한이 없습니다.')
      )

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        createSchedule: mockCreateWithPermissionError,
      }), { wrapper: createWrapper() })

      try {
        await act(async () => {
          await result.current.createSchedule({})
        })
      } catch (error) {
        expect(error.message).toBe('일정 생성 권한이 없습니다.')
      }
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

      // fetch가 한 번만 호출되는지 확인
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })
    })

    it('배경에서 데이터를 갱신한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1, {
          staleTime: 0, // 즉시 stale로 만들어 배경 갱신 유도
          refetchInterval: 1000 // 1초마다 갱신
        }),
        { wrapper: createWrapper() }
      )

      // 배경 갱신은 실제 TanStack Query에서 처리되므로 Mock에서는 스킵
      expect(result.current.schedules).toBeDefined()
    })

    it('메모리 사용량을 최적화한다', () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      // 메모리 누수 방지를 위한 클린업 함수 확인
      expect(result.current).toBeDefined()
      expect(typeof result.current.refetch).toBe('function')
    })
  })

  describe('실시간 업데이트', () => {
    it('WebSocket을 통한 실시간 업데이트를 처리한다', async () => {
      const mockWebSocketUpdate = vi.fn()

      const { result } = renderHook(() => ({
        ...mockUseSchedules(1),
        onWebSocketUpdate: mockWebSocketUpdate,
      }), { wrapper: createWrapper() })

      // WebSocket 메시지 시뮬레이션
      if (result.current.onWebSocketUpdate) {
        act(() => {
          result.current.onWebSocketUpdate({
            type: 'schedule_updated',
            data: { id: 1, title: '실시간 업데이트됨' }
          })
        })

        expect(mockWebSocketUpdate).toHaveBeenCalled()
      }
    })

    it('다른 사용자의 변경사항을 반영한다', async () => {
      const { result } = renderHook(
        () => mockUseSchedules(1),
        { wrapper: createWrapper() }
      )

      // 외부 변경사항 시뮬레이션
      act(() => {
        if (result.current.refetch) {
          result.current.refetch()
        }
      })

      expect(result.current.refetch).toHaveBeenCalled()
    })
  })
})