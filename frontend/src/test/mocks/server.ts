import { setupServer } from 'msw/node'
import { authHandlers } from './handlers/auth'
import { teamHandlers } from './handlers/team'

// MSW 서버 설정
export const server = setupServer(...authHandlers, ...teamHandlers)
