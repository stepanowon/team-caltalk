import React, { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat-store'
import { useTeamStore } from '@/stores/team-store'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ConnectionStatus from './ConnectionStatus'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Calendar, MessageCircle, Users } from 'lucide-react'
import { getKoreanDateISO } from '@/utils/dateUtils'
import { useMessages, useSendMessage } from '@/hooks/useChat'

interface ChatRoomProps {
  teamId: number
  selectedDate: string
  className?: string
}

export default function ChatRoom({ teamId, selectedDate, className }: ChatRoomProps) {
  const { setMessages, setConnected, setLoading, setError, reset } = useChatStore()
  const { teams } = useTeamStore()

  const teamIdNum = typeof teamId === 'string' ? parseInt(teamId) : teamId
  const currentTeamById = teams.find(team => team.id === teamIdNum)
  const currentTeamByString = teams.find(team => team.id == teamId)
  const currentTeamByStringStrict = teams.find(team => String(team.id) === String(teamId))
  const currentTeam = currentTeamById || currentTeamByString || currentTeamByStringStrict

  // 오늘 날짜인지 확인
  const isToday = getKoreanDateISO() === selectedDate

  // 메시지 조회
  const {
    data: messagesData,
    isLoading,
    error: messagesError,
    isError,
  } = useMessages(teamId, selectedDate, !!teamId)

  // 메시지 전송
  const sendMessageMutation = useSendMessage(teamId)

  // 메시지 데이터를 Zustand store에 동기화
  useEffect(() => {
    if (messagesData?.success && messagesData.data?.messages) {
      const sortedMessages = messagesData.data.messages.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setMessages(sortedMessages)
      setConnected(true)
      setLoading(false)
      setError(null)
    } else if (isError) {
      setMessages([])
      setConnected(false)
      setLoading(false)
      setError(messagesError instanceof Error ? messagesError.message : '메시지를 불러오는데 실패했습니다.')
    }
  }, [messagesData, isError, messagesError, setMessages, setConnected, setLoading, setError])

  // 로딩 상태 동기화
  useEffect(() => {
    setLoading(isLoading)
  }, [isLoading, setLoading])

  // 컴포넌트 언마운트 시 초기화
  useEffect(() => {
    return () => {
      if (!teamId) {
        reset()
      }
    }
  }, [teamId, reset])

  // 메시지 전송 핸들러
  const handleSendMessage = async (content: string) => {
    if (!teamId || !content.trim()) {
      return
    }

    try {
      await sendMessageMutation.mutateAsync({
        content: content.trim(),
        targetDate: selectedDate,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : '메시지 전송에 실패했습니다.')
      throw error
    }
  }

  if (!currentTeam) {
    return (
      <Card className={cn('h-full flex items-center justify-center', className)}>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">팀을 찾을 수 없습니다</h3>
          <p className="text-gray-500">선택된 팀 정보를 확인할 수 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0 border-b py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('ko-KR', {
                timeZone: 'Asia/Seoul',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* 메시지 목록 */}
        <div className="flex-1 min-h-0">
          <MessageList />
        </div>

        {/* 메시지 입력 */}
        <div className="flex-shrink-0 border-t p-4">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={!isToday || sendMessageMutation.isPending}
          />
          {!isToday && (
            <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>오늘 날짜만 메시지를 작성할 수 있습니다.</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* 에러 표시 */}
      {messagesError && (
        <div className="flex-shrink-0 bg-red-50 border-t border-red-200 p-3">
          <p className="text-sm text-red-700">
            {messagesError instanceof Error ? messagesError.message : '오류가 발생했습니다.'}
          </p>
        </div>
      )}
    </Card>
  )
}
