import React, { useState, useEffect } from 'react'
import { useTeamStore } from '@/stores/team-store'
import { useAuthStore } from '@/stores/authStore'
import { useSchedules } from '@/hooks/useSchedules'
import CalendarHeader from '@/components/calendar/CalendarHeader'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import ScheduleCard from '@/components/calendar/ScheduleCard'
import ChatRoom from '@/components/chat/ChatRoom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Calendar as CalendarIcon, Users, MessageSquare } from 'lucide-react'
import { TeamService } from '@/services/team-service'

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
  const [isChatOpen, setIsChatOpen] = useState(false)

  const { user, token } = useAuthStore()
  const { currentTeam, teamMembers, setTeamMembers } = useTeamStore()
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

  // Load team members when currentTeam changes
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!currentTeam || !token) return

      try {
        const response = await TeamService.getTeamMembers(currentTeam.id, token)
        if (response.success && response.data?.members) {
          setTeamMembers(response.data.members)
        }
      } catch (error) {
        console.error('Failed to load team members:', error)
      }
    }

    loadTeamMembers()
  }, [currentTeam, token, setTeamMembers])

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
    <div className="h-[94vh] flex flex-col bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Team CalTalk</h1>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">|</span>
              <h2 className="font-semibold">{currentTeam.name}</h2>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {teamMembers.length}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleTodayClick}>
              오늘로 이동
            </Button>
            {canEditSchedules && (
              <Button size="sm" onClick={handleCreateSchedule}>
                + 새 일정
              </Button>
            )}
            {/* 모바일 채팅 토글 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="md:hidden"
            >
              <MessageSquare className="h-4 w-4" />
              채팅
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Responsive Layout */}
      <div className="flex-1 flex overflow-hidden pb-12 relative">
        {/* Left Side - Calendar Area */}
        <div className={`flex flex-col bg-white transition-all duration-300 ${
          isChatOpen ? 'hidden md:flex md:flex-[7]' : 'flex-1 md:flex-[7]'
        }`}>
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

          <div className="flex-1 p-4 overflow-auto">
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

        {/* Right Side - Chat Area */}
        <div className={`flex flex-col bg-white transition-all duration-300 ${
          isChatOpen
            ? 'absolute inset-0 z-20 md:relative md:flex-[3] md:border-l md:border-gray-200'
            : 'hidden md:flex md:flex-[3] md:border-l md:border-gray-200'
        }`}>
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">팀 채팅</h3>
              {selectedDate && (
                <span className="text-sm text-gray-500">
                  - {selectedDate.toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>팀원 {teamMembers.length}명</span>
              </div>
              {/* 모바일 닫기 버튼 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
                className="md:hidden"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <ChatRoom
              teamId={currentTeam.id}
              selectedDate={(selectedDate || currentDate).toISOString().split('T')[0]}
              className="flex-1 border-0 shadow-none rounded-none"
            />
          </div>
        </div>

        {/* 모바일 오버레이 */}
        {isChatOpen && (
          <div
            className="absolute inset-0 bg-black bg-opacity-50 z-10 md:hidden"
            onClick={() => setIsChatOpen(false)}
          />
        )}
      </div>

      {/* Bottom Status Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-50 border-t border-blue-200 px-4 py-2 z-10">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-blue-700">
              📋 이번 달 일정: {Array.isArray(schedules) ? schedules.length : 0}개
            </span>
            {selectedDate && (
              <span className="text-blue-600">
                📅 선택된 날짜: {selectedDate.toLocaleDateString('ko-KR')}
              </span>
            )}
          </div>
          <div className="text-blue-600">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </div>
        </div>
      </div>
    </div>
  )
}