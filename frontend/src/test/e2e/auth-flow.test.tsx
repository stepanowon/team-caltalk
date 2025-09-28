import React from 'react'
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import App from '@/App'
import { useAuthStore } from '@/stores/authStore'
import { handlers } from '@/test/mocks/handlers'

// MSW 서버 설정
const server = setupServer(...handlers)

// 테스트용 App 래퍼 (App이 이미 Router와 QueryClient를 포함하므로 직접 사용)
const TestApp = () => {
  return <App />
}

describe('인증 플로우 E2E 테스트', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    // 스토어 초기화
    useAuthStore.getState().logout()

    // localStorage 초기화
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('회원가입 → 로그인 → 팀 생성 → 팀 참여 플로우', () => {
    it('전체 사용자 플로우가 정상적으로 작동해야 한다', async () => {
      const user = userEvent.setup()

      render(<TestApp />)

      // 1. 회원가입 페이지로 이동
      const registerLink = screen.getByRole('link', { name: /회원가입/i })
      await user.click(registerLink)

      expect(screen.getByRole('heading', { name: /회원가입/i })).toBeInTheDocument()

      // 2. 회원가입 폼 작성 (실제 필드명에 맞게 수정)
      const usernameInput = screen.getByRole('textbox', { name: /사용자명/i })
      const fullNameInput = screen.getByRole('textbox', { name: /전체 이름/i })
      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/^비밀번호$/i)
      const confirmPasswordInput = screen.getByLabelText(/비밀번호 확인/i)
      const registerButton = screen.getByRole('button', { name: /회원가입/i })

      await user.type(usernameInput, 'newuser')
      await user.type(fullNameInput, '새 사용자')
      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')

      await user.click(registerButton)

      // 3. 회원가입 성공 후 로그인 페이지로 이동 (현재 구현에 맞게 수정)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /로그인/i })).toBeInTheDocument()
      }, { timeout: 5000 })

      // 4. 로그인 진행
      const loginEmailInput = screen.getByRole('textbox', { name: /이메일/i })
      const loginPasswordInput = screen.getByLabelText(/비밀번호/i)
      const loginButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(loginEmailInput, 'newuser@example.com')
      await user.type(loginPasswordInput, 'password123')
      await user.click(loginButton)

      // 5. 대시보드로 리다이렉트 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /대시보드/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      // 6. 팀 생성 버튼 확인 및 클릭
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /팀 생성/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      const createTeamButton = screen.getByRole('button', { name: /팀 생성/i })
      await user.click(createTeamButton)

      // 팀 생성 모달 확인
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /팀 생성/i })).toBeInTheDocument()
      }, { timeout: 1000 })

      const teamNameInput = screen.getByRole('textbox', { name: /팀 이름/i })
      const teamDescriptionInput = screen.getByRole('textbox', { name: /팀 설명/i })
      const createButton = screen.getByRole('button', { name: /^생성$/i })

      await user.type(teamNameInput, '새로운 개발팀')
      await user.type(teamDescriptionInput, '새로운 프로젝트를 위한 개발팀입니다')
      await user.click(createButton)

      // 7. 팀 생성 성공 확인
      await waitFor(() => {
        expect(screen.getByText(/팀이 생성되었습니다/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // 8. 생성된 팀이 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('새로운 개발팀')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 9. 기본 테스트 완료 - 로그아웃은 현재 UI에 구현되지 않음
      // TODO: 추후 네비게이션 바에 프로필 메뉴 구현 후 테스트 추가
    })

    it('다른 사용자로 팀 참여 플로우가 작동해야 한다', async () => {
      const user = userEvent.setup()

      // 기존 팀과 초대 코드 설정 (이전 테스트에서 생성된 데이터 시뮬레이션)
      const existingInviteCode = 'DEV001'

      render(<TestApp />)

      // 1. 로그인 페이지에서 다른 사용자로 로그인
      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const loginButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'member@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      // 2. 대시보드로 이동 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /대시보드/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      // 3. 팀 참여 버튼 확인 및 클릭
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /팀 참여/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      const joinTeamButton = screen.getByRole('button', { name: /팀 참여/i })
      await user.click(joinTeamButton)

      // 4. 팀 참여 모달 확인
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /팀 참여/i })).toBeInTheDocument()
      }, { timeout: 1000 })

      const inviteCodeInput = screen.getByRole('textbox', { name: /초대 코드/i })
      const joinButton = screen.getByRole('button', { name: /^참여$/i })

      await user.type(inviteCodeInput, existingInviteCode)
      await user.click(joinButton)

      // 5. 팀 참여 성공 확인 (타임아웃 증가)
      await waitFor(() => {
        expect(screen.getByText(/팀에 참여했습니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // 6. 참여한 팀이 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText(/개발팀/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('에러 상황 처리', () => {
    it('네트워크 오류 시 적절한 에러 메시지를 표시해야 한다', async () => {
      const user = userEvent.setup()

      // 네트워크 오류 시뮬레이션을 위한 핸들러 오버라이드
      server.use(
        http.post('http://localhost:3000/api/auth/login', () => {
          return HttpResponse.error()
        })
      )

      render(<TestApp />)

      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const loginButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      // 네트워크 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/네트워크 오류가 발생했습니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('잘못된 초대 코드로 팀 참여 시 에러를 처리해야 한다', async () => {
      const user = userEvent.setup()

      // 먼저 로그인
      useAuthStore.getState().setAuth({
        id: 2,
        username: 'member',
        email: 'member@example.com',
        full_name: '팀원',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }, 'mock-jwt-token-member')

      render(<TestApp />)

      // 팀 참여 모달 열기
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /팀 참여/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      const joinTeamButton = screen.getByRole('button', { name: /팀 참여/i })
      await user.click(joinTeamButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /팀 참여/i })).toBeInTheDocument()
      }, { timeout: 1000 })

      const inviteCodeInput = screen.getByRole('textbox', { name: /초대 코드/i })
      const joinButton = screen.getByRole('button', { name: /^참여$/i })

      await user.type(inviteCodeInput, 'INVALID')
      await user.click(joinButton)

      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/유효하지 않은 초대 코드입니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('중복된 팀명으로 팀 생성 시 에러를 처리해야 한다', async () => {
      const user = userEvent.setup()

      // 먼저 로그인
      useAuthStore.getState().setAuth({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: '테스트 사용자',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }, 'mock-jwt-token')

      render(<TestApp />)

      // 팀 생성 모달 열기
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /팀 생성/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      const createTeamButton = screen.getByRole('button', { name: /팀 생성/i })
      await user.click(createTeamButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /팀 생성/i })).toBeInTheDocument()
      }, { timeout: 1000 })

      const teamNameInput = screen.getByRole('textbox', { name: /팀 이름/i })
      const createButton = screen.getByRole('button', { name: /^생성$/i })

      await user.type(teamNameInput, '개발팀') // 이미 존재하는 팀명
      await user.click(createButton)

      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/이미 존재하는 팀명입니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('상태 지속성', () => {
    it('페이지 새로고침 후에도 로그인 상태가 유지되어야 한다', async () => {
      // 로그인 상태 설정
      useAuthStore.getState().setAuth({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: '테스트 사용자',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }, 'mock-jwt-token')

      // localStorage에 토큰 저장
      localStorage.setItem('auth_token', 'mock-jwt-token')

      render(<TestApp />)

      // 로그인된 상태 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /대시보드/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      // 페이지 재렌더링 (새로고침 시뮬레이션)
      const { rerender } = render(<TestApp />)
      rerender(<TestApp />)

      // 여전히 로그인된 상태인지 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /대시보드/i })).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('토큰이 만료되면 자동으로 로그아웃되어야 한다', async () => {
      // 만료된 토큰으로 설정
      useAuthStore.getState().setAuth({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: '테스트 사용자',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }, 'expired-token')

      render(<TestApp />)

      // 토큰 검증 실패로 인한 자동 로그아웃 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /로그인/i })).toBeInTheDocument()
      }, { timeout: 5000 })

      // 스토어 상태가 초기화되었는지 확인
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().token).toBeNull()
    })
  })

  describe('반응형 동작', () => {
    it('모바일 화면에서도 정상적으로 작동해야 한다', async () => {
      // 모바일 뷰포트 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      window.dispatchEvent(new Event('resize'))

      const user = userEvent.setup()
      render(<TestApp />)

      // 모바일에서 로그인 폼 확인
      expect(screen.getByRole('textbox', { name: /이메일/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument()

      // 로그인 진행
      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      const loginButton = screen.getByRole('button', { name: /로그인/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      // 모바일에서 대시보드 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /대시보드/i })).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})