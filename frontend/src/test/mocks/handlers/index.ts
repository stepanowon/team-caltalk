import { authHandlers } from './auth'
import { teamHandlers } from './team'

export const handlers = [...authHandlers, ...teamHandlers]