import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { logger } from '@/utils/logger'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
        logger.log('[AuthStore] setAuth called with:', { user, accessToken, refreshToken })

        // localStorage에도 토큰 직접 저장
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken || accessToken)

        set({
          user,
          token: accessToken,
          isAuthenticated: true,
        })

        logger.log('[AuthStore] State after setAuth:', { user, isAuthenticated: true })
      },
      logout: () => {
        // localStorage에서도 토큰 제거
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
