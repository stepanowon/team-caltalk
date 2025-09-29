import React, { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chat-store'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface MessageListProps {
  className?: string
}

export default function MessageList({ className }: MessageListProps) {
  const { messages, isLoading } = useChatStore()
  const { user } = useAuthStore()
  const scrollRef = useRef<HTMLDivElement>(null)


  // 새 메시지가 있을 때 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (isLoading && messages.length === 0) {
    return (
      <div className={cn('flex-1 flex items-center justify-center p-8', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">메시지를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={cn('flex-1 flex items-center justify-center p-8', className)}>
        <div className="text-center">
          <div className="text-gray-400 mb-4">💬</div>
          <p className="text-gray-500 mb-2">아직 메시지가 없습니다</p>
          <p className="text-sm text-gray-400">첫 번째 메시지를 보내보세요!</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto p-4 space-y-4 max-h-full', className)}
    >
      {messages.map((message, index) => {
        const isOwn = message.user_id === user?.id
        const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id
        const showTime = index === messages.length - 1 ||
          messages[index + 1].user_id !== message.user_id ||
          new Date(message.created_at).getTime() - new Date(messages[index + 1]?.created_at || 0).getTime() > 300000 // 5분 이상 차이

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
                  <AvatarFallback className={cn(
                    'text-xs font-medium',
                    isOwn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  )}>
                    {message.user.full_name?.charAt(0) || message.user.username?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>

            {/* 메시지 영역 */}
            <div className={cn('flex-1 max-w-[70%]', isOwn ? 'text-right' : 'text-left')}>
              {/* 사용자 이름 */}
              {showAvatar && !isOwn && (
                <div className="mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {message.user.full_name || message.user.username}
                  </span>
                </div>
              )}

              {/* 메시지 내용 */}
              <div
                className={cn(
                  'inline-block px-3 py-2 rounded-lg text-sm max-w-full break-words',
                  isOwn
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                )}
              >
                {message.content}
              </div>

              {/* 시간 표시 */}
              {showTime && (
                <div className={cn('mt-1 text-xs text-gray-500', isOwn ? 'text-right' : 'text-left')}>
                  {new Date(message.created_at).toLocaleTimeString('ko-KR', {
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
  )
}