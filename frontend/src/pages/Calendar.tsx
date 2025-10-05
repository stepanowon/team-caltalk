import React, { useState, useEffect, useMemo } from 'react'
import { logger } from '@/utils/logger'

type View = 'month' | 'week' | 'day' | 'agenda';
import { useTeamStore } from '@/stores/team-store'
import { useAuthStore } from '@/stores/authStore'
import { useSchedules } from '@/hooks/useSchedules'
import { useSendScheduleRequest } from '@/hooks/useChat'
import BigCalendar from '@/components/calendar/BigCalendar'
import ChatRoom from '@/components/chat/ChatRoom'
import { ScheduleModal } from '@/components/calendar/ScheduleModal'
import { ScheduleDetailModal } from '@/components/calendar/ScheduleDetailModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Users,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { TeamService } from '@/services/team-service'
import { getKoreanDateISO } from '@/utils/dateUtils'

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

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  resource: Schedule
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentView, setCurrentView] = useState<View>('month')

  // Dialog state for schedule change request
  const [changeRequestDialogOpen, setChangeRequestDialogOpen] = useState(false)
  const [changeRequestMessage, setChangeRequestMessage] = useState('')
  const [selectedScheduleForChange, setSelectedScheduleForChange] =
    useState<Schedule | null>(null)

  const { user, token } = useAuthStore()
  const { currentTeam, teamMembers, setTeamMembers } = useTeamStore()
  const {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch,
  } = useSchedules()

  const { toast } = useToast()

  // 일정 변경 요청 mutation
  const sendScheduleRequestMutation = useSendScheduleRequest()

  // Convert schedules to BigCalendar event format
  const events: CalendarEvent[] = useMemo(() => {
    if (!Array.isArray(schedules)) return []
    return schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      start: new Date(schedule.start_time),
      end: new Date(schedule.end_time),
      resource: schedule,
    }))
  }, [schedules])

  // Load team members when currentTeam changes
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!currentTeam || !token) return

      try {
        const response = await TeamService.getTeamMembers(currentTeam.id, token)
        logger.log('Calendar - Team Members Response:', response)
        if (response.success && response.data?.members) {
          logger.log('Calendar - Team Members Data:', response.data.members)
          setTeamMembers(response.data.members)
        }
      } catch (error) {
        logger.error('Failed to load team members:', error)
      }
    }

    loadTeamMembers()
  }, [currentTeam, token, setTeamMembers])

  // Auto-refresh schedules every 30 seconds
  useEffect(() => {
    if (!currentTeam) return

    const interval = setInterval(() => {
      refetch()
    }, 30000) // 30초마다 새로고침

    return () => clearInterval(interval)
  }, [currentTeam, refetch])

  // Check if current user can edit schedules (team leader)
  const canEditSchedules = React.useMemo(() => {
    if (!user || !currentTeam) return false
    const currentMember = teamMembers.find((member) => member.user_id === user.id)
    return currentMember?.role === 'leader'
  }, [user, currentTeam, teamMembers])

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedSchedule(event.resource)
    setIsDetailModalOpen(true)
  }

  const handleSelectSlot = (slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    if (canEditSchedules) {
      setSelectedDate(slotInfo.start)
      setEditingSchedule(null)
      setIsScheduleModalOpen(true)
    }
  }

  const handleNavigate = (date: Date) => {
    setCurrentDate(date)
  }

  const handleScheduleEdit = (schedule?: Schedule) => {
    const scheduleToEdit = schedule || selectedSchedule
    if (scheduleToEdit) {
      setEditingSchedule(scheduleToEdit)
      setIsScheduleModalOpen(true)
      setIsDetailModalOpen(false)
    }
  }

  const handleScheduleDelete = async (scheduleId?: number) => {
    const idToDelete = scheduleId || selectedSchedule?.id
    if (!idToDelete) return

    try {
      await deleteSchedule(idToDelete)
      if (selectedSchedule?.id === idToDelete) {
        setSelectedSchedule(null)
      }
      setIsDetailModalOpen(false)
      toast({
        title: '삭제 완료',
        description: '일정이 삭제되었습니다.',
      })
    } catch (error) {
      logger.error('Delete schedule failed:', error)
      toast({
        title: '오류',
        description: '일정 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateSchedule = () => {
    setEditingSchedule(null)
    setSelectedDate(new Date())
    setIsScheduleModalOpen(true)
  }

  const handleScheduleModalClose = () => {
    setIsScheduleModalOpen(false)
    setEditingSchedule(null)
    setSelectedDate(null)
  }

  const handleScheduleSubmit = async (data: {
    title: string
    content?: string
    startDatetime: string
    endDatetime: string
    scheduleType: 'personal' | 'team'
    participantIds?: number[]
  }) => {
    try {
      if (editingSchedule) {
        await updateSchedule({ ...data, id: editingSchedule.id })
        toast({
          title: '수정 완료',
          description: '일정이 수정되었습니다.',
        })
      } else {
        await createSchedule(data)
        toast({
          title: '생성 완료',
          description: '일정이 생성되었습니다.',
        })
      }
      await refetch()
    } catch (error) {
      logger.error('Schedule submit failed:', error)
      toast({
        title: '오류',
        description: '일정 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  // 일정 변경 요청 핸들러 - Dialog 열기
  const handleRequestChange = (schedule: Schedule) => {
    setSelectedScheduleForChange(schedule)
    setChangeRequestDialogOpen(true)
  }

  // Dialog에서 일정 변경 요청 전송
  const handleSubmitChangeRequest = async () => {
    if (changeRequestMessage && currentTeam && selectedScheduleForChange) {
      try {
        await sendScheduleRequestMutation.mutateAsync({
          teamId: currentTeam.id,
          scheduleId: selectedScheduleForChange.id,
          content: changeRequestMessage,
          targetDate: new Date(selectedScheduleForChange.start_time)
            .toISOString()
            .split('T')[0],
        })
        toast({
          title: '요청 완료',
          description: '일정 변경 요청이 전송되었습니다.',
        })
        setChangeRequestDialogOpen(false)
        setChangeRequestMessage('')
        setSelectedScheduleForChange(null)
      } catch (error) {
        logger.error('Schedule change request error:', error)
        toast({
          title: '오류',
          description:
            error instanceof Error
              ? error.message
              : '일정 변경 요청 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    }
  }

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
              <Button variant="outline" onClick={() => (window.location.href = '/teams')}>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
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
        <div
          className={`flex flex-col bg-white transition-all duration-300 ${
            isChatOpen ? 'hidden md:flex md:flex-[7]' : 'flex-1 md:flex-[7]'
          }`}
        >
          {error && (
            <Alert className="m-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex-1 p-4 overflow-hidden">
            <BigCalendar
              events={events}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              onNavigate={handleNavigate}
              defaultView={currentView}
              views={['month', 'week', 'day']}
              teamMembers={teamMembers}
            />
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div
          className={`flex flex-col bg-white transition-all duration-300 ${
            isChatOpen
              ? 'absolute inset-0 z-20 md:relative md:flex-[3] md:border-l md:border-gray-200'
              : 'hidden md:flex md:flex-[3] md:border-l md:border-gray-200'
          }`}
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">팀 채팅</h3>
              {selectedDate && (
                <span className="text-sm text-gray-500">
                  -{' '}
                  {selectedDate.toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
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
              selectedDate={getKoreanDateISO(selectedDate || currentDate)}
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
            <span className="text-blue-600">
              📅 보기 모드: {currentView === 'month' ? '월' : currentView === 'week' ? '주' : '일'}
            </span>
          </div>
          <div className="text-blue-600">
            {new Date().toLocaleDateString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        open={isScheduleModalOpen}
        onClose={handleScheduleModalClose}
        onSubmit={handleScheduleSubmit}
        initialData={editingSchedule}
        selectedDate={selectedDate}
      />

      {/* Schedule Detail Modal */}
      <ScheduleDetailModal
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        schedule={selectedSchedule}
        onEdit={() => handleScheduleEdit()}
        onDelete={() => handleScheduleDelete()}
        onRequestChange={handleRequestChange}
        canEdit={canEditSchedules}
        isLeader={canEditSchedules}
      />

      {/* Schedule Change Request Dialog */}
      <Dialog open={changeRequestDialogOpen} onOpenChange={setChangeRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>일정 변경 요청</DialogTitle>
            <DialogDescription>일정 변경이 필요한 사유를 입력해주세요.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              value={changeRequestMessage}
              onChange={(e) => setChangeRequestMessage(e.target.value)}
              placeholder="변경 사유를 입력하세요..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRequestDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmitChangeRequest}
              disabled={!changeRequestMessage.trim()}
            >
              요청 전송
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
