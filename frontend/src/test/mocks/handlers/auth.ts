import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

export const authHandlers = [
  // 로그인 성공
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string
      password: string
    }

    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
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
      })
    }

    return HttpResponse.json(
      {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      },
      { status: 401 }
    )
  }),

  // 회원가입 성공
  http.post(`${API_BASE_URL}/auth/register`, async ({ request }) => {
    const { email, password, name, phone } = (await request.json()) as {
      email: string
      password: string
      name: string
      phone: string
    }

    // 이미 존재하는 이메일
    if (email === 'existing@example.com') {
      return HttpResponse.json(
        {
          success: false,
          error: '이미 사용 중인 이메일입니다.',
        },
        { status: 409 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: 2,
          email,
          name,
          phone,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token-new',
      },
    })
  }),

  // 로그아웃
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({
      success: true,
      message: '로그아웃되었습니다.',
    })
  }),

  // 토큰 검증
  http.get(`${API_BASE_URL}/auth/me`, ({ request }) => {
    const authorization = request.headers.get('Authorization')

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: '인증이 필요합니다.',
        },
        { status: 401 }
      )
    }

    const token = authorization.slice(7)

    if (token === 'mock-jwt-token' || token === 'mock-jwt-token-new') {
      return HttpResponse.json({
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
      })
    }

    return HttpResponse.json(
      {
        success: false,
        error: '유효하지 않은 토큰입니다.',
      },
      { status: 401 }
    )
  }),

  // 토큰 갱신
  http.post(`${API_BASE_URL}/auth/refresh`, ({ request }) => {
    const authorization = request.headers.get('Authorization')

    if (authorization && authorization.startsWith('Bearer ')) {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-refreshed-jwt-token',
        },
      })
    }

    return HttpResponse.json(
      {
        success: false,
        error: '토큰 갱신에 실패했습니다.',
      },
      { status: 401 }
    )
  }),

  // 네트워크 오류 시뮬레이션
  http.post(`${API_BASE_URL}/auth/network-error`, () => {
    return HttpResponse.error()
  }),

  // 서버 오류 시뮬레이션
  http.post(`${API_BASE_URL}/auth/server-error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: '서버 내부 오류',
      },
      { status: 500 }
    )
  }),
]
