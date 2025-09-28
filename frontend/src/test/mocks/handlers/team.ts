import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

// Mock 데이터
const mockTeams = [
  {
    id: 1,
    name: '개발팀',
    description: '개발 업무를 담당하는 팀',
    invite_code: 'DEV001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: '마케팅팀',
    description: '마케팅 업무를 담당하는 팀',
    invite_code: 'MKT001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const mockTeamMembers = [
  {
    id: 1,
    team_id: 1,
    user_id: 1,
    role: 'leader',
    joined_at: '2024-01-01T00:00:00Z',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      full_name: '테스트 사용자',
    },
  },
  {
    id: 2,
    team_id: 1,
    user_id: 2,
    role: 'member',
    joined_at: '2024-01-02T00:00:00Z',
    user: {
      id: 2,
      username: 'member',
      email: 'member@example.com',
      full_name: '팀원',
    },
  },
]

// 토큰에서 사용자 ID 추출
function getUserIdFromToken(token: string): number {
  const tokenUserMap: Record<string, number> = {
    'mock-jwt-token': 1,
    'mock-jwt-token-member': 2,
    'mock-jwt-token-new': 3,
    'mock-jwt-token-registered': 100,
  }
  return tokenUserMap[token] || 1
}

export const teamHandlers = [
  // 팀 목록 조회
  http.get(`${API_BASE_URL}/teams`, ({ request }) => {
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

    return HttpResponse.json({
      success: true,
      data: {
        teams: mockTeams,
      },
    })
  }),

  // 팀 생성
  http.post(`${API_BASE_URL}/teams`, async ({ request }) => {
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

    const { name, description } = (await request.json()) as {
      name: string
      description?: string
    }

    // 팀명 중복 체크
    if (mockTeams.some((team) => team.name === name)) {
      return HttpResponse.json(
        {
          success: false,
          error: '이미 존재하는 팀명입니다.',
        },
        { status: 409 }
      )
    }

    const newTeam = {
      id: mockTeams.length + 1,
      name,
      description: description || '',
      invite_code: `TEAM${String(mockTeams.length + 1).padStart(3, '0')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockTeams.push(newTeam)

    return HttpResponse.json({
      success: true,
      data: {
        team: newTeam,
      },
    })
  }),

  // 팀 상세 조회
  http.get(`${API_BASE_URL}/teams/:id`, ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const teamId = Number(params.id)

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: '인증이 필요합니다.',
        },
        { status: 401 }
      )
    }

    const team = mockTeams.find((t) => t.id === teamId)

    if (!team) {
      return HttpResponse.json(
        {
          success: false,
          error: '팀을 찾을 수 없습니다.',
        },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        team,
      },
    })
  }),

  // 팀 멤버 목록 조회
  http.get(`${API_BASE_URL}/teams/:id/members`, ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const teamId = Number(params.id)

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: '인증이 필요합니다.',
        },
        { status: 401 }
      )
    }

    const members = mockTeamMembers.filter(
      (member) => member.team_id === teamId
    )

    return HttpResponse.json({
      success: true,
      data: {
        members,
      },
    })
  }),

  // 팀 참여 (초대 코드로) - 즉시 응답
  http.post(`${API_BASE_URL}/teams/join`, async ({ request }) => {
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

    const { invite_code } = (await request.json()) as { invite_code: string }

    const team = mockTeams.find((t) => t.invite_code === invite_code)

    if (!team) {
      return HttpResponse.json(
        {
          success: false,
          error: '유효하지 않은 초대 코드입니다.',
        },
        { status: 404 }
      )
    }

    const token = authorization.slice(7)
    const userId = getUserIdFromToken(token)

    // 이미 팀에 가입되어 있는지 체크
    const existingMember = mockTeamMembers.find(
      (member) => member.team_id === team.id && member.user_id === userId
    )

    if (existingMember) {
      return HttpResponse.json(
        {
          success: false,
          error: '이미 팀에 가입되어 있습니다.',
        },
        { status: 409 }
      )
    }

    const newMember = {
      id: mockTeamMembers.length + 1,
      team_id: team.id,
      user_id: userId,
      role: 'member' as const,
      joined_at: new Date().toISOString(),
      user: {
        id: userId,
        username: userId === 2 ? 'member' : userId === 3 ? 'newuser' : 'user',
        email: userId === 2 ? 'member@example.com' : userId === 3 ? 'newuser@example.com' : 'user@example.com',
        full_name: userId === 2 ? '팀원' : userId === 3 ? '새 사용자' : '사용자',
      },
    }

    mockTeamMembers.push(newMember)

    // 즉시 응답 (지연 없음)
    return HttpResponse.json({
      success: true,
      data: {
        team,
        member: newMember,
      },
    })
  }),

  // 팀 멤버 역할 변경
  http.patch(
    `${API_BASE_URL}/teams/:id/members/:memberId`,
    async ({ request, params }) => {
      const authorization = request.headers.get('Authorization')
      const teamId = Number(params.id)
      const memberId = Number(params.memberId)

      if (!authorization || !authorization.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            success: false,
            error: '인증이 필요합니다.',
          },
          { status: 401 }
        )
      }

      const { role } = (await request.json()) as { role: 'leader' | 'member' }

      const memberIndex = mockTeamMembers.findIndex(
        (member) => member.id === memberId && member.team_id === teamId
      )

      if (memberIndex === -1) {
        return HttpResponse.json(
          {
            success: false,
            error: '팀 멤버를 찾을 수 없습니다.',
          },
          { status: 404 }
        )
      }

      mockTeamMembers[memberIndex].role = role

      return HttpResponse.json({
        success: true,
        data: {
          member: mockTeamMembers[memberIndex],
        },
      })
    }
  ),

  // 팀 멤버 제거
  http.delete(
    `${API_BASE_URL}/teams/:id/members/:memberId`,
    ({ request, params }) => {
      const authorization = request.headers.get('Authorization')
      const teamId = Number(params.id)
      const memberId = Number(params.memberId)

      if (!authorization || !authorization.startsWith('Bearer ')) {
        return HttpResponse.json(
          {
            success: false,
            error: '인증이 필요합니다.',
          },
          { status: 401 }
        )
      }

      const memberIndex = mockTeamMembers.findIndex(
        (member) => member.id === memberId && member.team_id === teamId
      )

      if (memberIndex === -1) {
        return HttpResponse.json(
          {
            success: false,
            error: '팀 멤버를 찾을 수 없습니다.',
          },
          { status: 404 }
        )
      }

      mockTeamMembers.splice(memberIndex, 1)

      return HttpResponse.json({
        success: true,
        message: '팀 멤버가 제거되었습니다.',
      })
    }
  ),

  // 팀 삭제
  http.delete(`${API_BASE_URL}/teams/:id`, ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const teamId = Number(params.id)

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          error: '인증이 필요합니다.',
        },
        { status: 401 }
      )
    }

    const teamIndex = mockTeams.findIndex((team) => team.id === teamId)

    if (teamIndex === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: '팀을 찾을 수 없습니다.',
        },
        { status: 404 }
      )
    }

    mockTeams.splice(teamIndex, 1)

    return HttpResponse.json({
      success: true,
      message: '팀이 삭제되었습니다.',
    })
  }),
]