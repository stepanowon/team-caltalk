import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from '@/App'
import { useAuthStore } from '@/stores/auth-store'
import { useTeamStore } from '@/stores/team-store'

// 테스트용 QueryClient
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

// 테스트용 App 래퍼
const TestApp = () => {
  const queryClient = createTestQueryClient()

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('인증 플로우 E2E 테스트', () => {
  beforeEach(() => {
    // 스토어 초기화
    useAuthStore.getState().clearAuth()
    useTeamStore.getState().clearTeams()
    useTeamStore.getState().clearCurrentTeam()
    useTeamStore.getState().clearMembers()

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

      // 2. 회원가입 폼 작성
      const emailInput = screen.getByRole('textbox', { name: /이메일/i })
      const passwordInput = screen.getByLabelText(/^비밀번호$/i)
      const confirmPasswordInput = screen.getByLabelText(/비밀번호 확인/i)
      const nameInput = screen.getByRole('textbox', { name: /이름/i })
      const phoneInput = screen.getByRole('textbox', { name: /전화번호/i })
      const registerButton = screen.getByRole('button', { name: /회원가입/i })

      await user.type(emailInput, 'newuser@example.com')
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'password123')
      await user.type(nameInput, '새 사용자')
      await user.type(phoneInput, '010-9999-9999')

      await user.click(registerButton)

      // 3. 회원가입 성공 후 자동 로그인 확인
      await waitFor(() => {
        expect(screen.getByText(/회원가입이 완료되었습니다/i)).toBeInTheDocument()
      }, { timeout: 5000 })

      // 4. 대시보드로 리다이렉트 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /대시보드/i })).toBeInTheDocument()
      }, { timeout: 3000 })

      // 5. 팀 생성
      const createTeamButton = screen.getByRole('button', { name: /팀 생성/i })
      await user.click(createTeamButton)

      // 팀 생성 모달 확인
      expect(screen.getByRole('dialog', { name: /팀 생성/i })).toBeInTheDocument()

      const teamNameInput = screen.getByRole('textbox', { name: /팀 이름/i })
      const teamDescriptionInput = screen.getByRole('textbox', { name: /팀 설명/i })
      const createButton = screen.getByRole('button', { name: /생성/i })

      await user.type(teamNameInput, '새로운 개발팀')
      await user.type(teamDescriptionInput, '새로운 프로젝트를 위한 개발팀입니다')
      await user.click(createButton)

      // 6. 팀 생성 성공 확인
      await waitFor(() => {
        expect(screen.getByText(/팀이 생성되었습니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // 7. 생성된 팀이 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('새로운 개발팀')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 8. 팀 상세 페이지로 이동
      const teamCard = screen.getByText('새로운 개발팀')
      await user.click(teamCard)

      // 9. 팀 상세 정보 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /새로운 개발팀/i })).toBeInTheDocument()
        expect(screen.getByText(/새로운 프로젝트를 위한 개발팀입니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // 10. 초대 코드 확인
      const inviteCode = screen.getByText(/초대 코드:/i).nextSibling?.textContent
      expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/)

      // 11. 로그아웃
      const profileMenu = screen.getByRole('button', { name: /프로필/i })
      await user.click(profileMenu)

      const logoutButton = screen.getByRole('menuitem', { name: /로그아웃/i })
      await user.click(logoutButton)

      // 12. 로그아웃 확인
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /로그인/i })).toBeInTheDocument()
      }, { timeout: 3000 })
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
      }, { timeout: 5000 })

      // 3. 팀 참여 버튼 클릭
      const joinTeamButton = screen.getByRole('button', { name: /팀 참여/i })
      await user.click(joinTeamButton)

      // 4. 팀 참여 모달 확인
      expect(screen.getByRole('dialog', { name: /팀 참여/i })).toBeInTheDocument()

      const inviteCodeInput = screen.getByRole('textbox', { name: /초대 코드/i })
      const joinButton = screen.getByRole('button', { name: /참여/i })

      await user.type(inviteCodeInput, existingInviteCode)
      await user.click(joinButton)

      // 5. 팀 참여 성공 확인
      await waitFor(() => {
        expect(screen.getByText(/팀에 참여했습니다/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // 6. 참여한 팀이 목록에 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('개발팀')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 7. 팀 상세 페이지에서 멤버로 표시되는지 확인
      const teamCard = screen.getByText('개발팀')
      await user.click(teamCard)

      await waitFor(() => {
        expect(screen.getByText(/팀원/i)).toBeInTheDocument()
        expect(screen.getByText('member@example.com')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('에러 상황 처리', () => {
    it('네트워크 오류 시 적절한 에러 메시지를 표시해야 한다', async () => {
      const user = userEvent.setup()

      // 네트워크 오류 시뮬레이션
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network Error'))))

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

      vi.unstubAllGlobals()
    })

    it('잘못된 초대 코드로 팀 참여 시 에러를 처리해야 한다', async () => {
      const user = userEvent.setup()

      // 먼저 로그인
      useAuthStore.getState().setUser({
        id: 2,
        email: 'member@example.com',
        name: '팀원',
        phone: '010-2222-2222',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
      useAuthStore.getState().setToken('mock-jwt-token')

      render(<TestApp />)

      // 팀 참여 시도
      const joinTeamButton = screen.getByRole('button', { name: /팀 참여/i })
      await user.click(joinTeamButton)

      const inviteCodeInput = screen.getByRole('textbox', { name: /초대 코드/i })
      const joinButton = screen.getByRole('button', { name: /참여/i })

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
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
      useAuthStore.getState().setToken('mock-jwt-token')

      render(<TestApp />)

      // 팀 생성 시도
      const createTeamButton = screen.getByRole('button', { name: /팀 생성/i })
      await user.click(createTeamButton)

      const teamNameInput = screen.getByRole('textbox', { name: /팀 이름/i })
      const createButton = screen.getByRole('button', { name: /생성/i })

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
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
      useAuthStore.getState().setToken('mock-jwt-token')

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
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      })
      useAuthStore.getState().setToken('expired-token')

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
      }, { timeout: 5000 })
    })
  })
})