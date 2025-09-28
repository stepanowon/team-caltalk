/**
 * 캘린더 페이지 (임시 구현)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar as CalendarIcon, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useTeamStore } from '@/stores/team-store'
import { ROUTES } from '@/utils/constants'

export function Calendar() {
  const navigate = useNavigate()
  const { currentTeam } = useTeamStore()

  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              캘린더를 사용하려면 팀을 선택해주세요
            </h1>
            <Button onClick={() => navigate(ROUTES.TEAMS)}>
              팀 선택하기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로 돌아가기
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentTeam.name} 캘린더
              </h1>
              <p className="text-gray-600">
                팀 일정을 확인하고 관리하세요
              </p>
            </div>

            <div className="flex items-center gap-2 text-blue-600">
              <CalendarIcon className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* 임시 캘린더 콘텐츠 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              캘린더 (구현 예정)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-16">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                캘린더 기능 개발 중
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                팀 일정 관리 기능이 곧 추가될 예정입니다.
                현재는 팀 관리 기능을 먼저 사용해보세요.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate(ROUTES.TEAMS)}
                  variant="outline"
                >
                  팀 관리
                </Button>
                <Button
                  onClick={() => navigate(ROUTES.DASHBOARD)}
                >
                  대시보드
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}