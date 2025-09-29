import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '@/stores/chat-store'
import type { ChatMessage } from '@/stores/chat-store'

// Mock 데이터
const mockMessage: ChatMessage = {
  id: 1,
  team_id: 1,
  user_id: 1,
  content: '테스트 메시지',
  message_type: 'text',
  message_date: '2024-01-15',
  parent_message_id: null,
  metadata: null,
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T09:00:00Z',
  user: {
    id: 1,
    username: 'testuser',
    full_name: '테스트 사용자',
  },
}

const mockMessage2: ChatMessage = {
  id: 2,
  team_id: 1,
  user_id: 2,
  content: '두 번째 메시지',
  message_type: 'text',
  message_date: '2024-01-16',
  parent_message_id: 1,
  metadata: null,
  created_at: '2024-01-16T10:00:00Z',
  updated_at: '2024-01-16T10:00:00Z',
  user: {
    id: 2,
    username: 'member',
    full_name: '팀원',
  },
}

describe('ChatStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 초기화
    const { result } = renderHook(() => useChatStore())
    act(() => {
      result.current.reset()
    })
  })

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      expect(result.current.messages).toEqual([])
      expect(result.current.messagesByDate).toEqual({})
      expect(result.current.currentDate).toBe(new Date().toISOString().split('T')[0])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.connectionStatus.isConnected).toBe(false)
      expect(result.current.connectionStatus.reconnecting).toBe(false)
      expect(result.current.typingUsers).toEqual([])
      expect(result.current.pollingInterval).toBe(null)
      expect(result.current.lastMessageId).toBe(null)
    })
  })

  describe('메시지 관리', () => {
    it('메시지를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())
      const messages = [mockMessage, mockMessage2]

      act(() => {
        result.current.setMessages(messages)
      })

      expect(result.current.messages).toEqual(messages)
      expect(result.current.messagesByDate).toHaveProperty('2024-01-15')
      expect(result.current.messagesByDate).toHaveProperty('2024-01-16')
    })

    it('메시지를 추가할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addMessage(mockMessage)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0]).toEqual(mockMessage)
      expect(result.current.lastMessageId).toBe(mockMessage.id)
    })

    it('메시지를 업데이트할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addMessage(mockMessage)
      })

      const updatedContent = '업데이트된 메시지'
      act(() => {
        result.current.updateMessage(mockMessage.id, { content: updatedContent })
      })

      expect(result.current.messages[0].content).toBe(updatedContent)
    })

    it('메시지를 삭제할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addMessage(mockMessage)
        result.current.addMessage(mockMessage2)
      })

      expect(result.current.messages).toHaveLength(2)

      act(() => {
        result.current.removeMessage(mockMessage.id)
      })

      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].id).toBe(mockMessage2.id)
    })

    it('모든 메시지를 지울 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setMessages([mockMessage, mockMessage2])
      })

      expect(result.current.messages).toHaveLength(2)

      act(() => {
        result.current.clearMessages()
      })

      expect(result.current.messages).toHaveLength(0)
      expect(result.current.messagesByDate).toEqual({})
    })
  })

  describe('날짜별 메시지 관리', () => {
    it('현재 날짜를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())
      const testDate = '2024-01-20'

      act(() => {
        result.current.setCurrentDate(testDate)
      })

      expect(result.current.currentDate).toBe(testDate)
    })

    it('특정 날짜의 메시지를 조회할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setMessages([mockMessage, mockMessage2])
      })

      const messagesFor15th = result.current.getMessagesForDate('2024-01-15')
      const messagesFor16th = result.current.getMessagesForDate('2024-01-16')

      expect(messagesFor15th).toHaveLength(1)
      expect(messagesFor15th[0].id).toBe(mockMessage.id)
      expect(messagesFor16th).toHaveLength(1)
      expect(messagesFor16th[0].id).toBe(mockMessage2.id)
    })

    it('날짜별로 메시지를 그룹화해야 한다', () => {
      const { result } = renderHook(() => useChatStore())
      const messages = [mockMessage, mockMessage2]

      act(() => {
        result.current.groupMessagesByDate(messages)
      })

      expect(result.current.messagesByDate['2024-01-15']).toHaveLength(1)
      expect(result.current.messagesByDate['2024-01-16']).toHaveLength(1)
    })

    it('같은 날짜의 메시지는 시간순으로 정렬되어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      const message1 = { ...mockMessage, created_at: '2024-01-15T10:00:00Z' }
      const message2 = { ...mockMessage, id: 3, created_at: '2024-01-15T09:00:00Z' }
      const message3 = { ...mockMessage, id: 4, created_at: '2024-01-15T11:00:00Z' }

      act(() => {
        result.current.setMessages([message1, message3, message2])
      })

      const messagesFor15th = result.current.getMessagesForDate('2024-01-15')
      expect(messagesFor15th[0].created_at).toBe('2024-01-15T09:00:00Z')
      expect(messagesFor15th[1].created_at).toBe('2024-01-15T10:00:00Z')
      expect(messagesFor15th[2].created_at).toBe('2024-01-15T11:00:00Z')
    })
  })

  describe('연결 상태 관리', () => {
    it('연결 상태를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setConnectionStatus({ isConnected: true, reconnecting: false })
      })

      expect(result.current.connectionStatus.isConnected).toBe(true)
      expect(result.current.connectionStatus.reconnecting).toBe(false)
    })

    it('연결됨 상태를 설정할 때 타임스탬프가 기록되어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setConnected(true)
      })

      expect(result.current.connectionStatus.isConnected).toBe(true)
      expect(result.current.connectionStatus.lastConnected).toBeInstanceOf(Date)
      expect(result.current.connectionStatus.reconnecting).toBe(false)
    })

    it('재연결 상태를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setReconnecting(true)
      })

      expect(result.current.connectionStatus.reconnecting).toBe(true)
    })
  })

  describe('타이핑 인디케이터', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('타이핑 사용자를 추가할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser({ userId: 1, username: 'testuser' })
      })

      expect(result.current.typingUsers).toHaveLength(1)
      expect(result.current.typingUsers[0].userId).toBe(1)
      expect(result.current.typingUsers[0].username).toBe('testuser')
    })

    it('동일 사용자의 타이핑 상태는 타임스탬프만 업데이트되어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser({ userId: 1, username: 'testuser' })
      })

      const firstTimestamp = result.current.typingUsers[0].timestamp

      // 잠시 후 다시 타이핑
      act(() => {
        vi.advanceTimersByTime(1000)
        result.current.addTypingUser({ userId: 1, username: 'testuser' })
      })

      expect(result.current.typingUsers).toHaveLength(1)
      expect(result.current.typingUsers[0].timestamp).not.toEqual(firstTimestamp)
    })

    it('타이핑 사용자를 제거할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser({ userId: 1, username: 'testuser' })
        result.current.addTypingUser({ userId: 2, username: 'member' })
      })

      expect(result.current.typingUsers).toHaveLength(2)

      act(() => {
        result.current.removeTypingUser(1)
      })

      expect(result.current.typingUsers).toHaveLength(1)
      expect(result.current.typingUsers[0].userId).toBe(2)
    })

    it('모든 타이핑 사용자를 지울 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser({ userId: 1, username: 'testuser' })
        result.current.addTypingUser({ userId: 2, username: 'member' })
      })

      expect(result.current.typingUsers).toHaveLength(2)

      act(() => {
        result.current.clearTypingUsers()
      })

      expect(result.current.typingUsers).toHaveLength(0)
    })

    it('타이핑 사용자는 5초 후 자동으로 제거되어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.addTypingUser({ userId: 1, username: 'testuser' })
      })

      expect(result.current.typingUsers).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.typingUsers).toHaveLength(0)
    })
  })

  describe('로딩 및 에러 상태', () => {
    it('로딩 상태를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('에러 상태를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())
      const errorMessage = '네트워크 오류가 발생했습니다.'

      act(() => {
        result.current.setError(errorMessage)
      })

      expect(result.current.error).toBe(errorMessage)

      act(() => {
        result.current.setError(null)
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('폴링 관리', () => {
    it('폴링 인터벌을 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())
      const intervalId = 123

      act(() => {
        result.current.setPollingInterval(intervalId)
      })

      expect(result.current.pollingInterval).toBe(intervalId)
    })

    it('기존 폴링을 정리하고 새로운 폴링을 설정해야 한다', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setPollingInterval(123)
      })

      act(() => {
        result.current.setPollingInterval(456)
      })

      expect(clearIntervalSpy).toHaveBeenCalledWith(123)
      expect(result.current.pollingInterval).toBe(456)
    })

    it('마지막 메시지 ID를 설정할 수 있어야 한다', () => {
      const { result } = renderHook(() => useChatStore())

      act(() => {
        result.current.setLastMessageId(100)
      })

      expect(result.current.lastMessageId).toBe(100)
    })
  })

  describe('리셋 기능', () => {
    it('스토어를 초기 상태로 리셋할 수 있어야 한다', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      const { result } = renderHook(() => useChatStore())

      // 상태 변경
      act(() => {
        result.current.setMessages([mockMessage])
        result.current.setCurrentDate('2024-01-20')
        result.current.setLoading(true)
        result.current.setError('에러 발생')
        result.current.setConnected(true)
        result.current.addTypingUser({ userId: 1, username: 'test' })
        result.current.setPollingInterval(123)
        result.current.setLastMessageId(100)
      })

      // 리셋
      act(() => {
        result.current.reset()
      })

      // 초기 상태 확인
      expect(result.current.messages).toEqual([])
      expect(result.current.messagesByDate).toEqual({})
      expect(result.current.currentDate).toBe(new Date().toISOString().split('T')[0])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(result.current.connectionStatus.isConnected).toBe(false)
      expect(result.current.connectionStatus.reconnecting).toBe(false)
      expect(result.current.typingUsers).toEqual([])
      expect(result.current.pollingInterval).toBe(null)
      expect(result.current.lastMessageId).toBe(null)
      expect(clearIntervalSpy).toHaveBeenCalledWith(123)
    })
  })
})