import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TeamService } from '../team-service'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

describe('TeamService', () => {
  const mockToken = 'mock-jwt-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTeams', () => {
    it('팀 목록을 성공적으로 반환해야 한다', async () => {
      const result = await TeamService.getTeams(mockToken)

      expect(result.success).toBe(true)
      expect(result.data.teams).toHaveLength(2)
      expect(result.data.teams[0]).toMatchObject({
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
      })
    })

    it('인증 없이 요청 시 실패해야 한다', async () => {
      const result = await TeamService.getTeams()

      expect(result.success).toBe(false)
      expect(result.error).toBe('인증이 필요합니다.')
    })

    it('유효하지 않은 토큰으로 요청 시 실패해야 한다', async () => {
      const invalidToken = 'invalid-token'

      server.use(
        http.get(`${API_BASE_URL}/teams`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '유효하지 않은 토큰입니다.',
            },
            { status: 401 }
          )
        })
      )

      const result = await TeamService.getTeams(invalidToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('유효하지 않은 토큰입니다.')
    })
  })

  describe('createTeam', () => {
    it('팀을 성공적으로 생성해야 한다', async () => {
      const teamData = {
        name: '새 팀',
        description: '새로 생성된 팀입니다',
      }

      const result = await TeamService.createTeam(teamData, mockToken)

      expect(result.success).toBe(true)
      expect(result.data.team).toMatchObject({
        name: '새 팀',
        description: '새로 생성된 팀입니다',
      })
      expect(result.data.team.invite_code).toBeDefined()
    })

    it('중복된 팀명으로 생성 시 실패해야 한다', async () => {
      const teamData = {
        name: '개발팀', // 이미 존재하는 팀명
        description: '중복된 팀',
      }

      const result = await TeamService.createTeam(teamData, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('이미 존재하는 팀명입니다.')
    })

    it('인증 없이 팀 생성 시 실패해야 한다', async () => {
      const teamData = {
        name: '새 팀',
        description: '새로 생성된 팀입니다',
      }

      const result = await TeamService.createTeam(teamData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('인증이 필요합니다.')
    })

    it('필수 필드 누락 시 에러를 처리해야 한다', async () => {
      server.use(
        http.post(`${API_BASE_URL}/teams`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '팀명은 필수입니다.',
            },
            { status: 400 }
          )
        })
      )

      const teamData = {
        name: '', // 빈 팀명
        description: '설명',
      }

      const result = await TeamService.createTeam(teamData, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀명은 필수입니다.')
    })
  })

  describe('getTeam', () => {
    it('팀 상세 정보를 성공적으로 반환해야 한다', async () => {
      const teamId = 1

      const result = await TeamService.getTeam(teamId, mockToken)

      expect(result.success).toBe(true)
      expect(result.data.team).toMatchObject({
        id: 1,
        name: '개발팀',
        description: '개발 업무를 담당하는 팀',
        invite_code: 'DEV001',
      })
    })

    it('존재하지 않는 팀 조회 시 실패해야 한다', async () => {
      const teamId = 999

      const result = await TeamService.getTeam(teamId, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀을 찾을 수 없습니다.')
    })

    it('인증 없이 팀 조회 시 실패해야 한다', async () => {
      const teamId = 1

      const result = await TeamService.getTeam(teamId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('인증이 필요합니다.')
    })
  })

  describe('getTeamMembers', () => {
    it('팀 멤버 목록을 성공적으로 반환해야 한다', async () => {
      const teamId = 1

      const result = await TeamService.getTeamMembers(teamId, mockToken)

      expect(result.success).toBe(true)
      expect(result.data.members).toHaveLength(2)
      expect(result.data.members[0]).toMatchObject({
        id: 1,
        team_id: 1,
        user_id: 1,
        role: 'leader',
        user: {
          id: 1,
          email: 'test@example.com',
          name: '테스트 사용자',
        },
      })
    })

    it('존재하지 않는 팀의 멤버 조회 시 빈 배열을 반환해야 한다', async () => {
      const teamId = 999

      server.use(
        http.get(`${API_BASE_URL}/teams/999/members`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              members: [],
            },
          })
        })
      )

      const result = await TeamService.getTeamMembers(teamId, mockToken)

      expect(result.success).toBe(true)
      expect(result.data.members).toHaveLength(0)
    })
  })

  describe('joinTeam', () => {
    it('초대 코드로 팀에 성공적으로 참여해야 한다', async () => {
      const inviteCode = 'MKT001'

      const result = await TeamService.joinTeam(inviteCode, mockToken)

      expect(result.success).toBe(true)
      expect(result.data.team).toBeDefined()
      expect(result.data.member).toBeDefined()
      expect(result.data.member.role).toBe('member')
    })

    it('유효하지 않은 초대 코드로 참여 시 실패해야 한다', async () => {
      const inviteCode = 'INVALID'

      const result = await TeamService.joinTeam(inviteCode, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('유효하지 않은 초대 코드입니다.')
    })

    it('이미 가입된 팀에 재참여 시 실패해야 한다', async () => {
      const inviteCode = 'DEV001' // 이미 가입된 팀

      const result = await TeamService.joinTeam(inviteCode, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('이미 팀에 가입되어 있습니다.')
    })

    it('인증 없이 팀 참여 시 실패해야 한다', async () => {
      const inviteCode = 'MKT001'

      const result = await TeamService.joinTeam(inviteCode)

      expect(result.success).toBe(false)
      expect(result.error).toBe('인증이 필요합니다.')
    })
  })

  describe('updateTeamMember', () => {
    it('팀 멤버 역할을 성공적으로 변경해야 한다', async () => {
      const teamId = 1
      const memberId = 2
      const role = 'leader'

      const result = await TeamService.updateTeamMember(
        teamId,
        memberId,
        { role },
        mockToken
      )

      expect(result.success).toBe(true)
      expect(result.data.member.role).toBe('leader')
    })

    it('존재하지 않는 멤버 업데이트 시 실패해야 한다', async () => {
      const teamId = 1
      const memberId = 999
      const role = 'leader'

      const result = await TeamService.updateTeamMember(
        teamId,
        memberId,
        { role },
        mockToken
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀 멤버를 찾을 수 없습니다.')
    })

    it('권한 없는 사용자가 멤버 업데이트 시 실패해야 한다', async () => {
      server.use(
        http.patch(`${API_BASE_URL}/teams/:id/members/:memberId`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '권한이 없습니다.',
            },
            { status: 403 }
          )
        })
      )

      const teamId = 1
      const memberId = 2
      const role = 'leader'

      const result = await TeamService.updateTeamMember(
        teamId,
        memberId,
        { role },
        mockToken
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('권한이 없습니다.')
    })
  })

  describe('removeTeamMember', () => {
    it('팀 멤버를 성공적으로 제거해야 한다', async () => {
      const teamId = 1
      const memberId = 2

      const result = await TeamService.removeTeamMember(
        teamId,
        memberId,
        mockToken
      )

      expect(result.success).toBe(true)
      expect(result.message).toBe('팀 멤버가 제거되었습니다.')
    })

    it('존재하지 않는 멤버 제거 시 실패해야 한다', async () => {
      const teamId = 1
      const memberId = 999

      const result = await TeamService.removeTeamMember(
        teamId,
        memberId,
        mockToken
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀 멤버를 찾을 수 없습니다.')
    })

    it('팀장이 자신을 제거하려 할 때 실패해야 한다', async () => {
      server.use(
        http.delete(`${API_BASE_URL}/teams/:id/members/:memberId`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '팀장은 자신을 제거할 수 없습니다.',
            },
            { status: 400 }
          )
        })
      )

      const teamId = 1
      const memberId = 1 // 팀장 본인

      const result = await TeamService.removeTeamMember(
        teamId,
        memberId,
        mockToken
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀장은 자신을 제거할 수 없습니다.')
    })
  })

  describe('deleteTeam', () => {
    it('팀을 성공적으로 삭제해야 한다', async () => {
      const teamId = 1

      const result = await TeamService.deleteTeam(teamId, mockToken)

      expect(result.success).toBe(true)
      expect(result.message).toBe('팀이 삭제되었습니다.')
    })

    it('존재하지 않는 팀 삭제 시 실패해야 한다', async () => {
      const teamId = 999

      const result = await TeamService.deleteTeam(teamId, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀을 찾을 수 없습니다.')
    })

    it('팀장이 아닌 사용자가 팀 삭제 시 실패해야 한다', async () => {
      server.use(
        http.delete(`${API_BASE_URL}/teams/:id`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '팀장만 팀을 삭제할 수 있습니다.',
            },
            { status: 403 }
          )
        })
      )

      const teamId = 1

      const result = await TeamService.deleteTeam(teamId, mockToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('팀장만 팀을 삭제할 수 있습니다.')
    })
  })

  describe('API 호출 헬퍼', () => {
    it('모든 API 호출에 Authorization 헤더가 포함되어야 한다', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      await TeamService.getTeams(mockToken)

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/teams`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      )

      fetchSpy.mockRestore()
    })

    it('POST 요청에 Content-Type 헤더가 포함되어야 한다', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      const teamData = {
        name: '새 팀',
        description: '설명',
      }

      await TeamService.createTeam(teamData, mockToken)

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_BASE_URL}/teams`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          }),
          body: JSON.stringify(teamData),
        })
      )

      fetchSpy.mockRestore()
    })
  })

  describe('에러 처리', () => {
    it('네트워크 오류를 처리해야 한다', async () => {
      server.use(
        http.get(`${API_BASE_URL}/teams`, () => {
          return HttpResponse.error()
        })
      )

      await expect(TeamService.getTeams(mockToken)).rejects.toThrow()
    })

    it('JSON 파싱 오류를 처리해야 한다', async () => {
      server.use(
        http.get(`${API_BASE_URL}/teams`, () => {
          return new Response('Invalid JSON', { status: 200 })
        })
      )

      await expect(TeamService.getTeams(mockToken)).rejects.toThrow()
    })

    it('HTTP 상태 오류를 처리해야 한다', async () => {
      server.use(
        http.get(`${API_BASE_URL}/teams`, () => {
          return HttpResponse.json(
            {
              success: false,
              error: '서버 내부 오류',
            },
            { status: 500 }
          )
        })
      )

      await expect(TeamService.getTeams(mockToken)).rejects.toThrow()
    })
  })
})
