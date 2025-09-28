import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '../use-auth'
import { useAuthStore } from '@/stores/auth-store'
import { AuthService } from '@/services/auth-service'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// AuthService 모킹
vi.mock('@/services/auth-service', () => ({
  AuthService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
  },
}))

const API_BASE_URL = 'http://localhost:3000/api'

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

// 래퍼 컴포넌트
const createWrapper = (queryClient = createTestQueryClient()) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    // 스토어 초기화
    useAuthStore.getState().clearAuth()
    vi.clearAllMocks()
  })

  describe('로그인', () => {
    it('성공적인 로그인이 스토어를 업데이트해야 한다', async () => {
      const mockLoginResponse = {
        success: true,
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            name: '테스트 사용자',
            phone: '010-1234-5678',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          token: 'mock-jwt-token',
        },
      }

      vi.mocked(AuthService.login).mockResolvedValue(mockLoginResponse)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      await act(async () => {
        await result.current.login.mutateAsync(loginData)
      })

      // 스토어 상태 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toEqual(mockLoginResponse.data.user)
      expect(authState.token).toBe(mockLoginResponse.data.token)
      expect(authState.isAuthenticated).toBe(true)

      // 서비스 호출 확인
      expect(AuthService.login).toHaveBeenCalledWith(loginData)
    })

    it('로그인 실패 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      }

      vi.mocked(AuthService.login).mockResolvedValue(mockErrorResponse)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }

      await act(async () => {
        try {
          await result.current.login.mutateAsync(loginData)
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      // 스토어 상태가 변경되지 않았는지 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toBeNull()
      expect(authState.token).toBeNull()
      expect(authState.isAuthenticated).toBe(false)
    })

    it('로딩 상태가 올바르게 관리되어야 한다', async () => {
      const mockLoginResponse = {
        success: true,
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            name: '테스트 사용자',
            phone: '010-1234-5678',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          token: 'mock-jwt-token',
        },
      }

      vi.mocked(AuthService.login).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockLoginResponse), 100)
          )
      )

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      act(() => {
        result.current.login.mutate(loginData)
      })

      // 로딩 상태 확인
      expect(result.current.login.isPending).toBe(true)

      await waitFor(() => {
        expect(result.current.login.isPending).toBe(false)
      })

      expect(result.current.login.isSuccess).toBe(true)
    })
  })

  describe('회원가입', () => {
    it('성공적인 회원가입이 스토어를 업데이트해야 한다', async () => {
      const mockRegisterResponse = {
        success: true,
        data: {
          user: {
            id: 2,
            email: 'new@example.com',
            name: '새 사용자',
            phone: '010-9999-9999',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          token: 'mock-jwt-token-new',
        },
      }

      vi.mocked(AuthService.register).mockResolvedValue(mockRegisterResponse)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        name: '새 사용자',
        phone: '010-9999-9999',
      }

      await act(async () => {
        await result.current.register.mutateAsync(registerData)
      })

      // 스토어 상태 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toEqual(mockRegisterResponse.data.user)
      expect(authState.token).toBe(mockRegisterResponse.data.token)
      expect(authState.isAuthenticated).toBe(true)

      // 서비스 호출 확인
      expect(AuthService.register).toHaveBeenCalledWith(registerData)
    })

    it('이미 존재하는 이메일로 회원가입 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '이미 사용 중인 이메일입니다.',
      }

      vi.mocked(AuthService.register).mockResolvedValue(mockErrorResponse)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        name: '기존 사용자',
        phone: '010-8888-8888',
      }

      await act(async () => {
        try {
          await result.current.register.mutateAsync(registerData)
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      // 스토어 상태가 변경되지 않았는지 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toBeNull()
      expect(authState.token).toBeNull()
      expect(authState.isAuthenticated).toBe(false)
    })
  })

  describe('로그아웃', () => {
    it('로그아웃이 스토어를 초기화해야 한다', async () => {
      const mockLogoutResponse = {
        success: true,
        message: '로그아웃되었습니다.',
      }

      vi.mocked(AuthService.logout).mockResolvedValue(mockLogoutResponse)

      // 먼저 로그인된 상태로 설정
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.logout.mutateAsync()
      })

      // 스토어 상태가 초기화되었는지 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toBeNull()
      expect(authState.token).toBeNull()
      expect(authState.isAuthenticated).toBe(false)

      // 서비스 호출 확인
      expect(AuthService.logout).toHaveBeenCalled()
    })

    it('로그아웃 실패 시에도 스토어를 초기화해야 한다', async () => {
      vi.mocked(AuthService.logout).mockRejectedValue(
        new Error('로그아웃 실패')
      )

      // 먼저 로그인된 상태로 설정
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.logout.mutateAsync()
        } catch (error) {
          // 에러가 발생해도 스토어는 초기화되어야 함
        }
      })

      // 스토어 상태가 초기화되었는지 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toBeNull()
      expect(authState.token).toBeNull()
      expect(authState.isAuthenticated).toBe(false)
    })
  })

  describe('현재 사용자 조회', () => {
    it('토큰으로 현재 사용자 정보를 조회해야 한다', async () => {
      const mockUserResponse = {
        success: true,
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            name: '테스트 사용자',
            phone: '010-1234-5678',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      }

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUserResponse)

      // 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.currentUser.isSuccess).toBe(true)
      })

      expect(result.current.currentUser.data?.user).toEqual(
        mockUserResponse.data.user
      )
      expect(AuthService.getCurrentUser).toHaveBeenCalledWith('mock-jwt-token')
    })

    it('토큰이 없으면 사용자 조회를 하지 않아야 한다', async () => {
      vi.mocked(AuthService.getCurrentUser).mockResolvedValue({
        success: false,
        error: '인증이 필요합니다.',
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      // 토큰이 없으므로 쿼리가 비활성화되어야 함
      expect(result.current.currentUser.isLoading).toBe(false)
      expect(AuthService.getCurrentUser).not.toHaveBeenCalled()
    })

    it('유효하지 않은 토큰 시 에러를 처리해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '유효하지 않은 토큰입니다.',
      }

      vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockErrorResponse)

      // 유효하지 않은 토큰 설정
      useAuthStore.getState().setToken('invalid-token')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.currentUser.isError).toBe(true)
      })

      expect(AuthService.getCurrentUser).toHaveBeenCalledWith('invalid-token')
    })
  })

  describe('토큰 갱신', () => {
    it('토큰을 성공적으로 갱신해야 한다', async () => {
      const mockRefreshResponse = {
        success: true,
        data: {
          token: 'mock-refreshed-jwt-token',
        },
      }

      vi.mocked(AuthService.refreshToken).mockResolvedValue(mockRefreshResponse)

      // 기존 토큰 설정
      useAuthStore.getState().setToken('mock-jwt-token')

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.refreshToken.mutateAsync()
      })

      // 새 토큰이 설정되었는지 확인
      const authState = useAuthStore.getState()
      expect(authState.token).toBe('mock-refreshed-jwt-token')

      // 서비스 호출 확인
      expect(AuthService.refreshToken).toHaveBeenCalledWith('mock-jwt-token')
    })

    it('토큰 갱신 실패 시 로그아웃을 수행해야 한다', async () => {
      const mockErrorResponse = {
        success: false,
        error: '토큰 갱신에 실패했습니다.',
      }

      vi.mocked(AuthService.refreshToken).mockResolvedValue(mockErrorResponse)

      // 기존 토큰과 사용자 정보 설정
      useAuthStore.getState().setToken('mock-jwt-token')
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        try {
          await result.current.refreshToken.mutateAsync()
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      // 인증 정보가 초기화되었는지 확인
      const authState = useAuthStore.getState()
      expect(authState.user).toBeNull()
      expect(authState.token).toBeNull()
      expect(authState.isAuthenticated).toBe(false)
    })
  })

  describe('인증 상태 관리', () => {
    it('스토어의 인증 상태를 올바르게 반영해야 한다', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      // 초기 상태
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()

      // 사용자 로그인 시뮬레이션
      act(() => {
        useAuthStore.getState().setUser({
          id: 1,
          email: 'test@example.com',
          name: '테스트 사용자',
          phone: '010-1234-5678',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        })
        useAuthStore.getState().setToken('mock-jwt-token')
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toBeDefined()
    })

    it('에러 상태를 올바르게 관리해야 한다', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      // 에러 설정
      act(() => {
        useAuthStore.getState().setError('로그인 실패')
      })

      expect(result.current.error).toBe('로그인 실패')

      // 에러 초기화
      act(() => {
        useAuthStore.getState().setError(null)
      })

      expect(result.current.error).toBeNull()
    })
  })
})
