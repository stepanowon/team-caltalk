import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

export const authHandlers = [
  // 로그인 성공
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string
      password: string
    }

    // 테스트용 사용자 데이터
    const users = [
      {
        email: 'test@example.com',
        password: 'password123',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          full_name: '테스트 사용자',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token',
      },
      {
        email: 'member@example.com',
        password: 'password123',
        user: {
          id: 2,
          username: 'member',
          email: 'member@example.com',
          full_name: '팀원',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token-member',
      },
      {
        email: 'newuser@example.com',
        password: 'password123',
        user: {
          id: 3,
          username: 'newuser',
          email: 'newuser@example.com',
          full_name: '새 사용자',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token-new',
      },
    ]

    const matchedUser = users.find((u) => u.email === email && u.password === password)

    if (matchedUser) {
      return HttpResponse.json({
        success: true,
        data: {
          user: matchedUser.user,
          token: matchedUser.token,
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
    const { email, password, username, full_name } = (await request.json()) as {
      email: string
      password: string
      username: string
      full_name: string
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
          id: 100,
          username,
          email,
          full_name,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token-registered',
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

    // 만료된 토큰 처리
    if (token === 'expired-token') {
      return HttpResponse.json(
        {
          success: false,
          error: '토큰이 만료되었습니다.',
        },
        { status: 401 }
      )
    }

    const tokenUsers = {
      'mock-jwt-token': {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        full_name: '테스트 사용자',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      'mock-jwt-token-member': {
        id: 2,
        username: 'member',
        email: 'member@example.com',
        full_name: '팀원',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      'mock-jwt-token-new': {
        id: 3,
        username: 'newuser',
        email: 'newuser@example.com',
        full_name: '새 사용자',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      'mock-jwt-token-registered': {
        id: 100,
        username: 'registered',
        email: 'registered@example.com',
        full_name: '등록된 사용자',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    }

    const user = tokenUsers[token as keyof typeof tokenUsers]

    if (user) {
      return HttpResponse.json({
        success: true,
        data: { user },
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
]