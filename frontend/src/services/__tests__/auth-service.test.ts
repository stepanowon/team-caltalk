import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../auth-service'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('성공적인 로그인이 사용자 정보와 토큰을 반환해야 한다', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = await AuthService.login(loginData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        user: {
          id: 1,
          email: 'test@example.com',
          name: '테스트 사용자',
          phone: '010-1234-5678',
        },
        token: 'mock-jwt-token',
      })
    })

    it('잘못된 자격증명으로 로그인 실패해야 한다', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }

      const result = await AuthService.login(loginData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다.')
    })

    it('네트워크 오류 시 에러를 던져야 한다', async () => {
      // 네트워크 오류 핸들러 설정
      server.use(
        http.post(`${API_BASE_URL}/auth/login`, () => {
          return HttpResponse.error()
        })
      )

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      await expect(AuthService.login(loginData)).rejects.toThrow()
    })

    it('서버 오류 시 에러 응답을 반환해야 한다', async () => {
      // 서버 오류 핸들러 설정
      server.use(
        http.post(`${API_BASE_URL}/auth/login`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '서버 내부 오류',
            },
            { status: 500 }
          )
        })
      )

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      await expect(AuthService.login(loginData)).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('성공적인 회원가입이 사용자 정보와 토큰을 반환해야 한다', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        name: '새 사용자',
        phone: '010-9999-9999',
      }

      const result = await AuthService.register(registerData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        user: {
          email: 'new@example.com',
          name: '새 사용자',
          phone: '010-9999-9999',
        },
        token: 'mock-jwt-token-new',
      })
    })

    it('이미 존재하는 이메일로 회원가입 실패해야 한다', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        name: '기존 사용자',
        phone: '010-8888-8888',
      }

      const result = await AuthService.register(registerData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('이미 사용 중인 이메일입니다.')
    })

    it('유효하지 않은 데이터로 회원가입 시 에러를 던져야 한다', async () => {
      const registerData = {
        email: '', // 빈 이메일
        password: 'password123',
        name: '사용자',
        phone: '010-1234-5678',
      }

      // 클라이언트 사이드 검증이 통과된 후 서버에서 에러 발생
      server.use(
        http.post(`${API_BASE_URL}/auth/register`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '유효하지 않은 이메일 형식입니다.',
            },
            { status: 400 }
          )
        })
      )

      await expect(AuthService.register(registerData)).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('로그아웃이 성공해야 한다', async () => {
      const result = await AuthService.logout()

      expect(result.success).toBe(true)
      expect(result.message).toBe('로그아웃되었습니다.')
    })

    it('로그아웃 실패 시 에러를 처리해야 한다', async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/logout`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '로그아웃 처리 중 오류가 발생했습니다.',
            },
            { status: 500 }
          )
        })
      )

      await expect(AuthService.logout()).rejects.toThrow()
    })
  })

  describe('getCurrentUser', () => {
    it('유효한 토큰으로 현재 사용자 정보를 반환해야 한다', async () => {
      const token = 'mock-jwt-token'

      const result = await AuthService.getCurrentUser(token)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        user: {
          id: 1,
          email: 'test@example.com',
          name: '테스트 사용자',
          phone: '010-1234-5678',
        },
      })
    })

    it('유효하지 않은 토큰으로 인증 실패해야 한다', async () => {
      const token = 'invalid-token'

      const result = await AuthService.getCurrentUser(token)

      expect(result.success).toBe(false)
      expect(result.error).toBe('유효하지 않은 토큰입니다.')
    })

    it('토큰 없이 요청 시 인증 실패해야 한다', async () => {
      const result = await AuthService.getCurrentUser()

      expect(result.success).toBe(false)
      expect(result.error).toBe('인증이 필요합니다.')
    })

    it('만료된 토큰으로 요청 시 인증 실패해야 한다', async () => {
      server.use(
        http.get(`${API_BASE_URL}/auth/me`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '토큰이 만료되었습니다.',
            },
            { status: 401 }
          )
        })
      )

      const token = 'expired-token'

      const result = await AuthService.getCurrentUser(token)

      expect(result.success).toBe(false)
      expect(result.error).toBe('토큰이 만료되었습니다.')
    })
  })

  describe('refreshToken', () => {
    it('토큰 갱신이 성공해야 한다', async () => {
      const token = 'mock-jwt-token'

      const result = await AuthService.refreshToken(token)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        token: 'mock-refreshed-jwt-token',
      })
    })

    it('유효하지 않은 토큰으로 갱신 실패해야 한다', async () => {
      const token = 'invalid-token'

      const result = await AuthService.refreshToken(token)

      expect(result.success).toBe(false)
      expect(result.error).toBe('토큰 갱신에 실패했습니다.')
    })

    it('토큰 없이 갱신 요청 시 실패해야 한다', async () => {
      const result = await AuthService.refreshToken()

      expect(result.success).toBe(false)
      expect(result.error).toBe('토큰 갱신에 실패했습니다.')
    })
  })

  describe('API 호출 헬퍼', () => {
    it('Authorization 헤더가 올바르게 설정되어야 한다', async () => {
      const token = 'test-token'

      // spy를 사용하여 fetch 호출 모니터링
      const fetchSpy = vi.spyOn(global, 'fetch')

      await AuthService.getCurrentUser(token)

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`,
          }),
        })
      )

      fetchSpy.mockRestore()
    })

    it('Content-Type 헤더가 POST 요청에 설정되어야 한다', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      await AuthService.login(loginData)

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/auth/login`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(loginData),
        })
      )

      fetchSpy.mockRestore()
    })
  })

  describe('에러 처리', () => {
    it('JSON 파싱 오류를 처리해야 한다', async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/login`, () => {
          return new Response('Invalid JSON', { status: 200 })
        })
      )

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      await expect(AuthService.login(loginData)).rejects.toThrow()
    })

    it('타임아웃 오류를 처리해야 한다', async () => {
      server.use(
        http.post(`${API_BASE_URL}/auth/login`, async () => {
          // 긴 지연 시뮬레이션
          await new Promise((resolve) => setTimeout(resolve, 10000))
          return HttpResponse.json({ success: true })
        })
      )

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      // 타임아웃 설정이 있다면 테스트
      await expect(AuthService.login(loginData)).rejects.toThrow()
    }, 15000) // 15초 타임아웃
  })
})
