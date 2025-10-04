import React, { useState } from 'react'
import { useTeamStore } from '@/stores/team-store'
import { ChatRoom } from '@/components/chat/ChatRoom'
import { Button } from '@/components/ui/button'
import { MessageSquare, X } from 'lucide-react'
import { getKoreanDate, getKoreanDateISO } from '@/utils/dateUtils'

interface SimpleChatToggleProps {
  className?: string
}

export function SimpleChatToggle({ className }: SimpleChatToggleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { currentTeam } = useTeamStore()
  const currentDate = getKoreanDateISO()

  if (!currentTeam) {
    return null
  }

  return (
    <>
      {/* 채팅 토글 버튼 */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg ${className}`}
        size="lg"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </Button>

      {/* 채팅 오버레이 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* 채팅 패널 */}
          <div className="fixed bottom-20 right-4 w-96 h-96 bg-white rounded-lg shadow-xl z-50 flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-sm">
                  {currentTeam.name} 채팅
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* 채팅 내용 */}
            <div className="flex-1">
              <ChatRoom
                teamId={currentTeam.id}
                selectedDate={currentDate}
                className="h-full rounded-none border-0 shadow-none"
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
