import { create } from 'zustand'
import type { Message, User } from '@/types'

export interface ChatMessage extends Message {
  user: {
    id: number
    username: string
    full_name: string
  }
}

export interface ConnectionStatus {
  isConnected: boolean
  lastConnected?: Date
  reconnecting: boolean
}

export interface TypingIndicator {
  userId: number
  username: string
  timestamp: Date
}

interface ChatState {
  // 메시지 관련
  messages: ChatMessage[]
  messagesByDate: { [key: string]: ChatMessage[] }
  currentDate: string
  isLoading: boolean
  error: string | null

  // 연결 상태
  connectionStatus: ConnectionStatus

  // 타이핑 인디케이터
  typingUsers: TypingIndicator[]

  // 롱 폴링 관련
  pollingInterval: number | null
  lastMessageId: number | null

  // 메시지 액션
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: number, updates: Partial<ChatMessage>) => void
  removeMessage: (messageId: number) => void
  clearMessages: () => void

  // 날짜별 메시지 관리
  setCurrentDate: (date: string) => void
  getMessagesForDate: (date: string) => ChatMessage[]
  groupMessagesByDate: (messages: ChatMessage[]) => void

  // 연결 상태 관리
  setConnectionStatus: (status: Partial<ConnectionStatus>) => void
  setConnected: (connected: boolean) => void
  setReconnecting: (reconnecting: boolean) => void

  // 타이핑 인디케이터
  addTypingUser: (user: { userId: number; username: string }) => void
  removeTypingUser: (userId: number) => void
  clearTypingUsers: () => void

  // 로딩 및 에러
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // 폴링 관리
  setPollingInterval: (intervalId: number | null) => void
  setLastMessageId: (messageId: number | null) => void

  // 유틸리티
  reset: () => void
}

const initialState = {
  messages: [],
  messagesByDate: {},
  currentDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  error: null,
  connectionStatus: {
    isConnected: false,
    reconnecting: false,
  },
  typingUsers: [],
  pollingInterval: null,
  lastMessageId: null,
}

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  // 메시지 액션
  setMessages: (messages) => {
    set({ messages })
    get().groupMessagesByDate(messages)
  },

  addMessage: (message) => {
    const state = get()
    const newMessages = [...state.messages, message]
    set({ messages: newMessages })
    get().groupMessagesByDate(newMessages)

    // 최신 메시지 ID 업데이트
    if (message.id > (state.lastMessageId || 0)) {
      set({ lastMessageId: message.id })
    }
  },

  updateMessage: (messageId, updates) => {
    const state = get()
    const updatedMessages = state.messages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    )
    set({ messages: updatedMessages })
    get().groupMessagesByDate(updatedMessages)
  },

  removeMessage: (messageId) => {
    const state = get()
    const filteredMessages = state.messages.filter(msg => msg.id !== messageId)
    set({ messages: filteredMessages })
    get().groupMessagesByDate(filteredMessages)
  },

  clearMessages: () => {
    set({ messages: [], messagesByDate: {} })
  },

  // 날짜별 메시지 관리
  setCurrentDate: (date) => {
    set({ currentDate: date })
  },

  getMessagesForDate: (date) => {
    const state = get()
    return state.messagesByDate[date] || []
  },

  groupMessagesByDate: (messages) => {
    const grouped: { [key: string]: ChatMessage[] } = {}

    messages.forEach(message => {
      const messageDate = new Date(message.message_date).toISOString().split('T')[0]

      if (!grouped[messageDate]) {
        grouped[messageDate] = []
      }
      grouped[messageDate].push(message)
    })

    // 각 날짜별로 시간순 정렬
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })

    set({ messagesByDate: grouped })
  },

  // 연결 상태 관리
  setConnectionStatus: (status) => {
    set(state => ({
      connectionStatus: { ...state.connectionStatus, ...status }
    }))
  },

  setConnected: (connected) => {
    set(state => ({
      connectionStatus: {
        ...state.connectionStatus,
        isConnected: connected,
        lastConnected: connected ? new Date() : state.connectionStatus.lastConnected,
        reconnecting: false,
      }
    }))
  },

  setReconnecting: (reconnecting) => {
    set(state => ({
      connectionStatus: { ...state.connectionStatus, reconnecting }
    }))
  },

  // 타이핑 인디케이터
  addTypingUser: ({ userId, username }) => {
    const state = get()
    const existingIndex = state.typingUsers.findIndex(user => user.userId === userId)

    if (existingIndex >= 0) {
      // 기존 사용자의 타임스탬프 업데이트
      const updatedTypingUsers = [...state.typingUsers]
      updatedTypingUsers[existingIndex] = {
        ...updatedTypingUsers[existingIndex],
        timestamp: new Date(),
      }
      set({ typingUsers: updatedTypingUsers })
    } else {
      // 새로운 타이핑 사용자 추가
      set({
        typingUsers: [...state.typingUsers, {
          userId,
          username,
          timestamp: new Date(),
        }]
      })
    }

    // 5초 후 자동 제거
    setTimeout(() => {
      get().removeTypingUser(userId)
    }, 5000)
  },

  removeTypingUser: (userId) => {
    set(state => ({
      typingUsers: state.typingUsers.filter(user => user.userId !== userId)
    }))
  },

  clearTypingUsers: () => {
    set({ typingUsers: [] })
  },

  // 로딩 및 에러
  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  setError: (error) => {
    set({ error })
  },

  // 폴링 관리
  setPollingInterval: (intervalId) => {
    const state = get()

    // 기존 폴링 정리
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
    }

    set({ pollingInterval: intervalId })
  },

  setLastMessageId: (messageId) => {
    set({ lastMessageId: messageId })
  },

  // 유틸리티
  reset: () => {
    const state = get()

    // 폴링 정리
    if (state.pollingInterval) {
      clearInterval(state.pollingInterval)
    }

    set(initialState)
  },
}))