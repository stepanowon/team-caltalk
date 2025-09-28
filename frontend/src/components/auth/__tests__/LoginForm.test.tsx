import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '../LoginForm'
import { useAuth } from '@/hooks/use-auth'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// useAuth 훅 모킹
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

const API_BASE_URL = 'http://localhost:3000/api'

describe('LoginForm', () => {
  const mockLogin = vi.fn()
  const mockUseAuth = {
    login: {
      mutate: mockLogin,
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
      isSuccess: false,
      reset: vi.fn(),
    },
    isAuthenticated: false,
    user: null,
    error: null,
  }

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockUseAuth)
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('로그인 폼이 올바르게 렌더링되어야 한다', () => {
      render(<LoginForm />)

      expect(
        screen.getByRole('textbox', { name: /이메일/i })
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /로그인/i })
      ).toBeInTheDocument()
    })

    it('필수 필드가 적절히 표시되어야 한다', () => {
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)

      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('초기 상태에서 제출 버튼이 활성화되어야 한다', () => {
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /로그인/i })
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('폼 검증', () => {
    it('이메일 형식 검증이 작동해야 한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      expect(mockLogin).not.toHaveBeenCalled()

      // HTML5 validation 메시지 또는 커스텀 에러 메시지 확인
      expect(emailInput).toBeInvalid()
    })

    it('필수 필드가 비어있으면 제출이 되지 않아야 한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.click(submitButton)

      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('유효한 데이터로 제출이 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  describe('로딩 상태', () => {
    it('로딩 중일 때 버튼이 비활성화되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isPending: true,
        },
      })

      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /로그인/i })
      expect(submitButton).toBeDisabled()
    })

    it('로딩 중일 때 로딩 인디케이터가 표시되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isPending: true,
        },
      })

      render(<LoginForm />)

      expect(screen.getByText(/로그인 중/i)).toBeInTheDocument()
    })

    it('로딩이 완료되면 정상 상태로 돌아가야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isPending: false,
        },
      })

      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /로그인/i })
      expect(submitButton).not.toBeDisabled()
      expect(screen.queryByText(/로그인 중/i)).not.toBeInTheDocument()
    })
  })

  describe('에러 처리', () => {
    it('로그인 실패 시 에러 메시지가 표시되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isError: true,
          error: new Error('이메일 또는 비밀번호가 올바르지 않습니다.'),
        },
      })

      render(<LoginForm />)

      expect(
        screen.getByText(/이메일 또는 비밀번호가 올바르지 않습니다/i)
      ).toBeInTheDocument()
    })

    it('네트워크 에러 시 적절한 메시지가 표시되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isError: true,
          error: new Error('네트워크 연결을 확인해주세요.'),
        },
      })

      render(<LoginForm />)

      expect(
        screen.getByText(/네트워크 연결을 확인해주세요/i)
      ).toBeInTheDocument()
    })

    it('에러 메시지가 있을 때 재시도가 가능해야 한다', async () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isError: true,
          error: new Error('로그인 실패'),
        },
      })

      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      expect(mockLogin).toHaveBeenCalled()
    })
  })

  describe('성공 처리', () => {
    it('로그인 성공 시 성공 메시지가 표시되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isSuccess: true,
        },
      })

      render(<LoginForm />)

      expect(screen.getByText(/로그인 성공/i)).toBeInTheDocument()
    })

    it('로그인 성공 후 폼이 초기화되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isSuccess: true,
        },
      })

      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)

      expect(emailInput).toHaveValue('')
      expect(passwordInput).toHaveValue('')
    })
  })

  describe('사용자 상호작용', () => {
    it('Enter 키로 폼 제출이 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('비밀번호 표시/숨김 토글이 작동해야 한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const toggleButton = screen.getByRole('button', {
        name: /비밀번호 표시/i,
      })

      expect(passwordInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('폼 필드가 순서대로 탭 이동이 가능해야 한다', async () => {
      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 레이블이 설정되어야 한다', () => {
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)

      expect(emailInput).toHaveAttribute('aria-label')
      expect(passwordInput).toHaveAttribute('aria-label')
    })

    it('에러 상태에서 적절한 ARIA 속성이 설정되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isError: true,
          error: new Error('로그인 실패'),
        },
      })

      render(<LoginForm />)

      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    it('로딩 상태에서 적절한 ARIA 속성이 설정되어야 한다', () => {
      vi.mocked(useAuth).mockReturnValue({
        ...mockUseAuth,
        login: {
          ...mockUseAuth.login,
          isPending: true,
        },
      })

      render(<LoginForm />)

      const submitButton = screen.getByRole('button', { name: /로그인/i })
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('통합 테스트', () => {
    it('실제 API 호출과 함께 전체 로그인 플로우가 작동해야 한다', async () => {
      // 실제 useAuth 구현 사용
      vi.mocked(useAuth).mockRestore()

      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // 로딩 상태 확인
      expect(submitButton).toBeDisabled()

      // 성공 메시지 대기
      await waitFor(
        () => {
          expect(screen.getByText(/로그인 성공/i)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('잘못된 자격증명으로 로그인 실패 플로우가 작동해야 한다', async () => {
      // 실제 useAuth 구현 사용
      vi.mocked(useAuth).mockRestore()

      const user = userEvent.setup()
      render(<LoginForm />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const submitButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // 에러 메시지 대기
      await waitFor(
        () => {
          expect(
            screen.getByText(/이메일 또는 비밀번호가 올바르지 않습니다/i)
          ).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })
  })
})
