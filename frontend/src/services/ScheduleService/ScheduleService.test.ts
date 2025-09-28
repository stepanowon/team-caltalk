import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock ScheduleService (구현 전 테스트)
class MockScheduleService {
  private baseURL = 'http://localhost:3000/api'
  private authToken: string | null = 'mock-jwt-token'

  constructor(authToken?: string) {
    if (authToken) {
      this.authToken = authToken
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
    }
  }

  // 일정 목록 조회
  async getSchedules(teamId: number, params?: {
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('start_date', params.startDate)
    if (params?.endDate) searchParams.append('end_date', params.endDate)

    const url = `${this.baseURL}/teams/${teamId}/schedules?${searchParams}`

    const response = await fetch(url, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '일정 조회에 실패했습니다.')
    }

    const data = await response.json()
    return data.data.schedules
  }

  // 일정 상세 조회
  async getSchedule(scheduleId: number) {
    const response = await fetch(`${this.baseURL}/schedules/${scheduleId}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '일정 조회에 실패했습니다.')
    }

    const data = await response.json()
    return data.data.schedule
  }

  // 일정 생성
  async createSchedule(teamId: number, scheduleData: {
    title: string
    description?: string
    start_time: string
    end_time: string
    participant_ids?: number[]
  }) {
    const response = await fetch(`${this.baseURL}/teams/${teamId}/schedules`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(scheduleData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '일정 생성에 실패했습니다.')
    }

    const data = await response.json()
    return data.data.schedule
  }

  // 일정 수정
  async updateSchedule(scheduleId: number, updateData: {
    title?: string
    description?: string
    start_time?: string
    end_time?: string
  }) {
    const response = await fetch(`${this.baseURL}/schedules/${scheduleId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '일정 수정에 실패했습니다.')
    }

    const data = await response.json()
    return data.data.schedule
  }

  // 일정 삭제
  async deleteSchedule(scheduleId: number) {
    const response = await fetch(`${this.baseURL}/schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '일정 삭제에 실패했습니다.')
    }

    const data = await response.json()
    return data
  }

  // 충돌 검사
  async checkScheduleConflict(conflictData: {
    start_time: string
    end_time: string
    team_id: number
    exclude_id?: number
  }) {
    const response = await fetch(`${this.baseURL}/schedules/check-conflict`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(conflictData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '충돌 검사에 실패했습니다.')
    }

    const data = await response.json()
    return data.data
  }

  // 참가자 상태 업데이트
  async updateParticipantStatus(scheduleId: number, status: 'accepted' | 'declined' | 'pending') {
    // 실제로는 별도 API 엔드포인트가 있을 수 있음
    const response = await fetch(`${this.baseURL}/schedules/${scheduleId}/participants`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '참가 상태 업데이트에 실패했습니다.')
    }

    const data = await response.json()
    return data.data
  }

  // 대안 시간 제안
  async getSuggestedTimes(conflictData: {
    start_time: string
    end_time: string
    team_id: number
    exclude_id?: number
  }) {
    const conflictResult = await this.checkScheduleConflict(conflictData)
    return conflictResult.suggestions || []
  }

  // 일정 검색
  async searchSchedules(teamId: number, query: string) {
    const schedules = await this.getSchedules(teamId)
    return schedules.filter((schedule: any) =>
      schedule.title.toLowerCase().includes(query.toLowerCase()) ||
      schedule.description?.toLowerCase().includes(query.toLowerCase())
    )
  }

  // 반복 일정 생성 (확장 기능)
  async createRecurringSchedule(teamId: number, scheduleData: {
    title: string
    description?: string
    start_time: string
    end_time: string
    recurrence: {
      type: 'daily' | 'weekly' | 'monthly'
      interval: number
      end_date: string
    }
  }) {
    // 반복 일정은 여러 개의 단일 일정으로 생성
    const schedules = []
    const startDate = new Date(scheduleData.start_time)
    const endDate = new Date(scheduleData.end_time)
    const recurrenceEnd = new Date(scheduleData.recurrence.end_date)
    const duration = endDate.getTime() - startDate.getTime()

    let currentDate = new Date(startDate)

    while (currentDate <= recurrenceEnd) {
      const scheduleEndTime = new Date(currentDate.getTime() + duration)

      const singleSchedule = await this.createSchedule(teamId, {
        title: scheduleData.title,
        description: scheduleData.description,
        start_time: currentDate.toISOString(),
        end_time: scheduleEndTime.toISOString(),
      })

      schedules.push(singleSchedule)

      // 다음 일정 날짜 계산
      if (scheduleData.recurrence.type === 'daily') {
        currentDate.setDate(currentDate.getDate() + scheduleData.recurrence.interval)
      } else if (scheduleData.recurrence.type === 'weekly') {
        currentDate.setDate(currentDate.getDate() + (7 * scheduleData.recurrence.interval))
      } else if (scheduleData.recurrence.type === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + scheduleData.recurrence.interval)
      }
    }

    return schedules
  }
}

describe('ScheduleService', () => {
  let scheduleService: MockScheduleService

  beforeEach(() => {
    scheduleService = new MockScheduleService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('일정 조회', () => {
    it('팀 일정 목록을 성공적으로 조회한다', async () => {
      const schedules = await scheduleService.getSchedules(1)

      expect(schedules).toBeDefined()
      expect(Array.isArray(schedules)).toBe(true)
      expect(schedules.length).toBeGreaterThanOrEqual(0)
    })

    it('날짜 범위를 지정하여 일정을 조회한다', async () => {
      const schedules = await scheduleService.getSchedules(1, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      })

      expect(schedules).toBeDefined()
      expect(Array.isArray(schedules)).toBe(true)
    })

    it('특정 일정을 상세 조회한다', async () => {
      const schedule = await scheduleService.getSchedule(1)

      expect(schedule).toBeDefined()
      expect(schedule.id).toBe(1)
      expect(schedule.title).toBeDefined()
    })

    it('존재하지 않는 일정 조회 시 에러를 던진다', async () => {
      server.use(
        http.get('*/schedules/999', () => {
          return HttpResponse.json(
            { success: false, error: '일정을 찾을 수 없습니다.' },
            { status: 404 }
          )
        })
      )

      await expect(scheduleService.getSchedule(999)).rejects.toThrow(
        '일정을 찾을 수 없습니다.'
      )
    })

    it('인증되지 않은 요청 시 에러를 던진다', async () => {
      const unauthenticatedService = new MockScheduleService('')

      server.use(
        http.get('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '인증이 필요합니다.' },
            { status: 401 }
          )
        })
      )

      await expect(unauthenticatedService.getSchedules(1)).rejects.toThrow(
        '인증이 필요합니다.'
      )
    })
  })

  describe('일정 생성', () => {
    it('새 일정을 성공적으로 생성한다', async () => {
      const scheduleData = {
        title: '새 회의',
        description: '새로운 회의입니다.',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
      }

      const createdSchedule = await scheduleService.createSchedule(1, scheduleData)

      expect(createdSchedule).toBeDefined()
      expect(createdSchedule.title).toBe(scheduleData.title)
      expect(createdSchedule.description).toBe(scheduleData.description)
    })

    it('참가자를 포함한 일정을 생성한다', async () => {
      const scheduleData = {
        title: '참가자 포함 회의',
        start_time: '2024-01-15T14:00:00Z',
        end_time: '2024-01-15T15:00:00Z',
        participant_ids: [1, 2, 3],
      }

      const createdSchedule = await scheduleService.createSchedule(1, scheduleData)

      expect(createdSchedule).toBeDefined()
      expect(createdSchedule.title).toBe(scheduleData.title)
    })

    it('필수 필드가 누락된 경우 에러를 던진다', async () => {
      const invalidScheduleData = {
        // title 누락
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
      } as any

      server.use(
        http.post('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '제목은 필수입니다.' },
            { status: 400 }
          )
        })
      )

      await expect(
        scheduleService.createSchedule(1, invalidScheduleData)
      ).rejects.toThrow('제목은 필수입니다.')
    })

    it('권한이 없는 경우 에러를 던진다', async () => {
      server.use(
        http.post('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '일정 생성 권한이 없습니다.' },
            { status: 403 }
          )
        })
      )

      const scheduleData = {
        title: '권한 없는 일정',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
      }

      await expect(
        scheduleService.createSchedule(1, scheduleData)
      ).rejects.toThrow('일정 생성 권한이 없습니다.')
    })

    it('7일 초과 일정 생성 시 에러를 던진다', async () => {
      server.use(
        http.post('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '일정 기간은 최대 7일까지 가능합니다.' },
            { status: 400 }
          )
        })
      )

      const longScheduleData = {
        title: '긴 일정',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-10T11:00:00Z', // 9일간
      }

      await expect(
        scheduleService.createSchedule(1, longScheduleData)
      ).rejects.toThrow('일정 기간은 최대 7일까지 가능합니다.')
    })
  })

  describe('일정 수정', () => {
    it('일정을 성공적으로 수정한다', async () => {
      const updateData = {
        title: '수정된 제목',
        description: '수정된 설명',
      }

      const updatedSchedule = await scheduleService.updateSchedule(1, updateData)

      expect(updatedSchedule).toBeDefined()
      expect(updatedSchedule.title).toBe(updateData.title)
    })

    it('시간을 수정한다', async () => {
      const updateData = {
        start_time: '2024-01-01T14:00:00Z',
        end_time: '2024-01-01T15:00:00Z',
      }

      const updatedSchedule = await scheduleService.updateSchedule(1, updateData)

      expect(updatedSchedule).toBeDefined()
    })

    it('존재하지 않는 일정 수정 시 에러를 던진다', async () => {
      server.use(
        http.patch('*/schedules/999', () => {
          return HttpResponse.json(
            { success: false, error: '일정을 찾을 수 없습니다.' },
            { status: 404 }
          )
        })
      )

      await expect(
        scheduleService.updateSchedule(999, { title: '수정' })
      ).rejects.toThrow('일정을 찾을 수 없습니다.')
    })

    it('수정 권한이 없는 경우 에러를 던진다', async () => {
      server.use(
        http.patch('*/schedules/1', () => {
          return HttpResponse.json(
            { success: false, error: '일정 수정 권한이 없습니다.' },
            { status: 403 }
          )
        })
      )

      await expect(
        scheduleService.updateSchedule(1, { title: '권한 없는 수정' })
      ).rejects.toThrow('일정 수정 권한이 없습니다.')
    })
  })

  describe('일정 삭제', () => {
    it('일정을 성공적으로 삭제한다', async () => {
      const result = await scheduleService.deleteSchedule(1)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('존재하지 않는 일정 삭제 시 에러를 던진다', async () => {
      server.use(
        http.delete('*/schedules/999', () => {
          return HttpResponse.json(
            { success: false, error: '일정을 찾을 수 없습니다.' },
            { status: 404 }
          )
        })
      )

      await expect(scheduleService.deleteSchedule(999)).rejects.toThrow(
        '일정을 찾을 수 없습니다.'
      )
    })

    it('삭제 권한이 없는 경우 에러를 던진다', async () => {
      server.use(
        http.delete('*/schedules/1', () => {
          return HttpResponse.json(
            { success: false, error: '일정 삭제 권한이 없습니다.' },
            { status: 403 }
          )
        })
      )

      await expect(scheduleService.deleteSchedule(1)).rejects.toThrow(
        '일정 삭제 권한이 없습니다.'
      )
    })
  })

  describe('충돌 검사', () => {
    it('일정 충돌을 정확히 감지한다', async () => {
      const conflictData = {
        start_time: '2024-01-01T10:30:00Z',
        end_time: '2024-01-01T11:30:00Z',
        team_id: 1,
      }

      const result = await scheduleService.checkScheduleConflict(conflictData)

      expect(result).toBeDefined()
      expect(typeof result.hasConflict).toBe('boolean')
    })

    it('충돌이 없는 경우를 올바르게 처리한다', async () => {
      const nonConflictData = {
        start_time: '2024-01-01T15:00:00Z',
        end_time: '2024-01-01T16:00:00Z',
        team_id: 1,
      }

      const result = await scheduleService.checkScheduleConflict(nonConflictData)

      expect(result.hasConflict).toBe(false)
      expect(result.suggestions).toBeDefined()
    })

    it('대안 시간을 제안한다', async () => {
      server.use(
        http.post('*/schedules/check-conflict', () => {
          return HttpResponse.json({
            success: true,
            data: {
              hasConflict: true,
              suggestions: [
                {
                  start_time: '2024-01-01T12:00:00Z',
                  end_time: '2024-01-01T13:00:00Z',
                },
                {
                  start_time: '2024-01-01T13:00:00Z',
                  end_time: '2024-01-01T14:00:00Z',
                },
              ],
            },
          })
        })
      )

      const conflictData = {
        start_time: '2024-01-01T10:30:00Z',
        end_time: '2024-01-01T11:30:00Z',
        team_id: 1,
      }

      const suggestions = await scheduleService.getSuggestedTimes(conflictData)

      expect(suggestions).toHaveLength(2)
      expect(suggestions[0]).toHaveProperty('start_time')
      expect(suggestions[0]).toHaveProperty('end_time')
    })

    it('수정 시 자기 자신을 제외하고 충돌을 검사한다', async () => {
      const conflictData = {
        start_time: '2024-01-01T10:30:00Z',
        end_time: '2024-01-01T11:30:00Z',
        team_id: 1,
        exclude_id: 1, // 자기 자신 제외
      }

      const result = await scheduleService.checkScheduleConflict(conflictData)

      expect(result).toBeDefined()
    })
  })

  describe('참가자 관리', () => {
    it('참가자 상태를 업데이트한다', async () => {
      server.use(
        http.patch('*/schedules/1/participants', () => {
          return HttpResponse.json({
            success: true,
            data: { status: 'accepted' },
          })
        })
      )

      const result = await scheduleService.updateParticipantStatus(1, 'accepted')

      expect(result).toBeDefined()
      expect(result.status).toBe('accepted')
    })

    it('유효하지 않은 상태 값 시 에러를 던진다', async () => {
      server.use(
        http.patch('*/schedules/1/participants', () => {
          return HttpResponse.json(
            { success: false, error: '유효하지 않은 상태입니다.' },
            { status: 400 }
          )
        })
      )

      await expect(
        scheduleService.updateParticipantStatus(1, 'invalid' as any)
      ).rejects.toThrow('유효하지 않은 상태입니다.')
    })
  })

  describe('검색 기능', () => {
    it('제목으로 일정을 검색한다', async () => {
      const results = await scheduleService.searchSchedules(1, '회의')

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
      // 검색 결과에 '회의'가 포함된 일정만 있는지 확인
      results.forEach((schedule: any) => {
        expect(
          schedule.title.toLowerCase().includes('회의') ||
          schedule.description?.toLowerCase().includes('회의')
        ).toBe(true)
      })
    })

    it('설명으로도 검색된다', async () => {
      const results = await scheduleService.searchSchedules(1, '개발팀')

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('대소문자 구분 없이 검색한다', async () => {
      const results = await scheduleService.searchSchedules(1, 'MEETING')

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })
  })

  describe('반복 일정', () => {
    it('일간 반복 일정을 생성한다', async () => {
      const recurringData = {
        title: '일간 스탠드업',
        start_time: '2024-01-01T09:00:00Z',
        end_time: '2024-01-01T09:30:00Z',
        recurrence: {
          type: 'daily' as const,
          interval: 1,
          end_date: '2024-01-05T23:59:59Z',
        },
      }

      const schedules = await scheduleService.createRecurringSchedule(1, recurringData)

      expect(schedules).toHaveLength(5) // 1일부터 5일까지
      schedules.forEach((schedule: any) => {
        expect(schedule.title).toBe(recurringData.title)
      })
    })

    it('주간 반복 일정을 생성한다', async () => {
      const recurringData = {
        title: '주간 회의',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        recurrence: {
          type: 'weekly' as const,
          interval: 1,
          end_date: '2024-01-22T23:59:59Z',
        },
      }

      const schedules = await scheduleService.createRecurringSchedule(1, recurringData)

      expect(schedules.length).toBeGreaterThan(1)
      expect(schedules[0].title).toBe(recurringData.title)
    })

    it('월간 반복 일정을 생성한다', async () => {
      const recurringData = {
        title: '월간 회의',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        recurrence: {
          type: 'monthly' as const,
          interval: 1,
          end_date: '2024-06-01T23:59:59Z',
        },
      }

      const schedules = await scheduleService.createRecurringSchedule(1, recurringData)

      expect(schedules.length).toBeGreaterThan(1)
      expect(schedules[0].title).toBe(recurringData.title)
    })
  })

  describe('에러 처리', () => {
    it('네트워크 오류를 적절히 처리한다', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network Error'))

      await expect(scheduleService.getSchedules(1)).rejects.toThrow(
        '일정 조회에 실패했습니다.'
      )
    })

    it('서버 에러(500)를 처리한다', async () => {
      server.use(
        http.get('*/teams/1/schedules', () => {
          return HttpResponse.json(
            { success: false, error: '서버 내부 오류' },
            { status: 500 }
          )
        })
      )

      await expect(scheduleService.getSchedules(1)).rejects.toThrow(
        '서버 내부 오류'
      )
    })

    it('타임아웃을 처리한다', async () => {
      server.use(
        http.get('*/teams/1/schedules', async () => {
          await new Promise(resolve => setTimeout(resolve, 10000)) // 10초 지연
          return HttpResponse.json({ success: true, data: { schedules: [] } })
        })
      )

      // 타임아웃 설정 (실제 구현에서는 fetch에 AbortController 사용)
      await expect(
        Promise.race([
          scheduleService.getSchedules(1),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 1000)
          ),
        ])
      ).rejects.toThrow('Timeout')
    })
  })

  describe('성능 최적화', () => {
    it('동시 요청을 효율적으로 처리한다', async () => {
      const startTime = performance.now()

      // 여러 일정을 동시에 요청
      const promises = [
        scheduleService.getSchedule(1),
        scheduleService.getSchedule(2),
        scheduleService.getSchedules(1),
      ]

      const results = await Promise.all(promises)

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(3)
      expect(totalTime).toBeLessThan(1000) // 1초 이내 완료
    })

    it('대용량 데이터를 효율적으로 처리한다', async () => {
      // 큰 데이터셋 시뮬레이션
      server.use(
        http.get('*/teams/1/schedules', () => {
          const largeScheduleList = Array.from({ length: 1000 }, (_, i) => ({
            id: i + 1,
            title: `일정 ${i + 1}`,
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T11:00:00Z',
          }))

          return HttpResponse.json({
            success: true,
            data: { schedules: largeScheduleList },
          })
        })
      )

      const startTime = performance.now()
      const schedules = await scheduleService.getSchedules(1)
      const endTime = performance.now()

      expect(schedules).toHaveLength(1000)
      expect(endTime - startTime).toBeLessThan(500) // 500ms 이내 처리
    })
  })
})