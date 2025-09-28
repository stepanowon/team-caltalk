import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Clock, Users, MoreHorizontal } from 'lucide-react'

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

interface ScheduleCardProps {
  schedule: Schedule
  className?: string
  onClick?: (schedule: Schedule) => void
  onEdit?: (schedule: Schedule) => void
  onDelete?: (scheduleId: number) => void
  canEdit?: boolean
  variant?: 'default' | 'compact' | 'mini'
}

export function ScheduleCard({
  schedule,
  className,
  onClick,
  onEdit,
  onDelete,
  canEdit = false,
  variant = 'default',
}: ScheduleCardProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const formatDuration = () => {
    const start = new Date(schedule.start_time)
    const end = new Date(schedule.end_time)
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    if (duration < 60) {
      return `${duration}분`
    }

    const hours = Math.floor(duration / 60)
    const minutes = duration % 60
    return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`
  }

  const getStatusColor = () => {
    const acceptedCount = schedule.participants.filter(p => p.status === 'accepted').length
    const totalCount = schedule.participant_count

    if (acceptedCount === totalCount) return 'bg-green-100 border-green-200'
    if (acceptedCount > 0) return 'bg-yellow-100 border-yellow-200'
    return 'bg-gray-100 border-gray-200'
  }

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(schedule)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(schedule)
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('일정을 삭제하시겠습니까?')) {
      onDelete?.(schedule.id)
    }
  }

  if (variant === 'mini') {
    return (
      <div
        className={cn(
          'p-1 px-2 text-xs rounded cursor-pointer hover:opacity-80 transition-opacity',
          getStatusColor(),
          className
        )}
        onClick={handleCardClick}
        title={`${schedule.title} (${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)})`}
      >
        <div className="font-medium truncate">{schedule.title}</div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card
        className={cn(
          'cursor-pointer hover:shadow-md transition-shadow',
          getStatusColor(),
          className
        )}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{schedule.title}</h4>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                <Clock className="w-3 h-3" />
                <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                <Users className="w-3 h-3 ml-1" />
                <span>{schedule.participant_count}명</span>
              </div>
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={handleEditClick}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow group',
        getStatusColor(),
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-2 truncate">{schedule.title}</h3>

            {schedule.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {schedule.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
              </div>

              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{schedule.participant_count}명</span>
              </div>

              <Badge variant="secondary" className="text-xs">
                {formatDuration()}
              </Badge>
            </div>

            {schedule.participants.length > 0 && (
              <div className="mt-3 flex gap-1">
                {['accepted', 'pending', 'declined'].map(status => {
                  const count = schedule.participants.filter(p => p.status === status).length
                  if (count === 0) return null

                  const statusConfig = {
                    accepted: { label: '참석', color: 'bg-green-500' },
                    pending: { label: '대기', color: 'bg-yellow-500' },
                    declined: { label: '불참', color: 'bg-red-500' },
                  }[status as keyof typeof statusConfig]

                  return (
                    <Badge
                      key={status}
                      variant="outline"
                      className="text-xs"
                    >
                      <div className={cn('w-2 h-2 rounded-full mr-1', statusConfig.color)} />
                      {statusConfig.label} {count}
                    </Badge>
                  )
                })}
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditClick}
                className="text-xs"
              >
                수정
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteClick}
                className="text-xs text-red-600 hover:text-red-700"
              >
                삭제
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ScheduleCard