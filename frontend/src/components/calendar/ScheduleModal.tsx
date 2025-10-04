import React, { useState, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { useTeamStore } from '@/stores/team-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Users, AlertCircle } from 'lucide-react'

interface Schedule {
  id: number
  title: string
  description?: string
  content?: string
  start_time: string
  end_time: string
  participant_ids?: number[]
  participants?: Array<{
    id: number
    user_id: number
    status: string
  }>
}

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    content?: string
    startDatetime: string
    endDatetime: string
    scheduleType: 'personal' | 'team'
    participantIds?: number[]
  }) => Promise<void>
  initialData?: Schedule | null
  selectedDate?: Date | null
}

export function ScheduleModal({
  open,
  onClose,
  onSubmit,
  initialData,
  selectedDate,
}: ScheduleModalProps) {
  const { teamMembers } = useTeamStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debug: Log team members when modal opens
  useEffect(() => {
    if (open) {
      logger.log('ScheduleModal - teamMembers:', teamMembers)
      logger.log('ScheduleModal - teamMembers.length:', teamMembers.length)
    }
  }, [open, teamMembers])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([])
  const [originalDuration, setOriginalDuration] = useState<number | null>(null)

  // Initialize form with initial data or selected date
  useEffect(() => {
    if (initialData) {
      // Edit mode
      setTitle(initialData.title)
      setDescription(initialData.content || initialData.description || '')

      const start = new Date(initialData.start_time)
      const end = new Date(initialData.end_time)

      setStartDate(start.toISOString().split('T')[0])
      setStartTime(start.toTimeString().slice(0, 5))
      setEndDate(end.toISOString().split('T')[0])
      setEndTime(end.toTimeString().slice(0, 5))

      // Calculate and store original duration in milliseconds
      const duration = end.getTime() - start.getTime()
      setOriginalDuration(duration)

      // Set participants from either participant_ids or participants array
      if (initialData.participant_ids) {
        setSelectedParticipants(initialData.participant_ids)
      } else if (initialData.participants) {
        const participantIds = initialData.participants.map((p) =>
          Number(p.user_id)
        )
        setSelectedParticipants(participantIds)
      } else {
        setSelectedParticipants([])
      }
    } else if (selectedDate) {
      // Create mode with selected date
      const dateStr = selectedDate.toISOString().split('T')[0]
      setStartDate(dateStr)
      setEndDate(dateStr)
      setStartTime('09:00')
      setEndTime('10:00')
      setOriginalDuration(null)
    } else {
      // Create mode without selected date
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]
      setStartDate(dateStr)
      setEndDate(dateStr)
      setStartTime('09:00')
      setEndTime('10:00')
      setOriginalDuration(null)
    }
  }, [initialData, selectedDate, open])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setError(null)
      setSelectedParticipants([])
    }
  }, [open])

  const handleParticipantToggle = (userId: number) => {
    const numericUserId = Number(userId)
    setSelectedParticipants((prev) =>
      prev.includes(numericUserId)
        ? prev.filter((id) => id !== numericUserId)
        : [...prev, numericUserId]
    )
  }

  // Handle start date change and adjust end date proportionally
  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate)

    // If there's an original duration, adjust the end date/time
    if (originalDuration !== null) {
      const newStart = new Date(`${newStartDate}T${startTime}`)
      const newEnd = new Date(newStart.getTime() + originalDuration)

      setEndDate(newEnd.toISOString().split('T')[0])
      setEndTime(newEnd.toTimeString().slice(0, 5))
    }
  }

  // Handle start time change and adjust end time proportionally
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime)

    // If there's an original duration, adjust the end date/time
    if (originalDuration !== null) {
      const newStart = new Date(`${startDate}T${newStartTime}`)
      const newEnd = new Date(newStart.getTime() + originalDuration)

      setEndDate(newEnd.toISOString().split('T')[0])
      setEndTime(newEnd.toTimeString().slice(0, 5))
    }
  }

  const validateForm = (): string | null => {
    if (!title.trim()) {
      return '일정 제목을 입력해주세요.'
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      return '시작 및 종료 날짜/시간을 모두 입력해주세요.'
    }

    const start = new Date(`${startDate}T${startTime}`)
    const end = new Date(`${endDate}T${endTime}`)

    if (start >= end) {
      return '종료 시간은 시작 시간보다 나중이어야 합니다.'
    }

    // Check if schedule duration is more than 7 days
    const durationInDays =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    if (durationInDays > 7) {
      return '일정 기간은 최대 7일까지 가능합니다.'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const startDatetime = new Date(`${startDate}T${startTime}`).toISOString()
      const endDatetime = new Date(`${endDate}T${endTime}`).toISOString()

      logger.log('ScheduleModal - selectedParticipants:', selectedParticipants)
      logger.log(
        'ScheduleModal - selectedParticipants type:',
        selectedParticipants.map((p) => typeof p)
      )

      await onSubmit({
        title: title.trim(),
        content: description.trim() || undefined,
        startDatetime,
        endDatetime,
        scheduleType: 'team',
        participantIds:
          selectedParticipants.length > 0 ? selectedParticipants : undefined,
      } as any)

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '일정 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {initialData ? '일정 수정' : '새 일정 추가'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? '일정 정보를 수정하세요'
              : '새로운 일정을 추가하세요'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">일정 제목 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="일정 제목을 입력하세요"
                maxLength={100}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="일정에 대한 설명을 입력하세요 (선택사항)"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Start Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  시작 날짜 *
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  시작 시간 *
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  종료 날짜 *
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  종료 시간 *
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                참가자 선택 (선택사항)
              </Label>
              {teamMembers.length > 0 ? (
                <>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                    <div className="space-y-2">
                      {teamMembers.map((member: any) => {
                        const userId = Number(member.user_id)
                        return (
                          <label
                            key={userId}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedParticipants.includes(userId)}
                              onChange={() => handleParticipantToggle(userId)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">
                              {member.name || member.user?.name || '이름 없음'}
                              {member.role === 'leader' && (
                                <span className="ml-1 text-xs text-blue-600">
                                  (팀장)
                                </span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    선택된 참가자: {selectedParticipants.length}명
                  </p>
                </>
              ) : (
                <div className="border rounded-md p-3 text-center text-sm text-gray-500">
                  팀원 정보를 불러오는 중입니다...
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : initialData ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
