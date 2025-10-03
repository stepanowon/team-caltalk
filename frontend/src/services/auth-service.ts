import { api } from './api'
import { API_ENDPOINTS } from '@/utils/constants'

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  name: string
}

export interface User {
  id: number | string
  username?: string
  email: string
  name: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
      expiresIn: string
    }
  }
  error?: string
  message?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export const AuthService = {
  /**
   * 로그인
   */
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, data)
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      // 네트워크 오류 처리
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        return { success: false, error: '네트워크 오류가 발생했습니다.' }
      }
      throw error
    }
  },

  /**
   * 회원가입
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, data)
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      // 네트워크 오류 처리
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        return { success: false, error: '네트워크 오류가 발생했습니다.' }
      }
      throw error
    }
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<ApiResponse<{}>> {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGOUT)
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 사용자 정보 조회
   */
  async getMe(): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.ME)
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 토큰 갱신
   */
  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH)
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },
}
