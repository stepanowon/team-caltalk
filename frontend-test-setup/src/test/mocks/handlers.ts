// src/test/mocks/handlers.ts
import { rest } from 'msw';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const handlers = [
  // 인증 API
  rest.post(`${API_BASE_URL}/auth/register`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: '회원가입이 완료되었습니다',
        user: {
          id: 1,
          name: '김테스트',
          email: 'test@example.com'
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
        user: {
          id: 1,
          name: '김테스트',
          email: 'test@example.com',
          role: 'member'
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: '로그아웃되었습니다'
      })
    );
  }),

  rest.post(`${API_BASE_URL}/auth/refresh`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token'
      })
    );
  }),

  // 사용자 프로필 API
  rest.get(`${API_BASE_URL}/user/profile`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        user: {
          id: 1,
          name: '김테스트',
          email: 'test@example.com',
          role: 'member',
          createdAt: '2024-01-01T00:00:00Z'
        }
      })
    );
  }),

  // 팀 관리 API
  rest.get(`${API_BASE_URL}/teams`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        teams: [
          {
            id: 1,
            name: '개발팀',
            description: 'Frontend/Backend 개발팀',
            inviteCode: 'DEV123',
            memberCount: 5,
            role: 'leader'
          },
          {
            id: 2,
            name: 'QA팀',
            description: '품질보증팀',
            inviteCode: 'QA456',
            memberCount: 3,
            role: 'member'
          }
        ]
      })
    );
  }),

  rest.post(`${API_BASE_URL}/teams`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        team: {
          id: 3,
          name: '신규팀',
          description: '새로 생성된 팀',
          inviteCode: 'NEW789',
          memberCount: 1,
          role: 'leader'
        }
      })
    );
  }),

  rest.post(`${API_BASE_URL}/teams/join`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        team: {
          id: 1,
          name: '개발팀',
          description: 'Frontend/Backend 개발팀',
          role: 'member'
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/teams/:teamId/members`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        members: [
          {
            id: 1,
            name: '김팀장',
            email: 'leader@example.com',
            role: 'leader',
            joinedAt: '2024-01-01T00:00:00Z'
          },
          {
            id: 2,
            name: '이개발',
            email: 'dev1@example.com',
            role: 'member',
            joinedAt: '2024-01-15T00:00:00Z'
          },
          {
            id: 3,
            name: '박개발',
            email: 'dev2@example.com',
            role: 'member',
            joinedAt: '2024-02-01T00:00:00Z'
          }
        ]
      })
    );
  }),

  // 일정 관리 API
  rest.get(`${API_BASE_URL}/teams/:teamId/schedules`, (req, res, ctx) => {
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate') || '2024-03-01';
    const endDate = url.searchParams.get('endDate') || '2024-03-31';

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        schedules: [
          {
            id: 1,
            title: '팀 미팅',
            description: '주간 팀 미팅',
            startTime: '2024-03-15T09:00:00Z',
            endTime: '2024-03-15T10:00:00Z',
            type: 'team',
            createdBy: 1,
            participants: [1, 2, 3]
          },
          {
            id: 2,
            title: '코드 리뷰',
            description: 'PR 코드 리뷰 세션',
            startTime: '2024-03-16T14:00:00Z',
            endTime: '2024-03-16T15:30:00Z',
            type: 'team',
            createdBy: 1,
            participants: [1, 2]
          }
        ]
      })
    );
  }),

  rest.post(`${API_BASE_URL}/teams/:teamId/schedules`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        schedule: {
          id: 3,
          title: '새 일정',
          description: '새로 생성된 일정',
          startTime: '2024-03-20T10:00:00Z',
          endTime: '2024-03-20T11:00:00Z',
          type: 'team',
          createdBy: 1,
          participants: [1]
        }
      })
    );
  }),

  rest.put(`${API_BASE_URL}/teams/:teamId/schedules/:scheduleId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        schedule: {
          id: 1,
          title: '수정된 팀 미팅',
          description: '수정된 주간 팀 미팅',
          startTime: '2024-03-15T10:00:00Z',
          endTime: '2024-03-15T11:00:00Z',
          type: 'team',
          createdBy: 1,
          participants: [1, 2, 3]
        }
      })
    );
  }),

  rest.delete(`${API_BASE_URL}/teams/:teamId/schedules/:scheduleId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        message: '일정이 삭제되었습니다'
      })
    );
  }),

  // 메시지 API
  rest.get(`${API_BASE_URL}/teams/:teamId/messages`, (req, res, ctx) => {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || '2024-03-15';

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        messages: [
          {
            id: 1,
            content: '안녕하세요! 오늘 미팅 준비는 어떻게 되고 있나요?',
            userId: 1,
            userName: '김팀장',
            createdAt: '2024-03-15T08:00:00Z',
            type: 'text'
          },
          {
            id: 2,
            content: '자료 준비 완료했습니다!',
            userId: 2,
            userName: '이개발',
            createdAt: '2024-03-15T08:15:00Z',
            type: 'text'
          },
          {
            id: 3,
            content: '일정 변경 요청: 팀 미팅 시간을 30분 연장하고 싶습니다.',
            userId: 3,
            userName: '박개발',
            createdAt: '2024-03-15T08:30:00Z',
            type: 'schedule_request',
            scheduleId: 1
          }
        ]
      })
    );
  }),

  rest.post(`${API_BASE_URL}/teams/:teamId/messages`, (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        message: {
          id: 4,
          content: '새 메시지입니다',
          userId: 1,
          userName: '김테스트',
          createdAt: new Date().toISOString(),
          type: 'text'
        }
      })
    );
  }),

  rest.get(`${API_BASE_URL}/teams/:teamId/messages/poll`, (req, res, ctx) => {
    // Long polling 시뮬레이션
    return res(
      ctx.delay(1000), // 1초 지연
      ctx.status(200),
      ctx.json({
        success: true,
        newMessages: [
          {
            id: 5,
            content: '실시간 메시지입니다',
            userId: 2,
            userName: '이개발',
            createdAt: new Date().toISOString(),
            type: 'text'
          }
        ]
      })
    );
  }),

  // 에러 시나리오 핸들러들
  rest.post(`${API_BASE_URL}/auth/login-error`, (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: '이메일 또는 비밀번호가 잘못되었습니다'
      })
    );
  }),

  rest.get(`${API_BASE_URL}/teams/server-error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: '서버 오류가 발생했습니다'
      })
    );
  }),

  // 네트워크 에러 시뮬레이션
  rest.get(`${API_BASE_URL}/network-error`, (req, res, ctx) => {
    return res.networkError('네트워크 연결 실패');
  })
];

export { rest };