import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000/api'

// Mock 일정 데이터
const mockSchedules = [
  {
    id: 1,
    title: '팀 회의',
    description: '주간 개발팀 회의',
    start_time: '2024-01-01T10:00:00Z',
    end_time: '2024-01-01T11:00:00Z',
    team_id: 1,
    creator_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    participants: [
      {
        id: 1,
        schedule_id: 1,
        user_id: 1,
        status: 'accepted',
        user: {
          id: 1,
          username: 'testuser',
          full_name: '테스트 사용자',
        },
      },
      {
        id: 2,
        schedule_id: 1,
        user_id: 2,
        status: 'pending',
        user: {
          id: 2,
          username: 'member',
          full_name: '팀원',
        },
      },
    ],
  },
  {
    id: 2,
    title: '프로젝트 리뷰',
    description: '분기별 프로젝트 검토',
    start_time: '2024-01-02T14:00:00Z',
    end_time: '2024-01-02T16:00:00Z',
    team_id: 1,
    creator_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    participants: [
      {
        id: 3,
        schedule_id: 2,
        user_id: 1,
        status: 'accepted',
        user: {
          id: 1,
          username: 'testuser',
          full_name: '테스트 사용자',
        },
      },
    ],
  },
  {
    id: 3,
    title: '일정 충돌 테스트',
    description: '충돌 감지용 일정',
    start_time: '2024-01-01T10:30:00Z',
    end_time: '2024-01-01T11:30:00Z',
    team_id: 1,
    creator_id: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    participants: [
      {
        id: 4,
        schedule_id: 3,
        user_id: 2,
        status: 'accepted',
        user: {
          id: 2,
          username: 'member',
          full_name: '팀원',
        },
      },
    ],
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

// 권한 확인 (팀장만 CRUD 가능)
function hasLeaderPermission(userId: number, teamId: number): boolean {
  return userId === 1 && teamId === 1 // 테스트용: user 1이 team 1의 팀장
}

// 일정 충돌 검사
function checkScheduleConflict(
  start: string,
  end: string,
  teamId: number,
  excludeId?: number
): boolean {
  const startTime = new Date(start)
  const endTime = new Date(end)

  return mockSchedules.some(schedule => {
    if (schedule.id === excludeId || schedule.team_id !== teamId) return false

    const existingStart = new Date(schedule.start_time)
    const existingEnd = new Date(schedule.end_time)

    return (
      (startTime >= existingStart && startTime < existingEnd) ||
      (endTime > existingStart && endTime <= existingEnd) ||
      (startTime < existingStart && endTime > existingEnd)
    )
  })
}

export const scheduleHandlers = [
  // 일정 목록 조회 (팀별)
  http.get(`${API_BASE_URL}/teams/:teamId/schedules`, ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const teamId = Number(params.teamId)
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    let filteredSchedules = mockSchedules.filter(s => s.team_id === teamId)

    // 날짜 필터링
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      filteredSchedules = filteredSchedules.filter(schedule => {
        const scheduleStart = new Date(schedule.start_time)
        return scheduleStart >= start && scheduleStart <= end
      })
    }

    // 느린 네트워크 시뮬레이션
    const isSlowNetwork = url.searchParams.get('slow') === 'true'

    if (isSlowNetwork) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(HttpResponse.json({
            success: true,
            data: { schedules: filteredSchedules },
          }))
        }, 3000) // 3초 지연
      })
    }

    return HttpResponse.json({
      success: true,
      data: { schedules: filteredSchedules },
    })
  }),

  // 일정 상세 조회
  http.get(`${API_BASE_URL}/schedules/:id`, ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const scheduleId = Number(params.id)

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const schedule = mockSchedules.find(s => s.id === scheduleId)

    if (!schedule) {
      return HttpResponse.json(
        { success: false, error: '일정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: { schedule },
    })
  }),

  // 일정 생성
  http.post(`${API_BASE_URL}/teams/:teamId/schedules`, async ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const teamId = Number(params.teamId)

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authorization.slice(7)
    const userId = getUserIdFromToken(token)

    // 권한 확인
    if (!hasLeaderPermission(userId, teamId)) {
      return HttpResponse.json(
        { success: false, error: '일정 생성 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json() as {
      title: string
      description?: string
      start_time: string
      end_time: string
      participant_ids?: number[]
    }

    // 일정 길이 검증 (최대 7일)
    const startTime = new Date(body.start_time)
    const endTime = new Date(body.end_time)
    const duration = endTime.getTime() - startTime.getTime()
    const maxDuration = 7 * 24 * 60 * 60 * 1000 // 7일

    if (duration > maxDuration) {
      return HttpResponse.json(
        { success: false, error: '일정 기간은 최대 7일까지 가능합니다.' },
        { status: 400 }
      )
    }

    // 충돌 검사
    if (checkScheduleConflict(body.start_time, body.end_time, teamId)) {
      return HttpResponse.json(
        {
          success: false,
          error: '해당 시간에 이미 다른 일정이 있습니다.',
          conflict: true
        },
        { status: 409 }
      )
    }

    const newSchedule = {
      id: mockSchedules.length + 1,
      title: body.title,
      description: body.description || '',
      start_time: body.start_time,
      end_time: body.end_time,
      team_id: teamId,
      creator_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      participants: [
        {
          id: Date.now(),
          schedule_id: mockSchedules.length + 1,
          user_id: userId,
          status: 'accepted' as const,
          user: {
            id: userId,
            username: 'testuser',
            full_name: '테스트 사용자',
          },
        },
      ],
    }

    mockSchedules.push(newSchedule)

    return HttpResponse.json({
      success: true,
      data: { schedule: newSchedule },
    })
  }),

  // 일정 수정
  http.patch(`${API_BASE_URL}/schedules/:id`, async ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const scheduleId = Number(params.id)

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authorization.slice(7)
    const userId = getUserIdFromToken(token)

    const scheduleIndex = mockSchedules.findIndex(s => s.id === scheduleId)
    if (scheduleIndex === -1) {
      return HttpResponse.json(
        { success: false, error: '일정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const schedule = mockSchedules[scheduleIndex]

    // 권한 확인 (팀장 또는 생성자만)
    if (!hasLeaderPermission(userId, schedule.team_id) && schedule.creator_id !== userId) {
      return HttpResponse.json(
        { success: false, error: '일정 수정 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const body = await request.json() as Partial<{
      title: string
      description: string
      start_time: string
      end_time: string
    }>

    // 시간 변경 시 충돌 검사
    if (body.start_time && body.end_time) {
      if (checkScheduleConflict(body.start_time, body.end_time, schedule.team_id, scheduleId)) {
        return HttpResponse.json(
          {
            success: false,
            error: '해당 시간에 이미 다른 일정이 있습니다.',
            conflict: true
          },
          { status: 409 }
        )
      }
    }

    const updatedSchedule = {
      ...schedule,
      ...body,
      updated_at: new Date().toISOString(),
    }

    mockSchedules[scheduleIndex] = updatedSchedule

    return HttpResponse.json({
      success: true,
      data: { schedule: updatedSchedule },
    })
  }),

  // 일정 삭제
  http.delete(`${API_BASE_URL}/schedules/:id`, ({ request, params }) => {
    const authorization = request.headers.get('Authorization')
    const scheduleId = Number(params.id)

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authorization.slice(7)
    const userId = getUserIdFromToken(token)

    const scheduleIndex = mockSchedules.findIndex(s => s.id === scheduleId)
    if (scheduleIndex === -1) {
      return HttpResponse.json(
        { success: false, error: '일정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const schedule = mockSchedules[scheduleIndex]

    // 권한 확인 (팀장 또는 생성자만)
    if (!hasLeaderPermission(userId, schedule.team_id) && schedule.creator_id !== userId) {
      return HttpResponse.json(
        { success: false, error: '일정 삭제 권한이 없습니다.' },
        { status: 403 }
      )
    }

    mockSchedules.splice(scheduleIndex, 1)

    return HttpResponse.json({
      success: true,
      message: '일정이 삭제되었습니다.',
    })
  }),

  // 충돌 시간 검사 API
  http.post(`${API_BASE_URL}/schedules/check-conflict`, async ({ request }) => {
    const authorization = request.headers.get('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return HttpResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const body = await request.json() as {
      start_time: string
      end_time: string
      team_id: number
      exclude_id?: number
    }

    const hasConflict = checkScheduleConflict(
      body.start_time,
      body.end_time,
      body.team_id,
      body.exclude_id
    )

    // 대안 시간 제안 (충돌이 있을 때)
    let suggestions: Array<{ start_time: string; end_time: string }> = []

    if (hasConflict) {
      const duration = new Date(body.end_time).getTime() - new Date(body.start_time).getTime()
      const startDate = new Date(body.start_time)

      // 1시간 뒤, 2시간 뒤, 다음날 같은 시간 제안
      for (let i = 1; i <= 3; i++) {
        const newStart = new Date(startDate.getTime() + (i * 60 * 60 * 1000))
        const newEnd = new Date(newStart.getTime() + duration)

        if (!checkScheduleConflict(newStart.toISOString(), newEnd.toISOString(), body.team_id)) {
          suggestions.push({
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          })
        }

        if (suggestions.length >= 3) break
      }
    }

    return HttpResponse.json({
      success: true,
      data: {
        hasConflict,
        suggestions,
      },
    })
  }),

  // 서버 에러 시뮬레이션
  http.get(`${API_BASE_URL}/teams/:teamId/schedules/error`, () => {
    return HttpResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }),
]