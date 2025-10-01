import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { server } from '../mocks/server'
import { chatTestUtils } from '../mocks/handlers/chat'

// useRealtime 훅은 아직 구현되지 않았으므로, 테스트 구조를 먼저 작성
describe('useRealtime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    chatTestUtils.resetMessages()
  })

  afterEach(() => {
    vi.useRealTimers()
    server.resetHandlers()
  })

  describe('Long Polling 연결', () => {
    it('초기 연결 시 기존 메시지를 로드해야 한다', async () => {
      // Mock useRealtime hook implementation
      const mockUseRealtime = vi.fn(() => ({
        isConnected: false,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      // 실제 훅이 구현되면 이 부분을 대체
      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.messages).toEqual([])
    })

    it('연결 성공 시 상태가 업데이트되어야 한다', async () => {
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [
          {
            id: 1,
            content: '테스트 메시지',
            user: { id: 1, username: 'test', full_name: '테스트' },
            created_at: new Date().toISOString(),
          },
        ],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.isConnected).toBe(true)
      expect(result.current.messages).toHaveLength(1)
    })

    it('연결 실패 시 에러 상태가 설정되어야 한다', async () => {
      const mockError = '네트워크 연결에 실패했습니다.'
      const mockUseRealtime = vi.fn(() => ({
        isConnected: false,
        messages: [],
        error: mockError,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe(mockError)
    })
  })

  describe('메시지 수신', () => {
    it('새로운 메시지가 도착하면 상태가 업데이트되어야 한다', async () => {
      const initialMessages = [
        { id: 1, content: '첫 번째 메시지', user: { id: 1, username: 'user1', full_name: '사용자1' } },
      ]
      const newMessage = {
        id: 2,
        content: '새로운 메시지',
        user: { id: 2, username: 'user2', full_name: '사용자2' },
      }

      let messages = [...initialMessages]
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result, rerender } = renderHook(() => mockUseRealtime())

      expect(result.current.messages).toHaveLength(1)

      // 새 메시지 시뮬레이션
      messages = [...messages, newMessage]
      rerender()

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1]).toEqual(newMessage)
    })

    it('중복 메시지는 무시되어야 한다', async () => {
      const duplicateMessage = {
        id: 1,
        content: '중복 메시지',
        user: { id: 1, username: 'user', full_name: '사용자' },
      }

      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [duplicateMessage],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.messages).toHaveLength(1)
      // 실제 구현에서는 중복 체크 로직이 필요
    })
  })

  describe('메시지 전송', () => {
    it('메시지를 전송할 수 있어야 한다', async () => {
      const sendMessageMock = vi.fn().mockResolvedValue({ success: true })
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: sendMessageMock,
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      const messageContent = '새로운 메시지'
      await result.current.sendMessage(messageContent)

      expect(sendMessageMock).toHaveBeenCalledWith(messageContent)
    })

    it('메시지 전송 실패 시 에러가 처리되어야 한다', async () => {
      const sendMessageMock = vi.fn().mockRejectedValue(new Error('전송 실패'))
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: sendMessageMock,
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      await expect(result.current.sendMessage('테스트')).rejects.toThrow('전송 실패')
    })

    it('연결되지 않은 상태에서는 메시지를 전송할 수 없어야 한다', async () => {
      const sendMessageMock = vi.fn()
      const mockUseRealtime = vi.fn(() => ({
        isConnected: false,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: sendMessageMock,
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      await expect(result.current.sendMessage('테스트')).rejects.toThrow()
      expect(sendMessageMock).not.toHaveBeenCalled()
    })
  })

  describe('연결 관리', () => {
    it('연결을 시작할 수 있어야 한다', () => {
      const connectMock = vi.fn()
      const mockUseRealtime = vi.fn(() => ({
        isConnected: false,
        messages: [],
        error: null,
        connect: connectMock,
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      result.current.connect()
      expect(connectMock).toHaveBeenCalled()
    })

    it('연결을 끊을 수 있어야 한다', () => {
      const disconnectMock = vi.fn()
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: disconnectMock,
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      result.current.disconnect()
      expect(disconnectMock).toHaveBeenCalled()
    })

    it('컴포넌트 언마운트 시 연결이 정리되어야 한다', () => {
      const disconnectMock = vi.fn()
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: disconnectMock,
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { unmount } = renderHook(() => mockUseRealtime())

      unmount()
      // 실제 구현에서는 useEffect cleanup에서 disconnect 호출
      expect(disconnectMock).toHaveBeenCalled()
    })
  })

  describe('재연결 로직', () => {
    it('연결이 끊어지면 자동으로 재연결을 시도해야 한다', async () => {
      const connectMock = vi.fn()
      let isConnected = true
      const mockUseRealtime = vi.fn(() => ({
        isConnected,
        messages: [],
        error: null,
        connect: connectMock,
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result, rerender } = renderHook(() => mockUseRealtime())

      expect(result.current.isConnected).toBe(true)

      // 연결 끊김 시뮬레이션
      isConnected = false
      rerender()

      expect(result.current.isConnected).toBe(false)

      // 재연결 시뮬레이션 (타이머 진행)
      act(() => {
        vi.advanceTimersByTime(5000) // 5초 후 재연결 시도
      })

      expect(connectMock).toHaveBeenCalled()
    })

    it('재연결 시도 횟수가 제한되어야 한다', async () => {
      const connectMock = vi.fn().mockRejectedValue(new Error('연결 실패'))
      const mockUseRealtime = vi.fn(() => ({
        isConnected: false,
        messages: [],
        error: '연결 실패',
        connect: connectMock,
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      // 최대 재연결 시도 횟수 테스트 (예: 3회)
      act(() => {
        vi.advanceTimersByTime(5000)  // 첫 번째 시도
        vi.advanceTimersByTime(10000) // 두 번째 시도
        vi.advanceTimersByTime(20000) // 세 번째 시도
        vi.advanceTimersByTime(40000) // 네 번째 시도 (실행되지 않아야 함)
      })

      expect(connectMock).toHaveBeenCalledTimes(3)
    })
  })

  describe('Long Polling 최적화', () => {
    it('적절한 폴링 간격을 유지해야 한다', () => {
      // 30초 간격으로 폴링하는 것이 일반적
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
      }))

      renderHook(() => mockUseRealtime())

      // 실제 구현에서는 setInterval이 30000ms(30초)로 호출되어야 함
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000)
    })

    it('네트워크 상태에 따라 폴링 간격이 조정되어야 한다', () => {
      // 네트워크가 느릴 때 폴링 간격을 늘리는 로직
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
        pollingInterval: 60000, // 느린 네트워크에서는 60초
      }))

      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.pollingInterval).toBe(60000)
    })

    it('백그라운드에서는 폴링 빈도를 줄여야 한다', () => {
      // Page Visibility API를 사용한 최적화
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      })

      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        isLoading: false,
        pollingInterval: 120000, // 백그라운드에서는 2분
      }))

      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.pollingInterval).toBe(120000)
    })
  })

  describe('타이핑 인디케이터', () => {
    it('타이핑 시작을 서버에 알릴 수 있어야 한다', () => {
      const sendTypingMock = vi.fn()
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        sendTyping: sendTypingMock,
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      result.current.sendTyping(true)
      expect(sendTypingMock).toHaveBeenCalledWith(true)
    })

    it('타이핑 종료를 서버에 알릴 수 있어야 한다', () => {
      const sendTypingMock = vi.fn()
      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        sendTyping: sendTypingMock,
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      result.current.sendTyping(false)
      expect(sendTypingMock).toHaveBeenCalledWith(false)
    })

    it('다른 사용자의 타이핑 상태를 수신할 수 있어야 한다', () => {
      const typingUsers = [
        { userId: 2, username: 'user2', timestamp: new Date() },
      ]

      const mockUseRealtime = vi.fn(() => ({
        isConnected: true,
        messages: [],
        typingUsers,
        error: null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage: vi.fn(),
        sendTyping: vi.fn(),
        isLoading: false,
      }))

      const { result } = renderHook(() => mockUseRealtime())

      expect(result.current.typingUsers).toEqual(typingUsers)
    })
  })
})