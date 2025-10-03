import React, { useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat-store'
import { useTeamStore } from '@/stores/team-store'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ConnectionStatus from './ConnectionStatus'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MessageCircle, Users } from 'lucide-react'
import { getKoreanDateISO } from '@/utils/dateUtils'

interface ChatRoomProps {
  teamId: number
  selectedDate: string
  className?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export default function ChatRoom({ teamId, selectedDate, className }: ChatRoomProps) {

  const {
    messages,
    connectionStatus,
    isLoading,
    error,
    lastMessageId,
    pollingInterval,
    setMessages,
    addMessage,
    setConnected,
    setReconnecting,
    setLoading,
    setError,
    setPollingInterval,
    setLastMessageId,
    setCurrentDate,
    reset,
  } = useChatStore()

  const { teams } = useTeamStore()
  const teamIdNum = typeof teamId === 'string' ? parseInt(teamId) : teamId

  // 팀 찾기 로직을 여러 방법으로 시도
  const currentTeamById = teams.find(team => team.id === teamIdNum)
  const currentTeamByString = teams.find(team => team.id == teamId) // == 비교
  const currentTeamByStringStrict = teams.find(team => String(team.id) === String(teamId))

  // 최종 선택
  const currentTeam = currentTeamById || currentTeamByString || currentTeamByStringStrict


  const abortControllerRef = useRef<AbortController | null>(null)

  // 오늘 날짜인지 확인
  const isToday = getKoreanDateISO() === selectedDate

  // API 호출 헬퍼
  const apiCall = useCallback(async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const token = localStorage.getItem('access_token')

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options.headers,
      },
      cache: 'no-store',
      // AbortController 임시 비활성화
      // signal: abortControllerRef.current?.signal,
    })


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  }, [])

  // 메시지 가져오기
  const fetchMessages = useCallback(async () => {

    // currentTeam이 없어도 teamId가 있으면 메시지 조회 시도
    if (!teamId) {
      setMessages([])
      setConnected(false)
      return
    }
    setLoading(true)
    setError(null)

    try {

      const response = await apiCall<{
        success: boolean
        data: {
          messages: Array<{
            id: number
            team_id: number
            user_id: number
            content: string
            message_date: string
            created_at: string
            updated_at: string
            user: {
              id: number
              username: string
              full_name: string
            }
          }>
        }
      }>(`/chat/teams/${teamId}/messages?targetDate=${selectedDate}`)


      if (response.success && response.data?.messages) {
        // 시간순 정렬된 메시지로 처리 (폴링과 동일한 로직)
        const sortedMessages = response.data.messages.sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )

        // Zustand store에 메시지 설정
        setMessages(sortedMessages)

        // 최신 메시지 ID 업데이트 (정렬된 메시지에서)
        const latestMessage = sortedMessages[sortedMessages.length - 1]
        if (latestMessage) {
          setLastMessageId(latestMessage.id)
        }
      } else {
        // response.data에 직접 messages가 있는지 확인
        if (response.success && response.data && Array.isArray(response.data.messages)) {
          const sortedMessages = response.data.messages.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          setMessages(sortedMessages)

          const latestMessage = sortedMessages[sortedMessages.length - 1]
          if (latestMessage) {
            setLastMessageId(latestMessage.id)
          }
        } else {
          setMessages([])
        }
      }

      // 응답을 받으면 항상 연결됨으로 설정
      setConnected(true)
    } catch (err) {
      if (err instanceof Error) {
        if (err.name !== 'AbortError') {
          setError(err.message || '메시지를 불러오는데 실패했습니다.')
          setConnected(false)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [currentTeam, selectedDate, apiCall, setMessages, setLastMessageId, setConnected, setLoading, setError])


  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    // currentTeam이 없어도 teamId가 있으면 메시지 전송 시도
    if (!teamId || !content.trim()) {
      return
    }

    setError(null)

    try {
      const token = localStorage.getItem('access_token')
      const requestUrl = `${API_BASE_URL}/chat/teams/${teamId}/messages`
      const requestBody = {
        content: content.trim(),
        targetDate: selectedDate,
      }


      // 메시지 전송용 별도 fetch 호출 (AbortController 없이)
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })


      if (!response.ok) {
        const errorText = await response.text()

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data?.message) {
        addMessage(result.data.message)
        setLastMessageId(result.data.message.id)

        // 메시지 전송 후 즉시 새로고침으로 다른 클라이언트 업데이트 트리거
        setTimeout(() => {
          fetchMessages()
        }, 100)
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || '메시지 전송에 실패했습니다.')
        throw err
      }
      // AbortError는 무시 (컴포넌트 언마운트 시 정상적인 동작)
    }
  }, [currentTeam, selectedDate, teamId, addMessage, setLastMessageId, setError, fetchMessages])


  // 컴포넌트 마운트 시 초기 데이터 로드 - 단순화
  useEffect(() => {
    if (teamId && selectedDate) {
      // 새 AbortController 생성
      abortControllerRef.current = new AbortController()

      // 초기 메시지 로드 - 단순 호출
      fetchMessages()

      return () => {
        abortControllerRef.current?.abort()
      }
    } else {
      reset()
    }
  }, [teamId, selectedDate])

  // 30초 간격 폴링 설정 (초기 로드와 별도)
  useEffect(() => {
    if (!teamId) {
      return
    }

    // 30초마다 메시지 새로고침하는 interval 시작
    const intervalId = setInterval(async () => {
      try {
        await fetchMessages()
        setConnected(true)
      } catch (err) {
        setConnected(false)
      }
    }, 30000) // 30초 간격

    // Store에 interval ID 저장
    setPollingInterval(intervalId)

    return () => {
      clearInterval(intervalId)
      setPollingInterval(null)
    }
  }, [teamId, fetchMessages, setConnected, setPollingInterval])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 폴링 정리
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      // 요청 취소
      abortControllerRef.current?.abort()
    }
  }, [pollingInterval])

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
          <MessageInput onSendMessage={sendMessage} disabled={!isToday} />
          {!isToday && (
            <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>오늘 날짜만 메시지를 작성할 수 있습니다.</span>
            </div>
          )}
          {/* 디버깅: 연결 상태 표시 */}
          <div className="text-xs text-gray-500 mt-1">
            연결 상태: {connectionStatus.isConnected ? '연결됨' : '연결 안됨'} |
            팀: {currentTeam?.name || '없음'} |
            날짜: {selectedDate}
          </div>
        </div>
      </CardContent>

      {/* 에러 표시 */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-t border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </Card>
  )
}