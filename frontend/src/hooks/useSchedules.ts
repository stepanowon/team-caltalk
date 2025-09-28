import { useState, useEffect, useMemo } from 'react'
import { useTeamStore } from '@/stores/team-store'
import type { Schedule, ScheduleParticipant, ApiResponse } from '@/types'

interface CreateScheduleRequest {
  title: string
  description?: string
  start_time: string
  end_time: string
  participant_ids?: number[]
}

interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {
  id: number
}

interface ScheduleWithParticipants extends Schedule {
  participants: ScheduleParticipant[]
  participant_count: number
}

interface UseSchedulesReturn {
  schedules: ScheduleWithParticipants[]
  loading: boolean
  error: string | null

  // CRUD operations
  createSchedule: (data: CreateScheduleRequest) => Promise<void>
  updateSchedule: (data: UpdateScheduleRequest) => Promise<void>
  deleteSchedule: (scheduleId: number) => Promise<void>

  // Filter and utility functions
  getSchedulesForDate: (date: string) => ScheduleWithParticipants[]
  getSchedulesForDateRange: (startDate: string, endDate: string) => ScheduleWithParticipants[]

  // Refresh data
  refetch: () => Promise<void>
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export function useSchedules(): UseSchedulesReturn {
  const [schedules, setSchedules] = useState<ScheduleWithParticipants[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentTeam } = useTeamStore()

  // Helper function for API calls
  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data: ApiResponse<T> = await response.json()
    if (!data.success) {
      throw new Error(data.message || data.error || 'API call failed')
    }

    return data.data!
  }

  // Fetch schedules for current team
  const fetchSchedules = async () => {
    if (!currentTeam) {
      setSchedules([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await apiCall<ScheduleWithParticipants[]>(
        `/schedules?teamId=${currentTeam.id}`
      )
      setSchedules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정을 불러오는데 실패했습니다.')
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  // Create new schedule
  const createSchedule = async (data: CreateScheduleRequest) => {
    if (!currentTeam) {
      throw new Error('팀이 선택되지 않았습니다.')
    }

    setLoading(true)
    setError(null)

    try {
      const newSchedule = await apiCall<ScheduleWithParticipants>(
        `/schedules`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...data,
            teamId: currentTeam.id,
          }),
        }
      )

      setSchedules(prev => [...prev, newSchedule])
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 생성에 실패했습니다.')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update existing schedule
  const updateSchedule = async (data: UpdateScheduleRequest) => {
    if (!currentTeam) {
      throw new Error('팀이 선택되지 않았습니다.')
    }

    setLoading(true)
    setError(null)

    try {
      const updatedSchedule = await apiCall<ScheduleWithParticipants>(
        `/schedules/${data.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        }
      )

      setSchedules(prev =>
        prev.map(schedule =>
          schedule.id === data.id ? updatedSchedule : schedule
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 수정에 실패했습니다.')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Delete schedule
  const deleteSchedule = async (scheduleId: number) => {
    if (!currentTeam) {
      throw new Error('팀이 선택되지 않았습니다.')
    }

    setLoading(true)
    setError(null)

    try {
      await apiCall(`/schedules/${scheduleId}`, {
        method: 'DELETE',
      })

      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId))
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 삭제에 실패했습니다.')
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Get schedules for specific date
  const getSchedulesForDate = useMemo(() => {
    return (date: string) => {
      const targetDate = new Date(date).toDateString()
      return schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.start_time).toDateString()
        return scheduleDate === targetDate
      })
    }
  }, [schedules])

  // Get schedules for date range
  const getSchedulesForDateRange = useMemo(() => {
    return (startDate: string, endDate: string) => {
      const start = new Date(startDate)
      const end = new Date(endDate)

      return schedules.filter(schedule => {
        const scheduleStart = new Date(schedule.start_time)
        const scheduleEnd = new Date(schedule.end_time)

        // Check if schedule overlaps with the date range
        return scheduleStart <= end && scheduleEnd >= start
      })
    }
  }, [schedules])

  // Fetch schedules when team changes
  useEffect(() => {
    fetchSchedules()
  }, [currentTeam])

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getSchedulesForDate,
    getSchedulesForDateRange,
    refetch: fetchSchedules,
  }
}