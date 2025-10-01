import { setupServer } from 'msw/node'
import { authHandlers } from './handlers/auth'
import { teamHandlers } from './handlers/team'
import { scheduleHandlers } from './handlers/schedule'
import { chatHandlers } from './handlers/chat'

// MSW 서버 설정
export const server = setupServer(...authHandlers, ...teamHandlers, ...scheduleHandlers, ...chatHandlers)