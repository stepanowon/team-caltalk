import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 테스트용 QueryClient 생성
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

// 테스트 래퍼 컴포넌트
interface TestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
  initialEntries?: string[]
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  queryClient = createTestQueryClient(),
  initialEntries = ['/'],
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

// 커스텀 render 함수
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialEntries?: string[]
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, initialEntries, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper queryClient={queryClient} initialEntries={initialEntries}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  })
}

// localStorage 헬퍼
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Zustand 스토어 초기화 헬퍼
export const resetZustandStores = () => {
  // 각 스토어의 초기 상태로 리셋
  localStorage.clear()
}

// 폼 검증 헬퍼
export const getFormValidationMessages = (container: HTMLElement) => {
  const inputs = container.querySelectorAll('input, textarea, select')
  const messages: Record<string, string> = {}

  inputs.forEach((input) => {
    const element = input as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    if (element.validationMessage) {
      const name = element.name || element.id
      messages[name] = element.validationMessage
    }
  })

  return messages
}

// 접근성 테스트 헬퍼
export const getAccessibilityViolations = async (container: HTMLElement) => {
  // axe-core를 사용한 접근성 테스트는 별도 패키지 필요
  // 기본적인 접근성 체크만 수행
  const issues: string[] = []

  // alt 속성이 없는 이미지
  const imagesWithoutAlt = container.querySelectorAll('img:not([alt])')
  if (imagesWithoutAlt.length > 0) {
    issues.push(`${imagesWithoutAlt.length}개의 이미지에 alt 속성이 없습니다.`)
  }

  // label이 없는 input
  const inputsWithoutLabel = container.querySelectorAll(
    'input:not([aria-label]):not([aria-labelledby])'
  )
  Array.from(inputsWithoutLabel).forEach((input) => {
    const inputElement = input as HTMLInputElement
    const associatedLabel = container.querySelector(
      `label[for="${inputElement.id}"]`
    )
    if (!associatedLabel && inputElement.type !== 'hidden') {
      issues.push(`input[type="${inputElement.type}"]에 label이 없습니다.`)
    }
  })

  // 포커스 가능한 요소들의 tabindex 체크
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  Array.from(focusableElements).forEach((element) => {
    const tabindex = element.getAttribute('tabindex')
    if (tabindex && parseInt(tabindex) > 0) {
      issues.push('양수 tabindex는 피해야 합니다.')
    }
  })

  return issues
}

// 반응형 테스트 헬퍼
export const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })

  // matchMedia 업데이트
  const mediaQueries = {
    mobile: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',
  }

  Object.entries(mediaQueries).forEach(([key, query]) => {
    const mq = window.matchMedia(query)
    Object.defineProperty(mq, 'matches', {
      writable: true,
      configurable: true,
      value:
        key === 'mobile'
          ? width < 768
          : key === 'tablet'
            ? width >= 768 && width < 1024
            : width >= 1024,
    })
  })

  // resize 이벤트 발생
  window.dispatchEvent(new Event('resize'))
}

// 사용자 인터랙션 헬퍼
export const userInteractionHelpers = {
  async fillForm(form: HTMLFormElement, data: Record<string, string>) {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    for (const [name, value] of Object.entries(data)) {
      const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement
      if (field) {
        await user.clear(field)
        await user.type(field, value)
      }
    }
  },

  async submitForm(form: HTMLFormElement) {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()

    const submitButton = form.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement
    if (submitButton) {
      await user.click(submitButton)
    }
  },
}

// re-export everything
export * from '@testing-library/react'
export { customRender as render }
