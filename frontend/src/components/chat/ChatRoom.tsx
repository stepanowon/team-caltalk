import React, { useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat-store'
import { useTeamStore } from '@/stores/team-store'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ConnectionStatus from './ConnectionStatus'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MessageCircle, Users } from 'lucide-react'

interface ChatRoomProps {
  className?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function ChatRoom({ className }: ChatRoomProps) {
  const {
    currentDate,
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
    reset,
  } = useChatStore()

  const { currentTeam } = useTeamStore()
  const abortControllerRef = useRef<AbortController | null>(null)

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
        ...options.headers,
      },
      signal: abortControllerRef.current?.signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }, [])

  // 메시지 가져오기
  const fetchMessages = useCallback(async () => {
    if (!currentTeam) {
      setMessages([])
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
      }>(`/messages?teamId=${currentTeam.id}&date=${currentDate}`)

      if (response.success && response.data?.messages) {
        setMessages(response.data.messages)

        // 최신 메시지 ID 업데이트
        const latestMessage = response.data.messages[response.data.messages.length - 1]
        if (latestMessage) {
          setLastMessageId(latestMessage.id)
        }

        setConnected(true)
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || '메시지를 불러오는데 실패했습니다.')
        setConnected(false)
      }
    } finally {
      setLoading(false)
    }
  }, [currentTeam, currentDate, apiCall, setMessages, setLastMessageId, setConnected, setLoading, setError])

  // Long Polling으로 새 메시지 확인
  const pollNewMessages = useCallback(async () => {
    if (!currentTeam || !lastMessageId) return

    try {
      setReconnecting(true)

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
      }>(`/messages/poll?teamId=${currentTeam.id}&date=${currentDate}&after=${lastMessageId}`)

      if (response.success && response.data?.messages) {
        response.data.messages.forEach(message => {
          addMessage(message)
        })

        // 최신 메시지 ID 업데이트
        if (response.data.messages.length > 0) {
          const latestMessage = response.data.messages[response.data.messages.length - 1]
          setLastMessageId(latestMessage.id)
        }
      }

      setConnected(true)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Polling error:', err.message)
        setConnected(false)
      }
    } finally {
      setReconnecting(false)
    }
  }, [currentTeam, currentDate, lastMessageId, apiCall, addMessage, setLastMessageId, setConnected, setReconnecting])

  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    if (!currentTeam || !content.trim()) return

    setError(null)

    try {
      const response = await apiCall<{
        success: boolean
        data: {
          message: {
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
          }
        }
      }>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          teamId: currentTeam.id,
          content: content.trim(),
          messageDate: currentDate,
        }),
      })

      if (response.success && response.data?.message) {
        addMessage(response.data.message)
        setLastMessageId(response.data.message.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 전송에 실패했습니다.')
      throw err
    }
  }, [currentTeam, currentDate, apiCall, addMessage, setLastMessageId, setError])

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    if (currentTeam) {
      // 새 AbortController 생성
      abortControllerRef.current = new AbortController()

      fetchMessages()

      return () => {
        // 컴포넌트 언마운트 시 요청 취소
        abortControllerRef.current?.abort()
      }
    } else {
      reset()
    }
  }, [currentTeam, fetchMessages, reset])

  // Long Polling 설정
  useEffect(() => {
    if (!currentTeam || !connectionStatus.isConnected) return

    const interval = setInterval(() => {
      pollNewMessages()
    }, 3000) // 3초마다 폴링

    setPollingInterval(interval)

    return () => {
      clearInterval(interval)
      setPollingInterval(null)
    }
  }, [currentTeam, connectionStatus.isConnected, pollNewMessages, setPollingInterval])

  // 날짜 변경 시 메시지 새로고침
  useEffect(() => {
    if (currentTeam) {
      fetchMessages()
    }
  }, [currentDate, fetchMessages])

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
          <h3 className="text-lg font-medium text-gray-900 mb-2">팀을 선택해주세요</h3>
          <p className="text-gray-500">채팅을 시작하려면 먼저 팀을 선택해야 합니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {currentTeam.name} 채팅
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            {new Date(currentDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
        <ConnectionStatus />
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* 메시지 목록 */}
        <div className="flex-1 min-h-0">
          <MessageList />
        </div>

        {/* 메시지 입력 */}
        <div className="flex-shrink-0 border-t p-4">
          <MessageInput onSendMessage={sendMessage} disabled={!connectionStatus.isConnected} />
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