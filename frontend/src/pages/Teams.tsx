/**
 * 팀 목록 페이지
 */

import { useState, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Users,
  Plus,
  UserPlus,
  Calendar,
  Settings,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Crown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'

import { TeamService } from '@/services/team-service'
import { useTeamStore, type Team } from '@/stores/team-store'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

interface TeamWithMembers extends Team {
  memberCount?: number
  userRole?: 'leader' | 'member'
}

export function Teams() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const {
    teams,
    setTeams,
    setCurrentTeam,
    isLoading,
    setLoading,
    error,
    setError,
  } = useTeamStore()

  const { toast } = useToast()
  const [teamsData, setTeamsData] = useState<TeamWithMembers[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 팀 목록 로드
  const loadTeams = async (showLoading = true) => {
    if (!token) {
      setError('로그인이 필요합니다.')
      return
    }

    if (showLoading) setLoading(true)
    setError(null)

    try {
      const response = await TeamService.getTeams(token)

      if (response.success && response.data?.teams) {
        const teamsWithMembers: TeamWithMembers[] = []

        // 각 팀의 멤버 정보 로드
        for (const team of response.data.teams) {
          try {
            const membersResponse = await TeamService.getTeamMembers(
              team.id,
              token
            )

            if (membersResponse.success && membersResponse.data?.members) {
              const members = membersResponse.data.members
              const userMember = members.find((m) => m.user_id === user?.id)

              teamsWithMembers.push({
                ...team,
                memberCount: members.length,
                userRole: userMember?.role || 'member',
              })
            } else {
              teamsWithMembers.push({
                ...team,
                memberCount: 0,
                userRole: 'member',
              })
            }
          } catch (error) {
            logger.error(`팀 ${team.id} 멤버 로드 실패:`, error)
            teamsWithMembers.push({
              ...team,
              memberCount: 0,
              userRole: 'member',
            })
          }
        }

        setTeams(response.data.teams)
        setTeamsData(teamsWithMembers)
      } else {
        setError(response.error || '팀 목록을 불러올 수 없습니다.')
      }
    } catch (error: any) {
      logger.error('팀 목록 로드 오류:', error)
      setError(error.message || '네트워크 오류가 발생했습니다.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // 새로고침
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadTeams(false)
    setIsRefreshing(false)
  }

  // 팀 선택
  const handleSelectTeam = (team: Team) => {
    setCurrentTeam(team)
    navigate(ROUTES.DASHBOARD)
  }

  // 초대 코드 복사
  const copyInviteCode = async (inviteCode: string) => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      toast({
        title: "복사 완료",
        description: "초대 코드가 클립보드에 복사되었습니다.",
      })
    } catch (error) {
      logger.error('복사 실패:', error)
      toast({
        title: "복사 실패",
        description: "복사에 실패했습니다. 직접 선택해서 복사해주세요.",
        variant: "destructive",
      })
    }
  }

  // 팀 설정 핸들러
  const handleTeamSettings = () => {
    toast({
      title: "준비 중",
      description: "팀 설정 기능은 추후 구현 예정입니다.",
      variant: "default",
    })
  }

  // 컴포넌트 마운트 시 팀 목록 로드
  useEffect(() => {
    loadTeams()
  }, [token])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">팀 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                내 팀 목록
              </h1>
              <p className="text-gray-600">
                참여 중인 팀을 확인하고 새로운 팀을 생성하거나 참여해보세요
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                새로고침
              </Button>

              <Button
                onClick={() => navigate('/teams/join')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />팀 참여
              </Button>

              <Button
                onClick={() => navigate('/teams/create')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />팀 생성
              </Button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 팀 목록 */}
        {teamsData.length === 0 ? (
          // 빈 상태
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  참여 중인 팀이 없습니다
                </h2>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  새로운 팀을 생성하거나 기존 팀에 참여하여 팀원들과 함께 일정을
                  관리해보세요.
                </p>

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => navigate('/teams/create')}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />새 팀 생성
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/teams/join')}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />팀 참여하기
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // 팀 카드 그리드
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamsData.map((team) => (
              <Card
                key={team.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectTeam(team)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1 flex items-center gap-2">
                        {team.name}
                        {team.userRole === 'leader' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Crown className="h-4 w-4 text-yellow-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>팀장</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {team.description}
                      </p>
                    </div>

                    <Badge
                      variant={
                        team.userRole === 'leader' ? 'default' : 'secondary'
                      }
                    >
                      {team.userRole === 'leader' ? '팀장' : '팀원'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* 팀 정보 */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>멤버 {team.memberCount || 0}명</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        생성일:{' '}
                        {format(new Date(team.created_at), 'yyyy.MM.dd', {
                          locale: ko,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* 초대 코드 */}
                  {team.userRole === 'leader' && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            초대 코드
                          </p>
                          <p className="font-mono text-sm font-medium">
                            {team.invite_code}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyInviteCode(team.invite_code)
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectTeam(team)
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />팀 선택
                    </Button>

                    {team.userRole === 'leader' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTeamSettings()
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-3xl mx-auto">
            <h3 className="font-medium text-blue-900 mb-3">💡 팀 사용 안내</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • <strong>팀장</strong>: 팀 일정 생성, 수정, 삭제 및 팀원 관리
                권한
              </p>
              <p>
                • <strong>팀원</strong>: 일정 조회 권한, 변경 요청은 채팅을 통해
                가능
              </p>
              <p>• 초대 코드를 공유하여 새로운 팀원을 초대할 수 있습니다</p>
              <p>
                • 하나의 팀을 선택하면 해당 팀의 캘린더와 채팅을 이용할 수
                있습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
