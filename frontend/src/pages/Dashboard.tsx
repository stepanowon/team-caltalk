import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Users,
  Plus,
  UserPlus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  ExternalLink,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useAuthStore } from '@/stores/authStore'
import { useTeamStore, type Team } from '@/stores/team-store'
import { ROUTES } from '@/utils/constants'

interface Activity {
  id: string
  type: string
  icon: string
  title: string
  description: string
  actor: string
  teamName: string
  timestamp: string
  metadata: any
}

export function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, token } = useAuthStore()
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()

  const [message, setMessage] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // 페이지 로드 시 메시지 표시 (팀 생성/참여 완료 시)
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message)

      // 3초 후 메시지 제거
      const timer = setTimeout(() => {
        setMessage(null)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [location.state])

  // 활동 내역 조회
  useEffect(() => {
    const fetchActivities = async () => {
      if (!token) return

      try {
        setLoadingActivities(true)
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
        const response = await fetch(
          currentTeam
            ? `${API_BASE_URL}/activities?teamId=${currentTeam.id}&limit=5`
            : `${API_BASE_URL}/activities?limit=5`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setActivities(data.data.activities || [])
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoadingActivities(false)
      }
    }

    fetchActivities()
  }, [currentTeam, token])

  // 팀 선택 핸들러
  const handleSelectTeam = (team: Team) => {
    setCurrentTeam(team)
  }

  // 현재 시간 정보
  const now = new Date()
  const currentDate = format(now, 'yyyy년 MM월 dd일 EEEE', { locale: ko })
  const currentTime = format(now, 'HH:mm')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                안녕하세요, {user?.name}님! 👋
              </h1>
              <p className="text-gray-600">
                오늘은 {currentDate}이고, 현재 시각은 {currentTime}입니다
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">현재 시각</p>
              <p className="text-2xl font-semibold text-blue-600">
                {currentTime}
              </p>
            </div>
          </div>
        </div>

        {/* 성공 메시지 */}
        {message && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* 현재 선택된 팀 섹션 */}
        {currentTeam ? (
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl">{currentTeam.name}</h2>
                    <p className="text-sm text-gray-600 font-normal">
                      현재 활성 팀
                    </p>
                  </div>
                  <Badge variant="default" className="ml-auto">
                    활성
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 mb-4">
                      {currentTeam.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      팀 ID: {currentTeam.id} • 생성일:{' '}
                      {format(new Date(currentTeam.created_at), 'yyyy.MM.dd', {
                        locale: ko,
                      })}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate(ROUTES.CALENDAR)}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      캘린더 보기
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(ROUTES.TEAMS)}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />팀 관리
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mb-8">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                팀을 선택하지 않았습니다. 팀을 선택하거나 새로운 팀을
                생성해보세요.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* 주요 액션 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 팀 관리 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />팀 관리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                참여 중인 팀을 확인하고 관리하세요
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => navigate(ROUTES.TEAMS)}
                  className="w-full flex items-center gap-2"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4" />내 팀 목록
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(ROUTES.TEAMS_CREATE)}
                    className="flex-1 flex items-center gap-2"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />팀 생성
                  </Button>
                  <Button
                    onClick={() => navigate(ROUTES.TEAMS_JOIN)}
                    variant="outline"
                    className="flex-1 flex items-center gap-2"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4" />팀 참여
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 캘린더 */}
          <Card
            className={`hover:shadow-lg transition-shadow ${!currentTeam ? 'opacity-50' : ''}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                캘린더
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                팀 일정을 확인하고 관리하세요
              </p>
              <Button
                onClick={() => currentTeam && navigate(ROUTES.CALENDAR)}
                className="w-full flex items-center gap-2"
                disabled={!currentTeam}
              >
                <Calendar className="h-4 w-4" />
                캘린더 열기
              </Button>
              {!currentTeam && (
                <p className="text-xs text-gray-500 mt-2">
                  * 팀을 선택해야 이용할 수 있습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* 최근 활동 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex gap-2 text-sm">
                      <span className="text-lg">{activity.icon}</span>
                      <div className="flex-1">
                        <p className="text-gray-900">
                          <span className="font-medium">{activity.description}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.teamName} • {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ko })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 활동 내역이 없습니다</p>
                  <p>• 팀에 참여하여 활동을 시작해보세요</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 팀 목록 (간단한 버전) */}
        {teams.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              내 팀 ({teams.length}개)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.slice(0, 6).map((team) => (
                <Card
                  key={team.id}
                  className={`cursor-pointer transition-all ${
                    currentTeam && currentTeam.id === team.id
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleSelectTeam(team)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{team.name}</h3>
                      {currentTeam && currentTeam.id === team.id && (
                        <Badge variant="default" className="text-xs">
                          선택됨
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {team.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {teams.length > 6 && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(ROUTES.TEAMS)}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  모든 팀 보기 ({teams.length}개)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-medium text-blue-900 mb-3">
              🎯 Team CalTalk 사용법
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                1. <strong>팀 생성 또는 참여</strong>: 새로운 팀을 만들거나 기존
                팀에 참여하세요
              </p>
              <p>
                2. <strong>팀 선택</strong>: 대시보드에서 작업할 팀을 선택하세요
              </p>
              <p>
                3. <strong>캘린더 사용</strong>: 팀 일정을 확인하고 관리하세요
              </p>
              <p>
                4. <strong>실시간 소통</strong>: 팀원들과 채팅으로 소통하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
