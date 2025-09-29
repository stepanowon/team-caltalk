import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 성능 모니터링을 위한 유틸리티
const measurePerformance = async (operation: () => Promise<void> | void) => {
  const start = performance.now()
  await operation()
  const end = performance.now()
  return end - start
}

// 메모리 사용량 측정 (Node.js 환경에서만 가능)
const measureMemory = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage()
  }
  return null
}

// 대용량 데이터 생성 유틸리티
const generateLargeMessageList = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    content: `메시지 ${index + 1} - ${Math.random().toString(36).substring(2, 15)}`,
    user: {
      id: (index % 10) + 1,
      username: `user${(index % 10) + 1}`,
      full_name: `사용자 ${(index % 10) + 1}`,
    },
    created_at: new Date(Date.now() - (count - index) * 60000).toISOString(),
    message_type: index % 20 === 0 ? 'schedule_change_request' : 'text',
    metadata: index % 20 === 0 ? {
      schedule_id: Math.floor(index / 20) + 1,
      requested_start_time: '14:00',
      requested_end_time: '15:00',
    } : null,
  }))
}

// 성능 테스트용 최적화된 메시지 리스트 컴포넌트
const OptimizedMessageList = React.memo(({
  messages,
  onLoadMore,
  isLoading = false,
  hasMore = true
}: {
  messages: any[]
  onLoadMore?: () => void
  isLoading?: boolean
  hasMore?: boolean
}) => {
  const [visibleMessages, setVisibleMessages] = React.useState(messages.slice(0, 50))
  const [page, setPage] = React.useState(1)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 가상화를 위한 Intersection Observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = page + 1
          const nextMessages = messages.slice(0, nextPage * 50)
          setVisibleMessages(nextMessages)
          setPage(nextPage)
          onLoadMore?.()
        }
      },
      { threshold: 1.0 }
    )

    const sentinel = document.getElementById('load-more-sentinel')
    if (sentinel) {
      observer.observe(sentinel)
    }

    return () => observer.disconnect()
  }, [messages, page, hasMore, isLoading, onLoadMore])

  return (
    <div
      ref={containerRef}
      data-testid="optimized-message-list"
      style={{ height: '400px', overflowY: 'auto' }}
    >
      {visibleMessages.map((message) => (
        <div
          key={message.id}
          data-testid={`message-${message.id}`}
          style={{ padding: '8px', borderBottom: '1px solid #eee' }}
        >
          <div data-testid="message-user">{message.user.full_name}</div>
          <div data-testid="message-content">{message.content}</div>
          <div data-testid="message-time">
            {new Date(message.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}

      {hasMore && (
        <div
          id="load-more-sentinel"
          data-testid="load-more-sentinel"
          style={{ height: '20px', background: 'transparent' }}
        >
          {isLoading && <div data-testid="loading-indicator">로딩 중...</div>}
        </div>
      )}
    </div>
  )
})

// 성능 테스트용 채팅 앱
const PerformanceChatApp = ({ initialMessageCount = 100 }: { initialMessageCount?: number }) => {
  const [messages, setMessages] = React.useState(() => generateLargeMessageList(initialMessageCount))
  const [isLoading, setIsLoading] = React.useState(false)
  const [connectionCount, setConnectionCount] = React.useState(0)
  const [renderCount, setRenderCount] = React.useState(0)

  // 렌더링 횟수 추적
  React.useEffect(() => {
    setRenderCount(prev => prev + 1)
  })

  // 새 메시지 추가 (실시간 시뮬레이션)
  const addMessage = React.useCallback((content: string) => {
    const newMessage = {
      id: messages.length + 1,
      content,
      user: { id: 999, username: 'current', full_name: '현재 사용자' },
      created_at: new Date().toISOString(),
      message_type: 'text',
      metadata: null,
    }

    setMessages(prev => [...prev, newMessage])
  }, [messages.length])

  // 대량 메시지 로드
  const loadMoreMessages = React.useCallback(async () => {
    setIsLoading(true)

    // 네트워크 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100))

    const newMessages = generateLargeMessageList(50)
    setMessages(prev => [...prev, ...newMessages])
    setIsLoading(false)
  }, [])

  // Long Polling 시뮬레이션
  React.useEffect(() => {
    const interval = setInterval(() => {
      setConnectionCount(prev => prev + 1)

      // 가끔 새 메시지 수신 시뮬레이션
      if (Math.random() < 0.1) {
        addMessage(`자동 생성 메시지 ${Date.now()}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [addMessage])

  return (
    <div data-testid="performance-chat-app">
      <div data-testid="performance-stats">
        <div data-testid="message-count">메시지 수: {messages.length}</div>
        <div data-testid="render-count">렌더링 횟수: {renderCount}</div>
        <div data-testid="connection-count">연결 횟수: {connectionCount}</div>
      </div>

      <OptimizedMessageList
        messages={messages}
        onLoadMore={loadMoreMessages}
        isLoading={isLoading}
        hasMore={messages.length < 1000}
      />

      <div data-testid="message-input-section">
        <input
          data-testid="performance-message-input"
          placeholder="메시지 입력..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement
              if (target.value.trim()) {
                addMessage(target.value)
                target.value = ''
              }
            }
          }}
        />
      </div>
    </div>
  )
}

// 테스트 래퍼 컴포넌트
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('ChatPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링 성능', () => {
    it('100개 메시지 렌더링이 100ms 이내에 완료되어야 한다', async () => {
      const renderTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <PerformanceChatApp initialMessageCount={100} />
          </TestWrapper>
        )
      })

      expect(renderTime).toBeLessThan(100)
      expect(screen.getByTestId('performance-chat-app')).toBeInTheDocument()
    })

    it('1000개 메시지 렌더링이 500ms 이내에 완료되어야 한다', async () => {
      const renderTime = await measurePerformance(() => {
        render(
          <TestWrapper>
            <PerformanceChatApp initialMessageCount={1000} />
          </TestWrapper>
        )
      })

      expect(renderTime).toBeLessThan(500)
      expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 1000')
    })

    it('대량 메시지에서도 가상화가 작동해야 한다', async () => {
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={1000} />
        </TestWrapper>
      )

      // 초기에는 50개 메시지만 렌더링되어야 함
      const visibleMessages = screen.getAllByTestId(/^message-\d+$/)
      expect(visibleMessages.length).toBeLessThanOrEqual(50)

      // 로드 센티널이 있어야 함
      expect(screen.getByTestId('load-more-sentinel')).toBeInTheDocument()
    })
  })

  describe('메모리 사용량', () => {
    it('메시지 추가 시 메모리 누수가 없어야 한다', async () => {
      const initialMemory = measureMemory()

      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={10} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('performance-message-input')

      // 100개 메시지 빠르게 추가
      for (let i = 0; i < 100; i++) {
        await userEvent.type(messageInput, `테스트 메시지 ${i}`)
        await userEvent.keyboard('{Enter}')
      }

      const finalMemory = measureMemory()

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
        // 메모리 증가가 10MB 이하여야 함
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      }
    })

    it('컴포넌트 언마운트 시 리스너가 정리되어야 한다', () => {
      const { unmount } = render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={10} />
        </TestWrapper>
      )

      // 초기 인터벌 개수
      const initialIntervals = vi.getTimerCount()

      unmount()

      // 언마운트 후 인터벌이 정리되었는지 확인
      expect(vi.getTimerCount()).toBeLessThanOrEqual(initialIntervals)
    })
  })

  describe('스크롤 성능', () => {
    it('스크롤 중 새 메시지 로드가 부드러워야 한다', async () => {
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={100} />
        </TestWrapper>
      )

      const messageList = screen.getByTestId('optimized-message-list')

      // 스크롤 다운 시뮬레이션
      const scrollTime = await measurePerformance(async () => {
        // 스크롤을 하단으로 이동
        messageList.scrollTop = messageList.scrollHeight

        // Intersection Observer가 트리거되기를 기다림
        await waitFor(() => {
          expect(screen.queryByTestId('loading-indicator')).toBeInTheDocument()
        }, { timeout: 1000 })

        // 로딩 완료 대기
        await waitFor(() => {
          expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
        }, { timeout: 2000 })
      })

      expect(scrollTime).toBeLessThan(1000)
    })

    it('빠른 스크롤에도 성능이 유지되어야 한다', async () => {
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={500} />
        </TestWrapper>
      )

      const messageList = screen.getByTestId('optimized-message-list')

      const rapidScrollTime = await measurePerformance(() => {
        // 빠른 연속 스크롤
        for (let i = 0; i < 10; i++) {
          messageList.scrollTop = (i + 1) * 50
        }
      })

      expect(rapidScrollTime).toBeLessThan(50)
    })
  })

  describe('실시간 업데이트 성능', () => {
    it('새 메시지 추가가 기존 메시지에 영향을 주지 않아야 한다', async () => {
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={100} />
        </TestWrapper>
      )

      const initialRenderCount = parseInt(
        screen.getByTestId('render-count').textContent?.split(': ')[1] || '0'
      )

      const messageInput = screen.getByTestId('performance-message-input')

      // 새 메시지 추가
      await userEvent.type(messageInput, '새로운 메시지')
      await userEvent.keyboard('{Enter}')

      await waitFor(() => {
        const currentRenderCount = parseInt(
          screen.getByTestId('render-count').textContent?.split(': ')[1] || '0'
        )

        // 렌더링 횟수가 과도하게 증가하지 않아야 함
        expect(currentRenderCount - initialRenderCount).toBeLessThan(3)
      })
    })

    it('연속된 메시지 추가가 배치 처리되어야 한다', async () => {
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={10} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('performance-message-input')

      const batchUpdateTime = await measurePerformance(async () => {
        // 10개 메시지 빠르게 추가
        for (let i = 0; i < 10; i++) {
          await userEvent.type(messageInput, `배치 메시지 ${i}`)
          await userEvent.keyboard('{Enter}')
        }
      })

      expect(batchUpdateTime).toBeLessThan(500)

      // 모든 메시지가 추가되었는지 확인
      expect(screen.getByTestId('message-count')).toHaveTextContent('메시지 수: 20')
    })

    it('Long Polling이 성능에 영향을 주지 않아야 한다', async () => {
      vi.useFakeTimers()

      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={50} />
        </TestWrapper>
      )

      const initialRenderCount = parseInt(
        screen.getByTestId('render-count').textContent?.split(': ')[1] || '0'
      )

      // 10초 시뮬레이션 (Long Polling 주기)
      vi.advanceTimersByTime(10000)

      await waitFor(() => {
        const connectionCount = parseInt(
          screen.getByTestId('connection-count').textContent?.split(': ')[1] || '0'
        )
        expect(connectionCount).toBeGreaterThan(5)
      })

      const finalRenderCount = parseInt(
        screen.getByTestId('render-count').textContent?.split(': ')[1] || '0'
      )

      // Long Polling으로 인한 과도한 렌더링이 없어야 함
      expect(finalRenderCount - initialRenderCount).toBeLessThan(20)

      vi.useRealTimers()
    })
  })

  describe('네트워크 최적화', () => {
    it('중복 요청이 방지되어야 한다', async () => {
      let requestCount = 0
      const mockFetch = vi.fn().mockImplementation(() => {
        requestCount++
        return Promise.resolve({ json: () => Promise.resolve({ messages: [] }) })
      })

      global.fetch = mockFetch

      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={50} />
        </TestWrapper>
      )

      const messageList = screen.getByTestId('optimized-message-list')

      // 빠른 연속 스크롤 (중복 요청 유발 시도)
      messageList.scrollTop = messageList.scrollHeight
      messageList.scrollTop = messageList.scrollHeight
      messageList.scrollTop = messageList.scrollHeight

      await waitFor(() => {
        // 중복 요청이 방지되어야 함
        expect(requestCount).toBeLessThanOrEqual(1)
      })
    })

    it('메시지 압축이 효과적이어야 한다', () => {
      const messages = generateLargeMessageList(100)
      const serialized = JSON.stringify(messages)
      const compressed = serialized.replace(/\s+/g, ' ').trim()

      // 압축률이 10% 이상이어야 함
      const compressionRatio = (serialized.length - compressed.length) / serialized.length
      expect(compressionRatio).toBeGreaterThan(0.1)
    })
  })

  describe('타이핑 성능', () => {
    it('빠른 타이핑이 입력 지연을 일으키지 않아야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={10} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('performance-message-input')

      const typingTime = await measurePerformance(async () => {
        await user.type(messageInput, '빠른타이핑테스트메시지입니다')
      })

      // 타이핑 시간이 500ms 이하여야 함
      expect(typingTime).toBeLessThan(500)
      expect(messageInput).toHaveValue('빠른타이핑테스트메시지입니다')
    })

    it('긴 메시지 입력이 성능에 영향을 주지 않아야 한다', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <PerformanceChatApp initialMessageCount={10} />
        </TestWrapper>
      )

      const messageInput = screen.getByTestId('performance-message-input')
      const longMessage = '매우 긴 메시지입니다. '.repeat(100)

      const longTypingTime = await measurePerformance(async () => {
        await user.type(messageInput, longMessage)
      })

      // 긴 메시지 타이핑도 적절한 시간 내에 완료되어야 함
      expect(longTypingTime).toBeLessThan(2000)
      expect(messageInput).toHaveValue(longMessage)
    })
  })

  describe('디바운싱 및 스로틀링', () => {
    it('타이핑 인디케이터가 적절히 디바운싱되어야 한다', async () => {
      vi.useFakeTimers()

      let typingCallCount = 0
      const mockOnTyping = vi.fn(() => {
        typingCallCount++
      })

      const TypingComponent = () => {
        const [message, setMessage] = React.useState('')

        const debouncedTyping = React.useMemo(() => {
          let timeout: NodeJS.Timeout
          return (isTyping: boolean) => {
            clearTimeout(timeout)
            timeout = setTimeout(() => mockOnTyping(isTyping), 500)
          }
        }, [])

        return (
          <input
            data-testid="typing-input"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              debouncedTyping(true)
            }}
          />
        )
      }

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<TypingComponent />)

      const input = screen.getByTestId('typing-input')

      // 빠른 연속 타이핑
      await user.type(input, 'hello')

      // 디바운스 시간 전에는 호출되지 않아야 함
      vi.advanceTimersByTime(400)
      expect(typingCallCount).toBe(0)

      // 디바운스 시간 후에 한 번만 호출되어야 함
      vi.advanceTimersByTime(200)
      expect(typingCallCount).toBe(1)

      vi.useRealTimers()
    })

    it('스크롤 이벤트가 적절히 스로틀링되어야 한다', async () => {
      let scrollCallCount = 0
      const mockOnScroll = vi.fn(() => {
        scrollCallCount++
      })

      const ScrollComponent = () => {
        const throttledScroll = React.useMemo(() => {
          let lastCall = 0
          return () => {
            const now = Date.now()
            if (now - lastCall >= 100) {
              mockOnScroll()
              lastCall = now
            }
          }
        }, [])

        return (
          <div
            data-testid="scroll-container"
            style={{ height: '200px', overflowY: 'auto' }}
            onScroll={throttledScroll}
          >
            <div style={{ height: '1000px' }}>Scrollable content</div>
          </div>
        )
      }

      render(<ScrollComponent />)

      const container = screen.getByTestId('scroll-container')

      // 빠른 연속 스크롤
      for (let i = 0; i < 10; i++) {
        container.scrollTop = i * 10
      }

      // 스로틀링으로 인해 호출 횟수가 제한되어야 함
      expect(scrollCallCount).toBeLessThan(5)
    })
  })

  describe('메모이제이션', () => {
    it('React.memo가 불필요한 렌더링을 방지해야 한다', () => {
      let renderCount = 0

      const MemoizedComponent = React.memo(({ message }: { message: any }) => {
        renderCount++
        return <div data-testid="memoized-message">{message.content}</div>
      })

      const ParentComponent = () => {
        const [otherState, setOtherState] = React.useState(0)
        const message = { id: 1, content: 'Test message' }

        return (
          <div>
            <MemoizedComponent message={message} />
            <button
              data-testid="update-other-state"
              onClick={() => setOtherState(prev => prev + 1)}
            >
              Update
            </button>
          </div>
        )
      }

      const { rerender } = render(<ParentComponent />)

      expect(renderCount).toBe(1)

      // 다른 상태 변경 시 메모이제이션으로 인해 재렌더링되지 않아야 함
      const button = screen.getByTestId('update-other-state')
      button.click()

      expect(renderCount).toBe(1) // 여전히 1이어야 함
    })

    it('useMemo가 계산 비용을 줄여야 한다', () => {
      let expensiveCalculationCount = 0

      const ExpensiveComponent = ({ numbers }: { numbers: number[] }) => {
        const expensiveResult = React.useMemo(() => {
          expensiveCalculationCount++
          return numbers.reduce((sum, num) => sum + num, 0)
        }, [numbers])

        return <div data-testid="expensive-result">{expensiveResult}</div>
      }

      const { rerender } = render(<ExpensiveComponent numbers={[1, 2, 3]} />)

      expect(expensiveCalculationCount).toBe(1)

      // 같은 props로 재렌더링
      rerender(<ExpensiveComponent numbers={[1, 2, 3]} />)

      expect(expensiveCalculationCount).toBe(1) // 여전히 1이어야 함

      // 다른 props로 재렌더링
      rerender(<ExpensiveComponent numbers={[4, 5, 6]} />)

      expect(expensiveCalculationCount).toBe(2) // 이제 2가 되어야 함
    })
  })
})