import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../auth-store'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('AuthStore', () => {
  beforeEach(() => {
    // 스토어 초기화
    useAuthStore.getState().clearAuth()
    vi.clearAllMocks()
  })

  describe('초기 상태', () => {
    it('초기 상태가 올바르게 설정되어야 한다', () => {
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setUser', () => {
    it('사용자 정보를 설정해야 한다', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      useAuthStore.getState().setUser(user)
      const state = useAuthStore.getState()

      expect(state.user).toEqual(user)
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('setToken', () => {
    it('토큰을 설정하고 localStorage에 저장해야 한다', () => {
      const token = 'test-token'

      useAuthStore.getState().setToken(token)
      const state = useAuthStore.getState()

      expect(state.token).toBe(token)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', token)
    })

    it('null 토큰 설정 시 localStorage에서 제거해야 한다', () => {
      useAuthStore.getState().setToken(null)
      const state = useAuthStore.getState()

      expect(state.token).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })
  })

  describe('setLoading', () => {
    it('로딩 상태를 설정해야 한다', () => {
      useAuthStore.getState().setLoading(true)
      let state = useAuthStore.getState()
      expect(state.isLoading).toBe(true)

      useAuthStore.getState().setLoading(false)
      state = useAuthStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setError', () => {
    it('에러 메시지를 설정해야 한다', () => {
      const errorMessage = '로그인 실패'

      useAuthStore.getState().setError(errorMessage)
      const state = useAuthStore.getState()

      expect(state.error).toBe(errorMessage)
    })

    it('null 에러 설정 시 에러를 초기화해야 한다', () => {
      useAuthStore.getState().setError('에러')
      useAuthStore.getState().setError(null)
      const state = useAuthStore.getState()

      expect(state.error).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('인증 정보를 모두 초기화해야 한다', () => {
      // 먼저 데이터 설정
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
      useAuthStore.getState().setToken('test-token')
      useAuthStore.getState().setError('에러')

      // 초기화
      useAuthStore.getState().clearAuth()
      const state = useAuthStore.getState()

      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })
  })

  describe('localStorage 동기화', () => {
    it('localStorage에서 토큰을 로드해야 한다', () => {
      const token = 'stored-token'
      mockLocalStorage.getItem.mockReturnValue(token)

      // 스토어 재초기화 시뮬레이션
      useAuthStore.getState().initializeAuth()
      const state = useAuthStore.getState()

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token')
      expect(state.token).toBe(token)
    })

    it('localStorage에 토큰이 없으면 null을 유지해야 한다', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      useAuthStore.getState().initializeAuth()
      const state = useAuthStore.getState()

      expect(state.token).toBeNull()
    })
  })

  describe('computed 값', () => {
    it('사용자가 있으면 isAuthenticated가 true여야 한다', () => {
      useAuthStore.getState().setUser({
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
    })

    it('사용자가 없으면 isAuthenticated가 false여야 한다', () => {
      useAuthStore.getState().setUser(null)

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('동시성 테스트', () => {
    it('여러 액션이 동시에 실행되어도 일관성을 유지해야 한다', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        name: '테스트 사용자',
        phone: '010-1234-5678',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      // 동시에 여러 액션 실행
      useAuthStore.getState().setUser(user)
      useAuthStore.getState().setToken('token')
      useAuthStore.getState().setLoading(true)
      useAuthStore.getState().setError('error')

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.token).toBe('token')
      expect(state.isLoading).toBe(true)
      expect(state.error).toBe('error')
    })
  })
})
