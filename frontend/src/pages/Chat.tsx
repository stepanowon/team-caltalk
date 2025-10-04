import React from 'react'
import { useTeamStore } from '@/stores/team-store'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Calendar } from 'lucide-react'
import { getKoreanDate, getKoreanDateISO } from '@/utils/dateUtils'

export function Chat() {
  const { currentTeam } = useTeamStore()
  const currentDate = getKoreanDateISO()

  if (!currentTeam) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-96">
          <CardHeader className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>팀을 선택해주세요</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              채팅을 사용하려면 먼저 팀을 선택해야 합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-1 max-w-4xl mx-auto w-full p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">팀 채팅</h1>
          <span className="text-gray-500">- {currentTeam.name}</span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-blue-700">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">오늘 날짜의 채팅</span>
          </div>
          <p className="text-blue-600 text-sm mt-1">
            {new Date().toLocaleDateString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>

        <ChatRoom
          teamId={currentTeam.id}
          selectedDate={currentDate}
          className="h-[calc(100vh-200px)]"
        />
      </div>
    </div>
  )
}

export default Chat
