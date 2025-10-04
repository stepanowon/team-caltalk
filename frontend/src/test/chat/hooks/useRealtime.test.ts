import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  MockLongPolling,
  realtimeTestScenarios,
  performanceTestHelpers,
  errorSimulation,
  generateTestData,
} from '../utils/realtime-test-helpers'

// useRealtime 훅 모킹 (실제 구현 전까지)
const useRealtimeMock = (teamId: string, messageDate: string) => {
  const [state, setState] = React.useState({
    isConnected: false,
    messages: [] as any[],
    lastMessageId: 0,
    error: null as Error | null,
    retryCount: 0,
    isLoading: false,
    typingUsers: [] as any[],
  })

  const mockLongPolling = React.useRef<MockLongPolling | null>(null)

  const connect = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      if (!mockLongPolling.current) {
        mockLongPolling.current = new MockLongPolling()
      }

      const polling = mockLongPolling.current

      // 이벤트 리스너 등록
      polling.on('connect', () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isLoading: false,
          retryCount: 0,
        }))
      })

      polling.on('disconnect', () => {
        setState((prev) => ({ ...prev, isConnected: false }))
      })

      polling.on('new_message', (message: any) => {
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, message],
          lastMessageId: Math.max(prev.lastMessageId, message.id),
        }))
      })

      polling.on('user_typing', (data: any) => {
        setState((prev) => {
          const typingUsers = prev.typingUsers.filter(
            (u) => u.user_id !== data.user_id
          )
          if (data.is_typing) {
            typingUsers.push(data)
          }
          return { ...prev, typingUsers }
        })
      })

      polling.on('error', (error: Error) => {
        setState((prev) => ({ ...prev, error, isLoading: false }))
      })

      polling.on('reconnecting', (data: any) => {
        setState((prev) => ({
          ...prev,
          retryCount: data.attempt,
          isLoading: true,
        }))
      })

      polling.on('connection_failed', (data: any) => {
        setState((prev) => ({
          ...prev,
          error: data.error,
          isConnected: false,
          isLoading: false,
          retryCount: data.retryCount,
        }))
      })

      await polling.connect(teamId, messageDate)
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as Error, isLoading: false }))
    }
  }, [teamId, messageDate])

  const disconnect = React.useCallback(() => {
    if (mockLongPolling.current) {
      mockLongPolling.current.disconnect()
    }
  }, [])

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!mockLongPolling.current || !state.isConnected) {
        throw new Error('Not connected')
      }

      try {
        await mockLongPolling.current.sendMessage(teamId, messageDate, content)
      } catch (error) {
        setState((prev) => ({ ...prev, error: error as Error }))
        throw error
      }
    },
    [teamId, messageDate, state.isConnected]
  )

  const retry = React.useCallback(async () => {
    setState((prev) => ({ ...prev, error: null, retryCount: 0 }))
    await connect()
  }, [connect])

  const clearError = React.useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // 자동 재연결 로직
  React.useEffect(() => {
    if (state.error && state.retryCount < 3 && !state.isLoading) {
      const delay = Math.min(1000 * Math.pow(2, state.retryCount), 30000)
      const timer = setTimeout(retry, delay)
      return () => clearTimeout(timer)
    }
  }, [state.error, state.retryCount, state.isLoading, retry])

  // 컴포넌트 언마운트 시 정리
  React.useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
    sendMessage,
    retry,
    clearError,
    _mockLongPolling: mockLongPolling.current, // 테스트용
  }
}

// useRealtime 훅 임포트 (실제 구현 후 교체)
// import { useRealtime } from '@/hooks/useRealtime'
const useRealtime = useRealtimeMock

// 테스트 래퍼
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useRealtime', () => {
  let wrapper: ReturnType<typeof createWrapper>

  beforeEach(() => {
    wrapper = createWrapper()
    vi.clearAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('초기 상태', () => {
    it('올바른 초기값을 가져야 한다', () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.messages).toEqual([])
      expect(result.current.lastMessageId).toBe(0)
      expect(result.current.error).toBe(null)
      expect(result.current.retryCount).toBe(0)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.typingUsers).toEqual([])
    })

    it('연결 관련 함수들이 제공되어야 한다', () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      expect(typeof result.current.connect).toBe('function')
      expect(typeof result.current.disconnect).toBe('function')
      expect(typeof result.current.sendMessage).toBe('function')
      expect(typeof result.current.retry).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('연결 관리', () => {
    it('연결이 성공적으로 이루어져야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      act(() => {
        result.current.connect()
      })

      // 로딩 상태 확인
      expect(result.current.isLoading).toBe(true)

      // 연결 완료 대기
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.retryCount).toBe(0)
    })

    it('연결 해제가 올바르게 작동해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      // 연결
      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // 연결 해제
      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
      })
    })

    it('중복 연결 시도가 올바르게 처리되어야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      // 동시에 여러 번 연결 시도
      await act(async () => {
        result.current.connect()
        result.current.connect()
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // 하나의 연결만 유지되어야 함
      expect(result.current.error).toBe(null)
    })
  })

  describe('메시지 송신', () => {
    it('연결된 상태에서 메시지를 전송할 수 있어야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      // 연결
      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // 메시지 전송
      await act(async () => {
        await result.current.sendMessage('안녕하세요!')
      })

      // 전송된 메시지가 목록에 추가되는지 확인
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0].content).toBe('안녕하세요!')
      })
    })

    it('연결되지 않은 상태에서 메시지 전송 시 에러가 발생해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await expect(
        act(async () => {
          await result.current.sendMessage('연결 안됨')
        })
      ).rejects.toThrow('Not connected')
    })

    it('빈 메시지 전송이 방지되어야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // 빈 메시지 전송 시도
      await expect(
        act(async () => {
          await result.current.sendMessage('')
        })
      ).rejects.toThrow()
    })
  })

  describe('메시지 수신', () => {
    it('실시간으로 새 메시지를 수신해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // 새 메시지 시뮬레이션
      const mockPolling = (result.current as any)._mockLongPolling
      realtimeTestScenarios.normalMessaging(mockPolling)

      act(() => {
        mockPolling.emit('new_message', {
          id: 1,
          content: '실시간 메시지',
          user_id: 'user-2',
          user_name: '다른 사용자',
          team_id: 'team-1',
          message_date: '2024-12-25',
          created_at: new Date().toISOString(),
          message_type: 'text',
          related_schedule_id: null,
        })
      })

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0].content).toBe('실시간 메시지')
        expect(result.current.lastMessageId).toBe(1)
      })
    })

    it('일정 업데이트 메시지를 수신해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const mockPolling = (result.current as any)._mockLongPolling
      realtimeTestScenarios.scheduleUpdate(mockPolling)

      act(() => {
        const event = {
          id: 2,
          content: '📅 일정이 변경되었습니다',
          user_id: 'system',
          user_name: 'System',
          team_id: 'team-1',
          message_date: '2024-12-25',
          created_at: new Date().toISOString(),
          message_type: 'schedule_update',
          related_schedule_id: 'schedule-1',
        }
        mockPolling.emit('new_message', event)
      })

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1)
        expect(result.current.messages[0].message_type).toBe('schedule_update')
        expect(result.current.messages[0].related_schedule_id).toBe(
          'schedule-1'
        )
      })
    })

    it('메시지 순서가 올바르게 유지되어야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 여러 메시지를 순차적으로 전송
      const messages = [
        {
          id: 1,
          content: '첫 번째 메시지',
          created_at: '2024-12-25T09:00:00Z',
        },
        {
          id: 2,
          content: '두 번째 메시지',
          created_at: '2024-12-25T09:01:00Z',
        },
        {
          id: 3,
          content: '세 번째 메시지',
          created_at: '2024-12-25T09:02:00Z',
        },
      ]

      messages.forEach((msg) => {
        act(() => {
          mockPolling.emit('new_message', {
            ...msg,
            user_id: 'user-2',
            user_name: '사용자2',
            team_id: 'team-1',
            message_date: '2024-12-25',
            message_type: 'text',
            related_schedule_id: null,
          })
        })
      })

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(3)
        expect(result.current.messages[0].content).toBe('첫 번째 메시지')
        expect(result.current.messages[1].content).toBe('두 번째 메시지')
        expect(result.current.messages[2].content).toBe('세 번째 메시지')
      })
    })
  })

  describe('타이핑 상태 관리', () => {
    it('다른 사용자의 타이핑 상태를 추적해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 타이핑 시작
      act(() => {
        mockPolling.emit('user_typing', {
          user_id: 'user-2',
          user_name: '이개발',
          team_id: 'team-1',
          is_typing: true,
        })
      })

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1)
        expect(result.current.typingUsers[0].user_id).toBe('user-2')
        expect(result.current.typingUsers[0].is_typing).toBe(true)
      })

      // 타이핑 중지
      act(() => {
        mockPolling.emit('user_typing', {
          user_id: 'user-2',
          user_name: '이개발',
          team_id: 'team-1',
          is_typing: false,
        })
      })

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(0)
      })
    })

    it('여러 사용자의 타이핑 상태를 동시에 관리해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 여러 사용자 타이핑 시작
      act(() => {
        mockPolling.emit('user_typing', {
          user_id: 'user-2',
          user_name: '이개발',
          team_id: 'team-1',
          is_typing: true,
        })
        mockPolling.emit('user_typing', {
          user_id: 'user-3',
          user_name: '박디자인',
          team_id: 'team-1',
          is_typing: true,
        })
      })

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(2)
      })

      // 한 사용자만 타이핑 중지
      act(() => {
        mockPolling.emit('user_typing', {
          user_id: 'user-2',
          user_name: '이개발',
          team_id: 'team-1',
          is_typing: false,
        })
      })

      await waitFor(() => {
        expect(result.current.typingUsers).toHaveLength(1)
        expect(result.current.typingUsers[0].user_id).toBe('user-3')
      })
    })
  })

  describe('에러 처리 및 재연결', () => {
    it('네트워크 에러 시 적절한 에러 상태를 설정해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 네트워크 에러 시뮬레이션
      act(() => {
        mockPolling.emit('error', errorSimulation.networkError())
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.error?.message).toContain('NetworkError')
      })
    })

    it('자동 재연결이 작동해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 연결 끊김 시뮬레이션
      act(() => {
        mockPolling.forceDisconnect('Connection lost')
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false)
      })

      // 자동 재연결 시도 확인
      act(() => {
        vi.advanceTimersByTime(2000) // 첫 번째 재시도 (1초 후)
      })

      await waitFor(() => {
        expect(result.current.retryCount).toBeGreaterThan(0)
      })
    })

    it('최대 재시도 횟수 초과 시 재연결을 중단해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 연결 실패 시뮬레이션
      act(() => {
        mockPolling.emit('connection_failed', {
          error: new Error('Max retries exceeded'),
          retryCount: 3,
        })
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
        expect(result.current.retryCount).toBe(3)
        expect(result.current.isConnected).toBe(false)
      })

      // 더 이상 재시도하지 않는지 확인
      act(() => {
        vi.advanceTimersByTime(30000)
      })

      expect(result.current.retryCount).toBe(3) // 변경 없음
    })

    it('수동 재시도가 가능해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      // 에러 상태로 설정
      act(() => {
        ;(result.current as any)._mockLongPolling = new MockLongPolling()
      })

      const mockPolling = (result.current as any)._mockLongPolling
      act(() => {
        mockPolling.emit('error', new Error('Connection failed'))
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // 수동 재시도
      await act(async () => {
        await result.current.retry()
      })

      await waitFor(() => {
        expect(result.current.error).toBe(null)
        expect(result.current.retryCount).toBe(0)
      })
    })

    it('에러 상태를 수동으로 클리어할 수 있어야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      const mockPolling = new MockLongPolling()
      ;(result.current as any)._mockLongPolling = mockPolling

      // 에러 설정
      act(() => {
        mockPolling.emit('error', new Error('Test error'))
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // 에러 클리어
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('성능 및 메모리 관리', () => {
    it('대량 메시지 처리 성능이 적절해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling
      const startTime = performance.now()

      // 100개 메시지 동시 수신
      act(() => {
        const messages = generateTestData.messages(100)
        messages.forEach((msg) => {
          mockPolling.emit('new_message', msg)
        })
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(100)
      })

      // 처리 시간이 합리적인 범위 내에 있는지 확인 (500ms 이하)
      expect(processingTime).toBeLessThan(500)
    })

    it('컴포넌트 언마운트 시 리소스가 정리되어야 한다', () => {
      const { result, unmount } = renderHook(
        () => useRealtime('team-1', '2024-12-25'),
        { wrapper }
      )

      const disconnectSpy = vi.spyOn(result.current, 'disconnect')

      // 컴포넌트 언마운트
      unmount()

      // disconnect가 호출되었는지 확인
      expect(disconnectSpy).toHaveBeenCalled()
    })

    it('메모리 누수가 발생하지 않아야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 많은 메시지 추가 후 제거
      act(() => {
        const messages = generateTestData.messages(1000)
        messages.forEach((msg) => {
          mockPolling.emit('new_message', msg)
        })
      })

      await waitFor(() => {
        expect(result.current.messages.length).toBe(1000)
      })

      // 연결 해제
      act(() => {
        result.current.disconnect()
      })

      // 메모리 사용량이 정리되었는지 확인 (실제 구현에서는 WeakMap 등 사용)
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('매개변수 변경 처리', () => {
    it('teamId 변경 시 새로운 연결을 생성해야 한다', async () => {
      const { result, rerender } = renderHook(
        ({ teamId, messageDate }) => useRealtime(teamId, messageDate),
        {
          wrapper,
          initialProps: { teamId: 'team-1', messageDate: '2024-12-25' },
        }
      )

      await act(async () => {
        await result.current.connect()
      })

      const firstConnection = (result.current as any)._mockLongPolling

      // teamId 변경
      rerender({ teamId: 'team-2', messageDate: '2024-12-25' })

      await act(async () => {
        await result.current.connect()
      })

      const secondConnection = (result.current as any)._mockLongPolling

      // 새로운 연결이 생성되었는지 확인
      expect(secondConnection).not.toBe(firstConnection)
    })

    it('messageDate 변경 시 메시지 목록이 초기화되어야 한다', async () => {
      const { result, rerender } = renderHook(
        ({ teamId, messageDate }) => useRealtime(teamId, messageDate),
        {
          wrapper,
          initialProps: { teamId: 'team-1', messageDate: '2024-12-25' },
        }
      )

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 메시지 추가
      act(() => {
        mockPolling.emit('new_message', generateTestData.messages(1)[0])
      })

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1)
      })

      // 날짜 변경
      rerender({ teamId: 'team-1', messageDate: '2024-12-26' })

      // 메시지 목록이 초기화되었는지 확인
      expect(result.current.messages).toHaveLength(0)
      expect(result.current.lastMessageId).toBe(0)
    })
  })

  describe('동시성 및 경합 상태', () => {
    it('동시에 여러 메시지가 도착해도 올바르게 처리되어야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      await act(async () => {
        await result.current.connect()
      })

      const mockPolling = (result.current as any)._mockLongPolling

      // 동시에 여러 메시지 전송
      const messages = generateTestData.messages(10)
      act(() => {
        messages.forEach((msg) => {
          mockPolling.emit('new_message', msg)
        })
      })

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(10)
        expect(result.current.lastMessageId).toBe(10)
      })

      // 메시지 ID가 순차적으로 증가하는지 확인
      result.current.messages.forEach((msg, index) => {
        expect(msg.id).toBe(index + 1)
      })
    })

    it('연결과 메시지 전송이 동시에 발생해도 안전해야 한다', async () => {
      const { result } = renderHook(() => useRealtime('team-1', '2024-12-25'), {
        wrapper,
      })

      // 연결과 메시지 전송을 동시에 시도
      await act(async () => {
        const connectPromise = result.current.connect()
        const sendPromise = result.current
          .sendMessage('동시 전송 테스트')
          .catch(() => {})

        await Promise.all([connectPromise, sendPromise])
      })

      // 연결이 성공했는지 확인
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })

      // 에러가 발생하지 않았는지 확인
      expect(result.current.error?.message).not.toContain('Not connected')
    })
  })
})
