export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE: '/users/profile',
  },
  TEAMS: {
    LIST: '/teams',
    CREATE: '/teams',
    DETAIL: (id: number) => `/teams/${id}`,
    JOIN: '/teams/join',
    MEMBERS: (id: number) => `/teams/${id}/members`,
  },
  SCHEDULES: {
    LIST: (teamId: number) => `/teams/${teamId}/schedules`,
    CREATE: (teamId: number) => `/teams/${teamId}/schedules`,
    DETAIL: (teamId: number, scheduleId: number) =>
      `/teams/${teamId}/schedules/${scheduleId}`,
    UPDATE: (teamId: number, scheduleId: number) =>
      `/teams/${teamId}/schedules/${scheduleId}`,
    DELETE: (teamId: number, scheduleId: number) =>
      `/teams/${teamId}/schedules/${scheduleId}`,
  },
  MESSAGES: {
    LIST: (teamId: number) => `/teams/${teamId}/messages`,
    CREATE: (teamId: number) => `/teams/${teamId}/messages`,
  },
} as const

export const QUERY_KEYS = {
  AUTH: ['auth'],
  USERS: ['users'],
  TEAMS: ['teams'],
  SCHEDULES: ['schedules'],
  MESSAGES: ['messages'],
} as const

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  TEAMS: '/teams',
  TEAM_DETAIL: (id: number) => `/teams/${id}`,
  SCHEDULES: '/schedules',
  MESSAGES: '/messages',
} as const