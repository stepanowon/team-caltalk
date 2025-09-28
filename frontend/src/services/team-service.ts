import { api } from './api'
import { API_ENDPOINTS } from '@/utils/constants'
import type { Team, TeamMember } from '@/stores/team-store'

export interface CreateTeamData {
  name: string
  description: string
}

export interface UpdateMemberData {
  role: 'leader' | 'member'
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export const TeamService = {
  /**
   * 팀 목록 조회
   */
  async getTeams(token?: string): Promise<ApiResponse<{ teams: Team[] }>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.get(API_ENDPOINTS.TEAMS.LIST, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 팀 상세 조회
   */
  async getTeam(teamId: number, token?: string): Promise<ApiResponse<{ team: Team }>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.get(API_ENDPOINTS.TEAMS.DETAIL(teamId), {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 팀 생성
   */
  async createTeam(data: CreateTeamData, token?: string): Promise<ApiResponse<{ team: Team }>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.post(API_ENDPOINTS.TEAMS.CREATE, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 팀 멤버 목록 조회
   */
  async getTeamMembers(teamId: number, token?: string): Promise<ApiResponse<{ members: TeamMember[] }>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.get(API_ENDPOINTS.TEAMS.MEMBERS(teamId), {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 초대 코드로 팀 참여
   */
  async joinTeam(inviteCode: string, token?: string): Promise<ApiResponse<{ team: Team; member: TeamMember }>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.post(API_ENDPOINTS.TEAMS.JOIN, { invite_code: inviteCode }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 팀 멤버 역할 변경
   */
  async updateTeamMember(
    teamId: number,
    memberId: number,
    data: UpdateMemberData,
    token?: string
  ): Promise<ApiResponse<{ member: TeamMember }>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.patch(`${API_ENDPOINTS.TEAMS.MEMBERS(teamId)}/${memberId}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 팀 멤버 제거
   */
  async removeTeamMember(
    teamId: number,
    memberId: number,
    token?: string
  ): Promise<ApiResponse<{}>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.delete(`${API_ENDPOINTS.TEAMS.MEMBERS(teamId)}/${memberId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },

  /**
   * 팀 삭제
   */
  async deleteTeam(teamId: number, token?: string): Promise<ApiResponse<{}>> {
    if (!token) {
      return { success: false, error: '인증이 필요합니다.' }
    }

    try {
      const response = await api.delete(API_ENDPOINTS.TEAMS.DETAIL(teamId), {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data
      }
      throw error
    }
  },
}