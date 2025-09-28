import React, { useState } from 'react'
import { useTeamStore } from '@/stores/team-store'
import { useAuthStore } from '@/stores/authStore'
import { useSchedules } from '@/hooks/useSchedules'
import CalendarHeader from '@/components/calendar/CalendarHeader'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import ScheduleCard from '@/components/calendar/ScheduleCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar as CalendarIcon, Users } from 'lucide-react'

interface Schedule {
  id: number
  title: string
  description?: string
  start_time: string
  end_time: string
  participants: Array<{
    id: number
    user_id: number
    status: 'pending' | 'accepted' | 'declined'
  }>
  participant_count: number
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)

  const { user } = useAuthStore()
  const { currentTeam, teamMembers } = useTeamStore()
  const {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getSchedulesForDate,
    refetch,
  } = useSchedules()

  // Check if current user can edit schedules (team leader)
  const canEditSchedules = React.useMemo(() => {
    if (!user || !currentTeam) return false
    const currentMember = teamMembers.find(member => member.user_id === user.id)
    return currentMember?.role === 'leader'
  }, [user, currentTeam, teamMembers])

  const handleTodayClick = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedSchedule(null)
  }

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setSelectedDate(new Date(schedule.start_time))
  }

  const handleScheduleEdit = (schedule: Schedule) => {
    // TODO: Open schedule edit modal
    console.log('Edit schedule:', schedule)
  }

  const handleScheduleDelete = async (scheduleId: number) => {
    try {
      await deleteSchedule(scheduleId)
      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule(null)
      }
    } catch (error) {
      console.error('Delete schedule failed:', error)
    }
  }

  const handleCreateSchedule = () => {
    // TODO: Open schedule create modal
    console.log('Create schedule for date:', selectedDate || currentDate)
  }

  const selectedDateSchedules = selectedDate ? getSchedulesForDate(selectedDate.toISOString()) : []

  // Show team selection message if no team is selected
  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>팀을 선택해주세요</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              캘린더를 사용하려면 먼저 팀을 선택해야 합니다.
            </p>
            <div className="text-center">
              <Button variant="outline" onClick={() => window.location.href = '/teams'}>
                팀 관리로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col">
        <CalendarHeader
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onTodayClick={handleTodayClick}
          onCreateSchedule={canEditSchedules ? handleCreateSchedule : undefined}
          onRefresh={refetch}
          scheduleCount={Array.isArray(schedules) ? schedules.length : 0}
          loading={loading}
          canCreateSchedule={canEditSchedules}
        />

        {error && (
          <Alert className="m-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 p-4">
          <CalendarGrid
            currentDate={currentDate}
            schedules={schedules}
            onDateClick={handleDateClick}
            onScheduleClick={handleScheduleClick}
            onScheduleEdit={canEditSchedules ? handleScheduleEdit : undefined}
            onScheduleDelete={canEditSchedules ? handleScheduleDelete : undefined}
            canEditSchedules={canEditSchedules}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Team Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{currentTeam.name}</h3>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {teamMembers.length}
            </Badge>
          </div>
          {currentTeam.description && (
            <p className="text-sm text-gray-600">{currentTeam.description}</p>
          )}
        </div>

        {/* Selected Date Info */}
        {selectedDate && (
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-medium mb-3">
              {selectedDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </h4>

            {selectedDateSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">이 날짜에 일정이 없습니다</p>
                {canEditSchedules && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleCreateSchedule}
                  >
                    일정 추가
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateSchedules.map(schedule => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    variant="compact"
                    onClick={handleScheduleClick}
                    onEdit={canEditSchedules ? handleScheduleEdit : undefined}
                    onDelete={canEditSchedules ? handleScheduleDelete : undefined}
                    canEdit={canEditSchedules}
                    className={
                      selectedSchedule?.id === schedule.id
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Schedule Detail */}
        {selectedSchedule && (
          <div className="flex-1 p-4">
            <h4 className="font-medium mb-3">일정 상세</h4>
            <ScheduleCard
              schedule={selectedSchedule}
              onEdit={canEditSchedules ? handleScheduleEdit : undefined}
              onDelete={canEditSchedules ? handleScheduleDelete : undefined}
              canEdit={canEditSchedules}
            />
          </div>
        )}

        {/* Quick Stats */}
        {!selectedDate && !selectedSchedule && (
          <div className="flex-1 p-4">
            <h4 className="font-medium mb-3">이번 달 통계</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">전체 일정</span>
                <Badge variant="outline">{Array.isArray(schedules) ? schedules.length : 0}개</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">내가 참여하는 일정</span>
                <Badge variant="outline">
                  {Array.isArray(schedules) ? schedules.filter(s =>
                    s.participants?.some(p => p.user_id === user?.id)
                  ).length : 0}개
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">대기 중인 일정</span>
                <Badge variant="outline">
                  {Array.isArray(schedules) ? schedules.filter(s =>
                    s.participants?.some(p =>
                      p.user_id === user?.id && p.status === 'pending'
                    )
                  ).length : 0}개
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}