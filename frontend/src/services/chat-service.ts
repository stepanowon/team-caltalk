import api from './api'

export interface Message {
  id: number
  team_id: number
  user_id: number
  content: string
  message_date: string
  message_type: string
  related_schedule_id?: number
  related_schedule_title?: string
  created_at: string
  updated_at: string
  user: {
    id: number
    username?: string
    name: string
  }
}

export interface ScheduleRequest {
  id: number
  content: string
  sender_name: string
  sent_at: string
  related_schedule_id: number
  related_schedule_title: string
}

export type SendMessageRequest = {
  content: string
  targetDate: string
}

export type ScheduleChangeRequest = {
  teamId: number
  scheduleId: number
  content: string
  targetDate: string
}

export const ChatService = {
  // 메시지 조회
  async getMessages(teamId: number, targetDate: string) {
    const response = await api.get<{
      success: boolean
      data: {
        messages: Message[]
      }
    }>(`/chat/teams/${teamId}/messages`, {
      params: { targetDate },
    })
    return response.data
  },

  // 메시지 전송
  async sendMessage(teamId: number, data: SendMessageRequest) {
    const response = await api.post<{
      success: boolean
      data: {
        message: Message
      }
    }>(`/chat/teams/${teamId}/messages`, data)
    return response.data
  },

  // 일정 변경 요청 조회
  async getScheduleRequests(teamId: number) {
    const response = await api.get<{
      success: boolean
      data: {
        requests: ScheduleRequest[]
      }
    }>(`/chat/teams/${teamId}/schedule-requests`)
    return response.data
  },

  // 일정 변경 요청 전송
  async sendScheduleRequest(data: ScheduleChangeRequest) {
    const response = await api.post<{
      success: boolean
      data: any
    }>('/chat/schedule-request', data)
    return response.data
  },

  // 일정 변경 요청 승인
  async approveRequest(messageId: number) {
    const response = await api.post<{
      success: boolean
      data: any
    }>(`/chat/approve-request/${messageId}`)
    return response.data
  },

  // 일정 변경 요청 거절
  async rejectRequest(messageId: number) {
    const response = await api.post<{
      success: boolean
      data: any
    }>(`/chat/reject-request/${messageId}`)
    return response.data
  },

  // 응답 확인
  async acknowledgeResponse(messageId: number) {
    const response = await api.post<{
      success: boolean
      data: any
    }>(`/chat/acknowledge-response/${messageId}`)
    return response.data
  },
}
