import React, { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/authStore'
import { useTeamStore } from '@/stores/team-store'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScheduleRequestMessage } from './ScheduleRequestMessage'
import {
  useScheduleRequests,
  useApproveRequest,
  useRejectRequest,
  useAcknowledgeResponse,
} from '@/hooks/useChat'

interface MessageListProps {
  className?: string
}

export default function MessageList({ className }: MessageListProps) {
  const { messages, isLoading } = useChatStore()
  const { user } = useAuthStore()
  const { currentTeam } = useTeamStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  const isLeader = currentTeam?.role === 'leader'

  // 일정 변경 요청 조회
  const { data: requestsData, isLoading: loadingRequests } =
    useScheduleRequests(currentTeam?.id || null, !!currentTeam?.id)

  const scheduleRequests = requestsData?.data?.requests || []

  // Mutations
  const approveRequestMutation = useApproveRequest(currentTeam?.id || null)
  const rejectRequestMutation = useRejectRequest(currentTeam?.id || null)
  const acknowledgeResponseMutation = useAcknowledgeResponse(
    currentTeam?.id || null,
    new Date().toISOString().split('T')[0]
  )

  // 승인 핸들러
  const handleApproveRequest = async (
    messageId: number,
    scheduleId: number
  ) => {
    try {
      await approveRequestMutation.mutateAsync(messageId)
      alert('일정 변경 요청이 승인되었습니다.')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : '요청 승인 중 오류가 발생했습니다.'
      )
    }
  }

  // 거절 핸들러
  const handleRejectRequest = async (messageId: number, scheduleId: number) => {
    try {
      await rejectRequestMutation.mutateAsync(messageId)
      alert('일정 변경 요청이 거절되었습니다.')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : '요청 거절 중 오류가 발생했습니다.'
      )
    }
  }

  // 확인 핸들러
  const handleAcknowledgeResponse = async (messageId: number) => {
    try {
      await acknowledgeResponseMutation.mutateAsync(messageId)
      window.location.reload()
    } catch (error) {
      alert(
        error instanceof Error ? error.message : '확인 중 오류가 발생했습니다.'
      )
    }
  }

  // 새 메시지가 있을 때 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (isLoading && messages.length === 0) {
    return (
      <div
        className={cn('flex-1 flex items-center justify-center p-8', className)}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">메시지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // 일반 메시지 필터링 (일정 요청 메시지 제외)
  const normalMessages = messages.filter(
    (msg) =>
      !['schedule_request', 'schedule_approved', 'schedule_rejected'].includes(
        msg.message_type
      )
  )

  if (normalMessages.length === 0 && scheduleRequests.length === 0) {
    return (
      <div
        className={cn('flex-1 flex items-center justify-center p-4', className)}
      >
        <div className="text-center">
          <div className="text-gray-400 mb-4">💬</div>
          <p className="text-gray-500 mb-2">아직 메시지가 없습니다</p>
          <p className="text-sm text-gray-400">첫 번째 메시지를 보내보세요!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex-1 flex flex-col max-h-full', className)}>
      {/* 일정 변경 요청 고정 섹션 - 팀장만 표시 */}
      {isLeader && scheduleRequests.length > 0 && (
        <div className="border-b border-gray-200 bg-orange-50 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className="bg-orange-100 text-orange-800 border-orange-300"
            >
              대기 중인 요청 {scheduleRequests.length}건
            </Badge>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scheduleRequests.map((request) => (
              <ScheduleRequestMessage
                key={request.id}
                message={{
                  id: request.id,
                  content: request.content,
                  sender_name: request.sender_name,
                  sent_at: request.sent_at,
                  message_type: 'schedule_request',
                  related_schedule_id: request.related_schedule_id,
                  related_schedule_title: request.related_schedule_title,
                }}
                isLeader={isLeader}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* 일반 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {normalMessages.map((message, index) => {
          const isOwn = message.user_id === user?.id
          const showAvatar =
            index === 0 || normalMessages[index - 1].user_id !== message.user_id
          const showTime =
            index === normalMessages.length - 1 ||
            normalMessages[index + 1].user_id !== message.user_id ||
            new Date(message.created_at).getTime() -
              new Date(normalMessages[index + 1]?.created_at || 0).getTime() >
              300000 // 5분 이상 차이

          const isResponseMessage = [
            'schedule_approved',
            'schedule_rejected',
          ].includes(message.message_type)

          const processingRequests =
            approveRequestMutation.isPending ||
            rejectRequestMutation.isPending ||
            acknowledgeResponseMutation.isPending

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                isOwn ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* 아바타 영역 */}
              <div className="flex-shrink-0">
                {showAvatar ? (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      className={cn(
                        'text-xs font-medium',
                        isOwn
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {message.user.name?.charAt(0) ||
                        message.user.username?.charAt(0) ||
                        '?'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8 h-8" />
                )}
              </div>

              {/* 메시지 영역 */}
              <div
                className={cn(
                  'flex-1 max-w-[70%]',
                  isOwn ? 'text-right' : 'text-left'
                )}
              >
                {/* 사용자 이름 */}
                {showAvatar && !isOwn && (
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {message.user.name || message.user.username}
                    </span>
                  </div>
                )}

                {/* 메시지 내용 */}
                <div
                  className={cn(
                    'inline-block px-3 py-2 rounded-lg text-sm max-w-full break-words',
                    isResponseMessage
                      ? message.message_type === 'schedule_approved'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                      : isOwn
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  )}
                >
                  {message.content}
                  {isResponseMessage && !isOwn && (
                    <button
                      onClick={() => handleAcknowledgeResponse(message.id)}
                      disabled={processingRequests}
                      className={cn(
                        'ml-2 px-2 py-1 text-xs rounded',
                        message.message_type === 'schedule_approved'
                          ? 'bg-green-200 hover:bg-green-300 text-green-900'
                          : 'bg-red-200 hover:bg-red-300 text-red-900',
                        processingRequests && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {processingRequests ? '처리 중...' : '확인'}
                    </button>
                  )}
                </div>

                {/* 시간 표시 */}
                {showTime && (
                  <div
                    className={cn(
                      'mt-1 text-xs text-gray-500',
                      isOwn ? 'text-right' : 'text-left'
                    )}
                  >
                    {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
