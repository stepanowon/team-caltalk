import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  generateTestData,
  performanceTestHelpers,
} from '../utils/realtime-test-helpers'

// 성능 측정을 위한 가상화된 스크롤 컴포넌트 모킹
const createVirtualScrollContainer = () => {
  const container = document.createElement('div')
  container.style.height = '400px'
  container.style.overflowY = 'auto'
  container.setAttribute('data-testid', 'virtual-scroll-container')

  let visibleStartIndex = 0
  let visibleEndIndex = 0
  const itemHeight = 60 // 메시지 아이템 높이
  const containerHeight = 400
  const visibleItemCount = Math.ceil(containerHeight / itemHeight)

  const state = {
    items: [] as any[],
    scrollTop: 0,
    totalHeight: 0,
    visibleItems: [] as any[],
    isScrolling: false,
  }

  const updateVisibleRange = () => {
    visibleStartIndex = Math.floor(state.scrollTop / itemHeight)
    visibleEndIndex = Math.min(
      visibleStartIndex + visibleItemCount + 1,
      state.items.length
    )

    state.visibleItems = state.items.slice(visibleStartIndex, visibleEndIndex)
    state.totalHeight = state.items.length * itemHeight
  }

  const scrollTo = (scrollTop: number) => {
    state.scrollTop = Math.max(
      0,
      Math.min(scrollTop, state.totalHeight - containerHeight)
    )
    container.scrollTop = state.scrollTop
    updateVisibleRange()
  }

  const addItems = (newItems: any[]) => {
    const startTime = performance.now()
    state.items = [...state.items, ...newItems]
    updateVisibleRange()
    const endTime = performance.now()
    return endTime - startTime
  }

  const scrollToBottom = () => {
    const maxScrollTop = state.totalHeight - containerHeight
    scrollTo(maxScrollTop)
  }

  const getMetrics = () => ({
    totalItems: state.items.length,
    visibleItems: state.visibleItems.length,
    scrollTop: state.scrollTop,
    totalHeight: state.totalHeight,
    visibleStartIndex,
    visibleEndIndex,
    memoryUsage: state.items.length * 500, // 대략적인 메모리 사용량 (바이트)
  })

  return {
    container,
    addItems,
    scrollTo,
    scrollToBottom,
    getMetrics,
    state,
  }
}

// 스크롤 성능 테스트를 위한 훅
const useVirtualScroll = (
  itemHeight: number = 60,
  containerHeight: number = 400
) => {
  const [state, setState] = React.useState({
    items: [] as any[],
    scrollTop: 0,
    visibleStartIndex: 0,
    visibleEndIndex: 0,
    isScrolling: false,
  })

  const visibleItemCount = Math.ceil(containerHeight / itemHeight)

  const updateVisibleRange = React.useCallback(
    (scrollTop: number) => {
      const visibleStartIndex = Math.floor(scrollTop / itemHeight)
      const visibleEndIndex = Math.min(
        visibleStartIndex + visibleItemCount + 1,
        state.items.length
      )

      setState((prev) => ({
        ...prev,
        scrollTop,
        visibleStartIndex,
        visibleEndIndex,
      }))
    },
    [itemHeight, visibleItemCount, state.items.length]
  )

  const addItems = React.useCallback((newItems: any[]) => {
    setState((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }))
  }, [])

  const scrollToBottom = React.useCallback(() => {
    const totalHeight = state.items.length * itemHeight
    const maxScrollTop = totalHeight - containerHeight
    updateVisibleRange(maxScrollTop)
  }, [state.items.length, itemHeight, containerHeight, updateVisibleRange])

  const visibleItems = React.useMemo(() => {
    return state.items.slice(state.visibleStartIndex, state.visibleEndIndex)
  }, [state.items, state.visibleStartIndex, state.visibleEndIndex])

  return {
    ...state,
    visibleItems,
    addItems,
    updateVisibleRange,
    scrollToBottom,
    totalHeight: state.items.length * itemHeight,
  }
}

import React from 'react'

describe('Message Scrolling Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 성능 측정을 위한 브라우저 API 모킹
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: (callback: Function) => setTimeout(callback, 16), // 60fps 시뮬레이션
      writable: true,
    })

    Object.defineProperty(window, 'cancelAnimationFrame', {
      value: (id: number) => clearTimeout(id),
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('가상화 스크롤 성능', () => {
    it('1000개 메시지 렌더링 성능이 적절해야 한다', () => {
      const virtualScroll = createVirtualScrollContainer()
      const messages = generateTestData.messages(1000)

      const startTime = performance.now()
      const addTime = virtualScroll.addItems(messages)
      const endTime = performance.now()

      const totalTime = endTime - startTime
      const metrics = virtualScroll.getMetrics()

      // 성능 기준 검증
      expect(addTime).toBeLessThan(100) // 100ms 이하로 아이템 추가
      expect(totalTime).toBeLessThan(200) // 전체 처리 시간 200ms 이하
      expect(metrics.visibleItems).toBeLessThanOrEqual(8) // 화면에 보이는 아이템은 8개 이하
      expect(metrics.totalItems).toBe(1000) // 전체 아이템은 1000개
    })

    it('대량 스크롤 시 성능이 유지되어야 한다', () => {
      const virtualScroll = createVirtualScrollContainer()
      const messages = generateTestData.messages(2000)

      virtualScroll.addItems(messages)

      // 스크롤 성능 측정
      const scrollSteps = 50
      const scrollDistance =
        virtualScroll.getMetrics().totalHeight / scrollSteps
      let totalScrollTime = 0

      for (let i = 0; i < scrollSteps; i++) {
        const startTime = performance.now()
        virtualScroll.scrollTo(i * scrollDistance)
        const endTime = performance.now()

        totalScrollTime += endTime - startTime
      }

      const averageScrollTime = totalScrollTime / scrollSteps

      // 평균 스크롤 시간이 16ms(60fps) 이하여야 함
      expect(averageScrollTime).toBeLessThan(16)
      expect(totalScrollTime).toBeLessThan(800) // 전체 스크롤 시간 800ms 이하
    })

    it('실시간 메시지 추가 시 스크롤 성능이 유지되어야 한다', () => {
      const virtualScroll = createVirtualScrollContainer()

      // 초기 메시지 1000개 로드
      const initialMessages = generateTestData.messages(1000)
      virtualScroll.addItems(initialMessages)

      // 하단으로 스크롤
      virtualScroll.scrollToBottom()

      // 실시간 메시지 추가 시뮬레이션 (10개씩 5번)
      const addTimes: number[] = []

      for (let i = 0; i < 5; i++) {
        const newMessages = generateTestData.messages(
          10,
          'team-1',
          '2024-12-25'
        )
        const addTime = virtualScroll.addItems(newMessages)
        addTimes.push(addTime)

        // 자동 스크롤
        const scrollStartTime = performance.now()
        virtualScroll.scrollToBottom()
        const scrollTime = performance.now() - scrollStartTime

        expect(scrollTime).toBeLessThan(10) // 자동 스크롤 시간 10ms 이하
      }

      // 메시지 추가 시간이 일정하게 유지되는지 확인
      const maxAddTime = Math.max(...addTimes)
      const minAddTime = Math.min(...addTimes)
      const addTimeVariance = maxAddTime - minAddTime

      expect(maxAddTime).toBeLessThan(50) // 최대 추가 시간 50ms 이하
      expect(addTimeVariance).toBeLessThan(30) // 시간 편차 30ms 이하
    })
  })

  describe('메모리 사용량 최적화', () => {
    it('대량 메시지 로드 시 메모리 사용량이 적절해야 한다', () => {
      const virtualScroll = createVirtualScrollContainer()

      // 10,000개 메시지로 메모리 테스트
      const largeMessageSet = generateTestData.messages(10000)
      virtualScroll.addItems(largeMessageSet)

      const metrics = virtualScroll.getMetrics()

      // 메모리 사용량 검증 (실제로는 더 정확한 메모리 측정 필요)
      const estimatedMemoryUsage = metrics.memoryUsage / (1024 * 1024) // MB 단위

      expect(estimatedMemoryUsage).toBeLessThan(50) // 50MB 이하
      expect(metrics.visibleItems).toBeLessThanOrEqual(10) // 화면에 렌더링되는 아이템 제한
    })

    it('메시지 제거 시 메모리가 정리되어야 한다', () => {
      const virtualScroll = createVirtualScrollContainer()

      // 메시지 추가
      const messages = generateTestData.messages(1000)
      virtualScroll.addItems(messages)

      const initialMetrics = virtualScroll.getMetrics()
      expect(initialMetrics.totalItems).toBe(1000)

      // 오래된 메시지 제거 시뮬레이션 (실제 구현에서는 가비지 컬렉션)
      virtualScroll.state.items = virtualScroll.state.items.slice(500) // 앞쪽 500개 제거

      const finalMetrics = virtualScroll.getMetrics()
      expect(finalMetrics.totalItems).toBe(500)
      expect(finalMetrics.memoryUsage).toBeLessThan(initialMetrics.memoryUsage)
    })
  })

  describe('React 훅 성능', () => {
    it('useVirtualScroll 훅의 성능이 적절해야 한다', () => {
      const { result } = renderHook(() => useVirtualScroll(60, 400))

      // 대량 아이템 추가
      const messages = generateTestData.messages(2000)

      const startTime = performance.now()

      act(() => {
        result.current.addItems(messages)
      })

      const endTime = performance.now()
      const addTime = endTime - startTime

      expect(addTime).toBeLessThan(200) // 200ms 이하로 처리
      expect(result.current.items.length).toBe(2000)
      expect(result.current.visibleItems.length).toBeLessThanOrEqual(8)
    })

    it('스크롤 업데이트 시 리렌더링 최적화가 적절해야 한다', () => {
      const renderCount = { value: 0 }

      const { result } = renderHook(() => {
        renderCount.value++
        return useVirtualScroll(60, 400)
      })

      // 초기 아이템 추가
      act(() => {
        result.current.addItems(generateTestData.messages(100))
      })

      const initialRenderCount = renderCount.value

      // 스크롤 위치 변경을 여러 번 수행
      const scrollUpdates = 10

      for (let i = 0; i < scrollUpdates; i++) {
        act(() => {
          result.current.updateVisibleRange(i * 60)
        })
      }

      const finalRenderCount = renderCount.value
      const additionalRenders = finalRenderCount - initialRenderCount

      // 스크롤 업데이트당 리렌더링이 최소화되어야 함
      expect(additionalRenders).toBeLessThanOrEqual(scrollUpdates + 2)
    })
  })

  describe('애니메이션 성능', () => {
    it('스무스 스크롤 애니메이션 성능이 적절해야 한다', async () => {
      const virtualScroll = createVirtualScrollContainer()
      virtualScroll.addItems(generateTestData.messages(1000))

      const animationFrames: number[] = []
      const originalRaf = window.requestAnimationFrame

      // 애니메이션 프레임 측정
      window.requestAnimationFrame = (callback: Function) => {
        const frameTime = performance.now()
        animationFrames.push(frameTime)
        return originalRaf(callback)
      }

      // 스무스 스크롤 시뮬레이션
      const smoothScrollToPosition = async (targetPosition: number) => {
        const startPosition = virtualScroll.state.scrollTop
        const distance = targetPosition - startPosition
        const duration = 300 // 300ms 애니메이션
        const startTime = performance.now()

        return new Promise<void>((resolve) => {
          const animate = () => {
            const elapsed = performance.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // easeInOutCubic 함수
            const easeProgress =
              progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2

            const currentPosition = startPosition + distance * easeProgress
            virtualScroll.scrollTo(currentPosition)

            if (progress < 1) {
              requestAnimationFrame(animate)
            } else {
              resolve()
            }
          }

          requestAnimationFrame(animate)
        })
      }

      // 여러 위치로 스무스 스크롤 테스트
      await smoothScrollToPosition(1000)
      await smoothScrollToPosition(5000)
      await smoothScrollToPosition(0)

      // 프레임 레이트 계산
      if (animationFrames.length > 1) {
        const totalTime =
          animationFrames[animationFrames.length - 1] - animationFrames[0]
        const fps = (animationFrames.length - 1) / (totalTime / 1000)

        expect(fps).toBeGreaterThan(30) // 최소 30fps
        expect(fps).toBeLessThan(70) // 최대 70fps (너무 높으면 비효율적)
      }

      window.requestAnimationFrame = originalRaf
    })

    it('스크롤 관성(inertia) 시뮬레이션 성능', () => {
      const virtualScroll = createVirtualScrollContainer()
      virtualScroll.addItems(generateTestData.messages(2000))

      // 스크롤 관성 시뮬레이션
      let velocity = 1000 // 초기 속도 (픽셀/초)
      const friction = 0.95 // 마찰 계수
      const minVelocity = 10 // 최소 속도

      const simulateInertia = () => {
        const frameTimings: number[] = []
        let currentPosition = 0

        while (Math.abs(velocity) > minVelocity) {
          const frameStart = performance.now()

          currentPosition += velocity / 60 // 60fps 기준
          velocity *= friction

          virtualScroll.scrollTo(currentPosition)

          const frameEnd = performance.now()
          frameTimings.push(frameEnd - frameStart)
        }

        return frameTimings
      }

      const frameTimings = simulateInertia()
      const averageFrameTime =
        frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length
      const maxFrameTime = Math.max(...frameTimings)

      expect(averageFrameTime).toBeLessThan(16) // 평균 프레임 시간 16ms 이하
      expect(maxFrameTime).toBeLessThan(32) // 최대 프레임 시간 32ms 이하
      expect(frameTimings.length).toBeGreaterThan(10) // 충분한 프레임 수
    })
  })

  describe('터치/제스처 성능', () => {
    it('터치 스크롤 이벤트 처리 성능', () => {
      const virtualScroll = createVirtualScrollContainer()
      virtualScroll.addItems(generateTestData.messages(1500))

      const touchEventTimes: number[] = []

      // 터치 이벤트 시뮬레이션
      const simulateTouchScroll = () => {
        const touchEvents = 20 // 터치 스크롤 중 발생하는 이벤트 수
        let currentY = 0

        for (let i = 0; i < touchEvents; i++) {
          const eventStart = performance.now()

          currentY += 30 // 각 이벤트마다 30px씩 스크롤
          virtualScroll.scrollTo(currentY)

          const eventEnd = performance.now()
          touchEventTimes.push(eventEnd - eventStart)
        }
      }

      simulateTouchScroll()

      const averageEventTime =
        touchEventTimes.reduce((a, b) => a + b, 0) / touchEventTimes.length
      const maxEventTime = Math.max(...touchEventTimes)

      expect(averageEventTime).toBeLessThan(8) // 평균 이벤트 처리 시간 8ms 이하
      expect(maxEventTime).toBeLessThan(16) // 최대 이벤트 처리 시간 16ms 이하
    })

    it('스크롤 디바운싱 성능', () => {
      const virtualScroll = createVirtualScrollContainer()
      virtualScroll.addItems(generateTestData.messages(1000))

      let updateCount = 0
      const updates: number[] = []

      // 스크롤 이벤트 디바운싱 시뮬레이션
      const debouncedUpdate = (() => {
        let timeoutId: NodeJS.Timeout | null = null

        return () => {
          if (timeoutId) clearTimeout(timeoutId)

          timeoutId = setTimeout(() => {
            updateCount++
            updates.push(performance.now())
          }, 16) // 16ms 디바운스
        }
      })()

      // 빠른 스크롤 이벤트 시뮬레이션 (100개 이벤트)
      const startTime = performance.now()

      for (let i = 0; i < 100; i++) {
        virtualScroll.scrollTo(i * 10)
        debouncedUpdate()
      }

      // 디바운스 완료 대기
      setTimeout(() => {
        const endTime = performance.now()
        const totalTime = endTime - startTime

        // 100개 이벤트가 디바운싱으로 인해 훨씬 적은 업데이트로 처리되어야 함
        expect(updateCount).toBeLessThan(10)
        expect(totalTime).toBeLessThan(200)
      }, 50)
    })
  })

  describe('성능 회귀 테스트', () => {
    it('메시지 추가 성능이 선형적으로 증가해야 한다', () => {
      const virtualScroll = createVirtualScrollContainer()
      const measurements: { count: number; time: number }[] = []

      // 다양한 크기의 메시지 세트로 성능 측정
      const testSizes = [100, 500, 1000, 2000, 5000]

      testSizes.forEach((size) => {
        const messages = generateTestData.messages(size)

        const startTime = performance.now()
        virtualScroll.addItems(messages)
        const endTime = performance.now()

        measurements.push({
          count: size,
          time: endTime - startTime,
        })

        // 다음 테스트를 위해 초기화
        virtualScroll.state.items = []
      })

      // 성능이 대략 선형적으로 증가하는지 확인
      for (let i = 1; i < measurements.length; i++) {
        const prev = measurements[i - 1]
        const curr = measurements[i]

        const sizeRatio = curr.count / prev.count
        const timeRatio = curr.time / prev.time

        // 시간 증가율이 크기 증가율의 2배를 넘지 않아야 함 (O(n) 복잡도 유지)
        expect(timeRatio).toBeLessThan(sizeRatio * 2)
      }
    })

    it('스크롤 성능이 메시지 수에 무관하게 일정해야 한다', () => {
      const scrollTimes: number[] = []
      const messageCounts = [100, 1000, 5000, 10000]

      messageCounts.forEach((count) => {
        const virtualScroll = createVirtualScrollContainer()
        virtualScroll.addItems(generateTestData.messages(count))

        // 중간 지점으로 스크롤 성능 측정
        const scrollTarget = virtualScroll.getMetrics().totalHeight / 2

        const startTime = performance.now()
        virtualScroll.scrollTo(scrollTarget)
        const endTime = performance.now()

        scrollTimes.push(endTime - startTime)
      })

      // 모든 스크롤 시간이 비슷해야 함 (가상화로 인해 O(1) 복잡도)
      const maxScrollTime = Math.max(...scrollTimes)
      const minScrollTime = Math.min(...scrollTimes)
      const variance = maxScrollTime - minScrollTime

      expect(variance).toBeLessThan(10) // 최대 10ms 차이
      expect(maxScrollTime).toBeLessThan(20) // 모든 스크롤이 20ms 이하
    })
  })
})
