import { vi } from 'vitest'

// Long Polling 상태 타입
export interface LongPollingState {
  isConnected: boolean
  lastMessageId: number
  pollingInterval: number
  retryCount: number
  maxRetries: number
}

// 실시간 이벤트 타입
export interface RealtimeEvent {
  type: 'new_message' | 'schedule_update' | 'user_typing' | 'user_joined' | 'user_left'
  data: any
  timestamp: string
}

// Mock Long Polling 클래스
export class MockLongPolling {
  private state: LongPollingState = {
    isConnected: false,
    lastMessageId: 0,
    pollingInterval: 1000,
    retryCount: 0,
    maxRetries: 3,
  }

  private eventHandlers: Map<string, Function[]> = new Map()
  private pollingTimer: NodeJS.Timeout | null = null
  private mockEvents: RealtimeEvent[] = []
  private eventIndex = 0

  constructor(private baseUrl: string = 'http://localhost:3000/api') {}

  // 이벤트 리스너 등록
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  // 이벤트 리스너 제거
  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // 이벤트 발생
  private emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event) || []
    handlers.forEach(handler => handler(...args))
  }

  // 연결 시작
  async connect(teamId: string, messageDate: string) {
    if (this.state.isConnected) return

    this.state.isConnected = true
    this.state.retryCount = 0
    this.emit('connect')

    // 폴링 시작
    this.startPolling(teamId, messageDate)
  }

  // 연결 종료
  disconnect() {
    if (!this.state.isConnected) return

    this.state.isConnected = false
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
    this.emit('disconnect')
  }

  // 메시지 전송
  async sendMessage(teamId: string, messageDate: string, content: string) {
    if (!this.state.isConnected) {
      throw new Error('Not connected')
    }

    // 메시지 전송 시뮬레이션
    const message = {
      id: Date.now(),
      content,
      user_id: 'current-user',
      user_name: '현재 사용자',
      team_id: teamId,
      message_date: messageDate,
      created_at: new Date().toISOString(),
      message_type: 'text' as const,
      related_schedule_id: null,
    }

    // 전송 이벤트
    this.emit('message_sent', message)

    // 응답 시뮬레이션 (약간의 지연)
    setTimeout(() => {
      this.emit('new_message', message)
    }, 100)

    return message
  }

  // 폴링 시작
  private startPolling(teamId: string, messageDate: string) {
    if (!this.state.isConnected) return

    const poll = async () => {
      try {
        // 새 이벤트 확인
        const newEvents = this.getNewEvents()

        if (newEvents.length > 0) {
          newEvents.forEach(event => {
            this.emit(event.type, event.data)
          })
          this.state.lastMessageId = Math.max(...newEvents.map(e => e.data.id || 0))
        }

        // 재연결 성공 시 재시도 카운터 초기화
        this.state.retryCount = 0

        // 다음 폴링 스케줄링
        if (this.state.isConnected) {
          this.pollingTimer = setTimeout(poll, this.state.pollingInterval)
        }

      } catch (error) {
        this.handlePollingError(error, teamId, messageDate)
      }
    }

    poll()
  }

  // 폴링 에러 처리
  private handlePollingError(error: any, teamId: string, messageDate: string) {
    this.state.retryCount++
    this.emit('error', error)

    if (this.state.retryCount <= this.state.maxRetries) {
      // 백오프 전략: 재시도 간격을 점진적으로 증가
      const backoffDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000)

      this.pollingTimer = setTimeout(() => {
        if (this.state.isConnected) {
          this.startPolling(teamId, messageDate)
        }
      }, backoffDelay)

      this.emit('reconnecting', { attempt: this.state.retryCount, delay: backoffDelay })
    } else {
      // 최대 재시도 횟수 초과
      this.state.isConnected = false
      this.emit('connection_failed', { error, retryCount: this.state.retryCount })
    }
  }

  // 새 이벤트 가져오기 (테스트용)
  private getNewEvents(): RealtimeEvent[] {
    const events = this.mockEvents.slice(this.eventIndex)
    this.eventIndex = this.mockEvents.length
    return events
  }

  // 테스트용 이벤트 추가
  addMockEvent(event: RealtimeEvent) {
    this.mockEvents.push(event)
  }

  // 테스트용 상태 설정
  setState(newState: Partial<LongPollingState>) {
    this.state = { ...this.state, ...newState }
  }

  // 현재 상태 반환
  getState(): LongPollingState {
    return { ...this.state }
  }

  // 연결 강제 실패
  forceDisconnect(reason: string = 'Connection lost') {
    this.state.isConnected = false
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer)
      this.pollingTimer = null
    }
    this.emit('disconnect', { reason })
  }

  // 네트워크 지연 시뮬레이션
  simulateNetworkDelay(delay: number) {
    this.state.pollingInterval = delay
  }
}

// 실시간 테스트 시나리오
export const realtimeTestScenarios = {
  // 정상적인 메시지 송수신
  normalMessaging: (mockPolling: MockLongPolling) => {
    const messages = [
      {
        type: 'new_message' as const,
        data: {
          id: 1,
          content: '안녕하세요!',
          user_id: 'user-1',
          user_name: '김팀장',
          team_id: 'team-1',
          message_date: '2024-12-25',
          created_at: new Date().toISOString(),
          message_type: 'text',
          related_schedule_id: null,
        },
        timestamp: new Date().toISOString(),
      },
      {
        type: 'new_message' as const,
        data: {
          id: 2,
          content: '회의 준비 완료했습니다.',
          user_id: 'user-2',
          user_name: '이개발',
          team_id: 'team-1',
          message_date: '2024-12-25',
          created_at: new Date().toISOString(),
          message_type: 'text',
          related_schedule_id: null,
        },
        timestamp: new Date().toISOString(),
      },
    ]

    messages.forEach(msg => mockPolling.addMockEvent(msg))
  },

  // 일정 업데이트 알림
  scheduleUpdate: (mockPolling: MockLongPolling) => {
    const event = {
      type: 'schedule_update' as const,
      data: {
        id: 3,
        content: '📅 일정이 변경되었습니다: 팀 회의 (14:00 → 15:00)',
        user_id: 'system',
        user_name: 'System',
        team_id: 'team-1',
        message_date: '2024-12-25',
        created_at: new Date().toISOString(),
        message_type: 'schedule_update',
        related_schedule_id: 'schedule-1',
        schedule_changes: {
          title: '팀 회의',
          start_time: '2024-12-25T15:00:00Z',
          end_time: '2024-12-25T16:00:00Z',
        },
      },
      timestamp: new Date().toISOString(),
    }

    mockPolling.addMockEvent(event)
  },

  // 사용자 타이핑 상태
  userTyping: (mockPolling: MockLongPolling) => {
    const event = {
      type: 'user_typing' as const,
      data: {
        user_id: 'user-2',
        user_name: '이개발',
        team_id: 'team-1',
        is_typing: true,
      },
      timestamp: new Date().toISOString(),
    }

    mockPolling.addMockEvent(event)

    // 3초 후 타이핑 중지
    setTimeout(() => {
      mockPolling.addMockEvent({
        ...event,
        data: { ...event.data, is_typing: false },
      })
    }, 3000)
  },

  // 연결 불안정 상황
  unstableConnection: (mockPolling: MockLongPolling) => {
    // 초기 연결
    setTimeout(() => mockPolling.forceDisconnect('Network timeout'), 1000)

    // 재연결 시도
    setTimeout(() => {
      mockPolling.setState({ isConnected: true, retryCount: 1 })
    }, 3000)

    // 다시 연결 끊김
    setTimeout(() => mockPolling.forceDisconnect('Server error'), 5000)
  },

  // 대량 메시지 수신
  highVolumeMessages: (mockPolling: MockLongPolling) => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      type: 'new_message' as const,
      data: {
        id: i + 10,
        content: `대량 메시지 테스트 ${i + 1}`,
        user_id: `user-${(i % 3) + 1}`,
        user_name: `사용자${(i % 3) + 1}`,
        team_id: 'team-1',
        message_date: '2024-12-25',
        created_at: new Date(Date.now() + i * 1000).toISOString(),
        message_type: 'text',
        related_schedule_id: null,
      },
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
    }))

    messages.forEach(msg => mockPolling.addMockEvent(msg))
  },
}

// 성능 테스트 헬퍼
export const performanceTestHelpers = {
  // 메시지 렌더링 성능 측정
  measureMessageRenderTime: (messageCount: number) => {
    const startTime = performance.now()

    // 메시지 렌더링 시뮬레이션
    const container = document.createElement('div')
    for (let i = 0; i < messageCount; i++) {
      const messageEl = document.createElement('div')
      messageEl.textContent = `메시지 ${i + 1}`
      container.appendChild(messageEl)
    }

    const endTime = performance.now()
    return {
      messageCount,
      renderTime: endTime - startTime,
      messagesPerMs: messageCount / (endTime - startTime),
    }
  },

  // 스크롤 성능 측정
  measureScrollPerformance: (container: HTMLElement, scrollDistance: number) => {
    const startTime = performance.now()

    // 스크롤 애니메이션 시뮬레이션
    let currentScroll = 0
    const step = scrollDistance / 10

    const animate = () => {
      currentScroll += step
      container.scrollTop = currentScroll

      if (currentScroll < scrollDistance) {
        requestAnimationFrame(animate)
      } else {
        const endTime = performance.now()
        return {
          scrollDistance,
          scrollTime: endTime - startTime,
          fps: 1000 / ((endTime - startTime) / 10),
        }
      }
    }

    animate()
  },

  // 폴링 성능 측정
  measurePollingPerformance: (mockPolling: MockLongPolling, duration: number) => {
    const startTime = performance.now()
    let eventCount = 0
    let errorCount = 0

    const onEvent = () => eventCount++
    const onError = () => errorCount++

    mockPolling.on('new_message', onEvent)
    mockPolling.on('error', onError)

    return new Promise((resolve) => {
      setTimeout(() => {
        mockPolling.off('new_message', onEvent)
        mockPolling.off('error', onError)

        const endTime = performance.now()
        resolve({
          duration: endTime - startTime,
          eventCount,
          errorCount,
          eventsPerSecond: eventCount / (duration / 1000),
          errorRate: errorCount / (eventCount + errorCount),
        })
      }, duration)
    })
  },
}

// 에러 상황 시뮬레이션
export const errorSimulation = {
  // 네트워크 에러
  networkError: () => {
    return new Error('NetworkError: Failed to fetch')
  },

  // 서버 에러
  serverError: (status: number = 500) => {
    const error = new Error(`Server Error: ${status}`)
    ;(error as any).status = status
    return error
  },

  // 타임아웃 에러
  timeoutError: () => {
    return new Error('TimeoutError: Request timeout')
  },

  // 인증 에러
  authError: () => {
    const error = new Error('AuthError: Unauthorized')
    ;(error as any).status = 401
    return error
  },

  // 율제한 에러
  rateLimitError: () => {
    const error = new Error('RateLimitError: Too many requests')
    ;(error as any).status = 429
    return error
  },
}

// Vitest Mock 함수들
export const createMockRealtimeHook = () => ({
  isConnected: vi.fn(() => true),
  lastMessageId: vi.fn(() => 0),
  messages: vi.fn(() => []),
  sendMessage: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  error: vi.fn(() => null),
  isLoading: vi.fn(() => false),
  retryCount: vi.fn(() => 0),
})

export const createMockChatService = () => ({
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  getMessageHistory: vi.fn(),
  searchMessages: vi.fn(),
  markAsRead: vi.fn(),
})

// 테스트 데이터 생성기
export const generateTestData = {
  messages: (count: number, teamId: string = 'team-1', date: string = '2024-12-25') => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      content: `테스트 메시지 ${i + 1}`,
      user_id: `user-${(i % 3) + 1}`,
      user_name: `사용자${(i % 3) + 1}`,
      team_id: teamId,
      message_date: date,
      created_at: new Date(Date.now() - (count - i) * 60000).toISOString(),
      message_type: 'text' as const,
      related_schedule_id: null,
    }))
  },

  scheduleMessages: (scheduleId: string, teamId: string = 'team-1') => {
    return [
      {
        id: 1000,
        content: '📅 새 일정이 추가되었습니다: 팀 회의',
        user_id: 'system',
        user_name: 'System',
        team_id: teamId,
        message_date: '2024-12-25',
        created_at: new Date().toISOString(),
        message_type: 'schedule_create' as const,
        related_schedule_id: scheduleId,
      },
      {
        id: 1001,
        content: '📅 일정이 변경되었습니다: 팀 회의 (14:00 → 15:00)',
        user_id: 'system',
        user_name: 'System',
        team_id: teamId,
        message_date: '2024-12-25',
        created_at: new Date().toISOString(),
        message_type: 'schedule_update' as const,
        related_schedule_id: scheduleId,
      },
    ]
  },

  typingStates: (userIds: string[]) => {
    return userIds.map(userId => ({
      user_id: userId,
      user_name: `사용자${userId}`,
      team_id: 'team-1',
      is_typing: true,
      started_at: new Date().toISOString(),
    }))
  },
}