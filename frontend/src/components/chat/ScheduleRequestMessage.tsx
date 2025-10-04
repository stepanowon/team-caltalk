import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, Check, X, AlertCircle } from 'lucide-react'

interface ScheduleRequestMessageProps {
  message: {
    id: number
    content: string
    sender_name: string
    sent_at: string
    message_type: 'schedule_request' | 'schedule_approved' | 'schedule_rejected'
    related_schedule_id?: number
    related_schedule_title?: string
  }
  isLeader: boolean
  onApprove?: (messageId: number, scheduleId: number) => void
  onReject?: (messageId: number, scheduleId: number) => void
}

export function ScheduleRequestMessage({
  message,
  isLeader,
  onApprove,
  onReject,
}: ScheduleRequestMessageProps) {
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMessageConfig = () => {
    switch (message.message_type) {
      case 'schedule_request':
        return {
          icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
          title: '일정 변경 요청',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          badge: (
            <Badge
              variant="outline"
              className="bg-orange-100 text-orange-800 border-orange-300"
            >
              요청
            </Badge>
          ),
        }
      case 'schedule_approved':
        return {
          icon: <Check className="w-5 h-5 text-green-600" />,
          title: '일정 변경 승인',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badge: (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-800 border-green-300"
            >
              승인됨
            </Badge>
          ),
        }
      case 'schedule_rejected':
        return {
          icon: <X className="w-5 h-5 text-red-600" />,
          title: '일정 변경 거절',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badge: (
            <Badge
              variant="outline"
              className="bg-red-100 text-red-800 border-red-300"
            >
              거절됨
            </Badge>
          ),
        }
    }
  }

  const config = getMessageConfig()

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2 mb-3`}>
      <div className="p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {config.icon}
            <h3 className="font-semibold text-sm">{config.title}</h3>
            {config.badge}
          </div>
          <span className="text-xs text-gray-500">
            {formatTime(message.sent_at)}
          </span>
        </div>

        {/* 관련 일정 정보 */}
        {message.related_schedule_title && (
          <div className="flex items-center gap-2 mb-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="font-medium">
              {message.related_schedule_title}
            </span>
          </div>
        )}

        {/* 요청자 정보 */}
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>{message.sender_name}</span>
        </div>

        {/* 요청 내용 */}
        <div className="bg-white rounded p-3 text-sm mb-3">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* 승인/거절 버튼 (팀장이고 요청 상태일 때만) */}
        {isLeader &&
          message.message_type === 'schedule_request' &&
          message.related_schedule_id && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() =>
                  onApprove?.(message.id, message.related_schedule_id!)
                }
              >
                <Check className="w-4 h-4 mr-1" />
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() =>
                  onReject?.(message.id, message.related_schedule_id!)
                }
              >
                <X className="w-4 h-4 mr-1" />
                거절
              </Button>
            </div>
          )}
      </div>
    </Card>
  )
}
