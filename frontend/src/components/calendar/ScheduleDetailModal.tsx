import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, User, Edit, Trash2, MessageSquare } from 'lucide-react'

interface Schedule {
  id: number
  title: string
  content?: string
  start_time?: string
  end_time?: string
  start_datetime?: string
  end_datetime?: string
  schedule_type?: string
  creator_name?: string
  team_name?: string
  participants?: Array<{
    id: number
    user_id: number
    status: string
    user_name?: string
    user_email?: string
  }>
  participant_count?: number
}

interface ScheduleDetailModalProps {
  open: boolean
  onClose: () => void
  schedule: Schedule | null
  onEdit?: () => void
  onDelete?: () => void
  onRequestChange?: (schedule: Schedule) => void
  canEdit?: boolean
  isLeader?: boolean
}

export function ScheduleDetailModal({
  open,
  onClose,
  schedule,
  onEdit,
  onDelete,
  onRequestChange,
  canEdit = false,
  isLeader = false,
}: ScheduleDetailModalProps) {
  if (!schedule) return null

  const startTime = schedule.start_datetime || schedule.start_time
  const endTime = schedule.end_datetime || schedule.end_time

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDuration = () => {
    if (!startTime || !endTime) return ''
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const minutes = diffMins % 60
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      confirmed: { label: '참가', variant: 'default' },
      pending: { label: '대기', variant: 'secondary' },
      declined: { label: '거절', variant: 'outline' },
    }
    const config = statusMap[status] || { label: status, variant: 'secondary' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const handleEdit = () => {
    onEdit?.()
    onClose()
  }

  const handleDelete = () => {
    if (window.confirm('일정을 삭제하시겠습니까?')) {
      onDelete?.()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5" />
            {schedule.title}
          </DialogTitle>
          <DialogDescription>
            일정 상세 정보를 확인하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 일정 설명 */}
          {schedule.content && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {schedule.content}
              </p>
            </div>
          )}

          {/* 일정 시간 정보 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">시작:</span>
              <span>{startTime && formatDateTime(startTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">종료:</span>
              <span>{endTime && formatDateTime(endTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">소요 시간:</span>
              <span>{getDuration()}</span>
            </div>
          </div>

          {/* 생성자 정보 */}
          {schedule.creator_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">생성자:</span>
              <span>{schedule.creator_name}</span>
            </div>
          )}

          {/* 팀 정보 */}
          {schedule.team_name && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="font-medium">팀:</span>
              <span>{schedule.team_name}</span>
            </div>
          )}

          {/* 참가자 목록 */}
          {schedule.participants && schedule.participants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">
                  참가자 ({schedule.participants.length}명)
                </span>
              </div>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {schedule.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {participant.user_name || '이름 없음'}
                        </span>
                        {participant.user_email && (
                          <span className="text-xs text-gray-500">
                            {participant.user_email}
                          </span>
                        )}
                      </div>
                      {getStatusBadge(participant.status)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {/* 팀원은 일정 변경 요청 버튼만 표시 */}
          {!isLeader && onRequestChange && (
            <Button
              variant="outline"
              onClick={() => {
                onRequestChange(schedule)
                onClose()
              }}
              className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <MessageSquare className="w-4 h-4" />
              일정 변경 요청
            </Button>
          )}

          {/* 팀장은 수정/삭제 버튼 표시 */}
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex items-center gap-1"
              >
                <Edit className="w-4 h-4" />
                수정
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}