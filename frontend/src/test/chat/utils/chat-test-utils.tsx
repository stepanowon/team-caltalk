import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { WebSocket } from 'ws'

// 채팅 테스트 전용 QueryClient
const createChatTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

// 채팅 컨텍스트 모킹
export const mockChatContext = {
  currentRoomId: 'team-1',
  currentDate: '2024-12-25',
  userId: 'user-1',
  userName: '테스트 사용자',
  teamRole: 'leader' as 'leader' | 'member',
}

// WebSocket 모킹
export const createMockWebSocket = () => {
  const mockWS = {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
  }

  return mockWS
}

// Long Polling 모킹
export const mockLongPolling = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  isConnected: true,
  lastMessageId: 0,
  poll: vi.fn(),
}

// 채팅 메시지 테스트 데이터
export const mockMessages = [
  {
    id: 1,
    content: '안녕하세요! 오늘 회의 일정 확인해주세요.',
    user_id: 'user-1',
    user_name: '김팀장',
    team_id: 'team-1',
    message_date: '2024-12-25',
    created_at: '2024-12-25T09:00:00Z',
    message_type: 'text' as const,
    related_schedule_id: null,
  },
  {
    id: 2,
    content: '네, 확인했습니다. 2시에 만나요!',
    user_id: 'user-2',
    user_name: '이개발',
    team_id: 'team-1',
    message_date: '2024-12-25',
    created_at: '2024-12-25T09:05:00Z',
    message_type: 'text' as const,
    related_schedule_id: null,
  },
  {
    id: 3,
    content: '📅 일정이 변경되었습니다: 팀 회의 (14:00 → 15:00)',
    user_id: 'system',
    user_name: 'System',
    team_id: 'team-1',
    message_date: '2024-12-25',
    created_at: '2024-12-25T13:30:00Z',
    message_type: 'schedule_update' as const,
    related_schedule_id: 'schedule-1',
  },
]

// 일정 테스트 데이터
export const mockSchedules = [
  {
    id: 'schedule-1',
    title: '팀 회의',
    description: '주간 팀 회의',
    start_time: '2024-12-25T15:00:00Z',
    end_time: '2024-12-25T16:00:00Z',
    team_id: 'team-1',
    created_by: 'user-1',
    participants: ['user-1', 'user-2', 'user-3'],
  },
]

// 실시간 이벤트 시뮬레이션
export const simulateRealtimeEvents = {
  newMessage: (message: Partial<typeof mockMessages[0]>) => {
    const event = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'new_message',
        data: {
          id: Date.now(),
          content: message.content || '테스트 메시지',
          user_id: message.user_id || 'user-test',
          user_name: message.user_name || '테스트 사용자',
          team_id: message.team_id || 'team-1',
          message_date: message.message_date || '2024-12-25',
          created_at: new Date().toISOString(),
          message_type: message.message_type || 'text',
          related_schedule_id: message.related_schedule_id || null,
        },
      }),
    })
    return event
  },

  scheduleUpdate: (scheduleId: string, changes: Record<string, any>) => {
    const event = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'schedule_update',
        data: {
          schedule_id: scheduleId,
          changes,
          updated_by: 'user-1',
          updated_at: new Date().toISOString(),
        },
      }),
    })
    return event
  },

  userTyping: (userId: string, userName: string) => {
    const event = new MessageEvent('message', {
      data: JSON.stringify({
        type: 'user_typing',
        data: {
          user_id: userId,
          user_name: userName,
          team_id: 'team-1',
        },
      }),
    })
    return event
  },

  connectionLost: () => {
    const event = new CloseEvent('close', {
      code: 1006,
      reason: 'Connection lost',
      wasClean: false,
    })
    return event
  },
}

// 채팅 성능 측정 헬퍼
export const performanceHelpers = {
  measureScrollPerformance: async (container: HTMLElement, messageCount: number) => {
    const startTime = performance.now()

    // 메시지 로딩 시뮬레이션
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      ...mockMessages[0],
      id: i + 1,
      content: `메시지 ${i + 1}`,
    }))

    // 스크롤 성능 측정
    container.scrollTop = container.scrollHeight

    const endTime = performance.now()
    return {
      duration: endTime - startTime,
      messageCount,
      messagesPerMs: messageCount / (endTime - startTime),
    }
  },

  measureRenderPerformance: (renderFn: () => void) => {
    const startTime = performance.now()
    renderFn()
    const endTime = performance.now()

    return {
      renderTime: endTime - startTime,
    }
  },
}

// 접근성 테스트 헬퍼
export const accessibilityHelpers = {
  checkChatAccessibility: (container: HTMLElement) => {
    const issues: string[] = []

    // 메시지 목록 접근성
    const messageList = container.querySelector('[role="log"]')
    if (!messageList) {
      issues.push('메시지 목록에 role="log" 속성이 없습니다.')
    }

    // 입력 필드 접근성
    const messageInput = container.querySelector('input[type="text"], textarea')
    if (messageInput && !messageInput.getAttribute('aria-label')) {
      issues.push('메시지 입력 필드에 aria-label이 없습니다.')
    }

    // 전송 버튼 접근성
    const sendButton = container.querySelector('button[type="submit"]')
    if (sendButton && !sendButton.getAttribute('aria-label')) {
      issues.push('전송 버튼에 aria-label이 없습니다.')
    }

    // 메시지 읽기 상태
    const messages = container.querySelectorAll('[data-message-id]')
    messages.forEach((message) => {
      if (!message.getAttribute('aria-label')) {
        issues.push('메시지에 aria-label이 없습니다.')
      }
    })

    return issues
  },

  checkKeyboardNavigation: async (container: HTMLElement) => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const navigationResults = []

    for (let i = 0; i < focusableElements.length; i++) {
      await user.tab()
      const focused = document.activeElement
      navigationResults.push({
        index: i,
        element: focused?.tagName,
        accessible: focused === focusableElements[i],
      })
    }

    return navigationResults
  },
}

// 반응형 테스트 헬퍼
export const responsiveHelpers = {
  testMobileLayout: (renderFn: () => HTMLElement) => {
    // 모바일 뷰포트 설정
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    Object.defineProperty(window, 'innerHeight', { value: 667 })
    window.dispatchEvent(new Event('resize'))

    const container = renderFn()

    return {
      isMobileLayout: container.classList.contains('mobile') ||
                     window.getComputedStyle(container).display === 'block',
      chatHeight: container.offsetHeight,
      inputHeight: container.querySelector('.message-input')?.clientHeight || 0,
    }
  },

  testTabletLayout: (renderFn: () => HTMLElement) => {
    // 태블릿 뷰포트 설정
    Object.defineProperty(window, 'innerWidth', { value: 768 })
    Object.defineProperty(window, 'innerHeight', { value: 1024 })
    window.dispatchEvent(new Event('resize'))

    const container = renderFn()

    return {
      isTabletLayout: window.innerWidth >= 768 && window.innerWidth < 1024,
      sidebarVisible: !!container.querySelector('.sidebar'),
      chatWidth: container.offsetWidth,
    }
  },

  testDesktopLayout: (renderFn: () => HTMLElement) => {
    // 데스크톱 뷰포트 설정
    Object.defineProperty(window, 'innerWidth', { value: 1440 })
    Object.defineProperty(window, 'innerHeight', { value: 900 })
    window.dispatchEvent(new Event('resize'))

    const container = renderFn()

    return {
      isDesktopLayout: window.innerWidth >= 1024,
      splitView: !!container.querySelector('.split-view'),
      calendarWidth: container.querySelector('.calendar')?.clientWidth || 0,
      chatWidth: container.querySelector('.chat')?.clientWidth || 0,
    }
  },
}

// 채팅 테스트 래퍼
interface ChatTestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
  initialChatContext?: Partial<typeof mockChatContext>
  mockWebSocket?: any
}

export const ChatTestWrapper: React.FC<ChatTestWrapperProps> = ({
  children,
  queryClient = createChatTestQueryClient(),
  initialChatContext = {},
  mockWebSocket = createMockWebSocket(),
}) => {
  const chatContext = { ...mockChatContext, ...initialChatContext }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div data-testid="chat-test-wrapper" {...chatContext}>
          {children}
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// 커스텀 채팅 render 함수
interface ChatRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  chatContext?: Partial<typeof mockChatContext>
  mockWebSocket?: any
}

export const renderChat = (
  ui: React.ReactElement,
  options: ChatRenderOptions = {}
) => {
  const { queryClient, chatContext, mockWebSocket, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <ChatTestWrapper
        queryClient={queryClient}
        initialChatContext={chatContext}
        mockWebSocket={mockWebSocket}
      >
        {children}
      </ChatTestWrapper>
    ),
    ...renderOptions,
  })
}

// 에러 시뮬레이션
export const errorSimulation = {
  networkError: () => {
    return new Error('Network Error: Failed to fetch')
  },

  serverError: () => {
    return new Error('Server Error: Internal server error')
  },

  authError: () => {
    return new Error('Auth Error: Unauthorized')
  },

  rateLimitError: () => {
    return new Error('Rate Limit: Too many requests')
  },

  connectionTimeout: () => {
    return new Error('Connection Timeout: Request timeout')
  },
}

export * from '@testing-library/react'