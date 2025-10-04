import api from './api'

export interface Activity {
  id: string
  type: string
  icon: string
  title: string
  description: string
  actor: string
  teamName: string
  timestamp: string
  metadata: any
}

export const ActivityService = {
  // 활동 내역 조회
  async getActivities(params?: { teamId?: number; limit?: number }) {
    const response = await api.get<{
      success: boolean
      data: {
        activities: Activity[]
      }
    }>('/activities', {
      params,
    })
    return response.data
  },
}
