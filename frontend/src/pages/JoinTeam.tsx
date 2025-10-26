/**
 * 팀 참여 페이지
 */

import { useState } from 'react'
import { logger } from '@/utils/logger'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  UserPlus,
  Users,
  Key,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { TeamService } from '@/services/team-service'
import { useTeamStore } from '@/stores/team-store'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

// 폼 검증 스키마
const joinTeamSchema = z.object({
  inviteCode: z
    .string()
    .min(1, '초대 코드를 입력해주세요')
    .min(6, '초대 코드는 최소 6자리여야 합니다')
    .max(6, '초대 코드는 최대 6자리여야 합니다')
    .regex(
      /^[A-Z0-9]+$/,
      '초대 코드는 영문 대문자와 숫자로만 구성되어야 합니다'
    )
    .transform((val) => val.toUpperCase().trim()),
})

type JoinTeamFormData = z.infer<typeof joinTeamSchema>

export function JoinTeam() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { addTeam, setCurrentTeam } = useTeamStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<JoinTeamFormData>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      inviteCode: '',
    },
  })

  // 입력값 실시간 감시 및 포맷팅
  const watchedInviteCode = watch('inviteCode')

  const onSubmit = async (data: JoinTeamFormData) => {
    if (!token) {
      setError('로그인이 필요합니다.')
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await TeamService.joinTeam(data.inviteCode, token)

      if (response.success && response.data && response.data.team) {
        // 스토어에 새 팀 추가
        addTeam(response.data.team)

        // 참여한 팀을 현재 팀으로 설정
        setCurrentTeam(response.data.team)

        setSuccess(`${response.data.team.name} 팀에 성공적으로 참여했습니다!`)

        // 3초 후 대시보드로 이동
        setTimeout(() => {
          navigate(ROUTES.DASHBOARD, {
            replace: true,
            state: { message: `${response.data.team.name} 팀에 참여했습니다!` },
          })
        }, 3000)
      } else {
        setError(
          response.error || '팀 참여에 실패했습니다. 초대 코드를 확인해주세요.'
        )
      }
    } catch (error: any) {
      logger.error('팀 참여 오류:', error)
      setError(error.message || '네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(ROUTES.TEAMS)
  }

  // 초대 코드 자동 포맷팅 (대문자 변환, 6자리 제한)
  const formatInviteCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase()
    const result = cleaned.substring(0, 6) // 6자리로 제한
    return result
  }

  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.value
    const formatted = formatInviteCode(original)
    setValue('inviteCode', formatted)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />팀 목록으로 돌아가기
          </Button>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              팀 참여하기
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              초대 코드를 입력하여 기존 팀에 참여해보세요
            </p>
          </div>
        </div>

        {/* 폼 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              초대 코드 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 성공 메시지 */}
            {success && (
              <Alert className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-300">
                  {success}
                  <div className="mt-2 text-sm">
                    잠시 후 자동으로 대시보드로 이동됩니다...
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* 에러 메시지 */}
            {error && (
              <Alert className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 초대 코드 입력 */}
              <div>
                <Label htmlFor="inviteCode" className="text-base font-medium dark:text-white">
                  초대 코드 *
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
                  팀장으로부터 받은 초대 코드를 입력해주세요
                </p>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="예: JJD3XD"
                  {...register('inviteCode')}
                  onChange={handleInviteCodeChange}
                  value={watchedInviteCode}
                  className={`mt-2 font-mono text-center text-lg tracking-wider ${
                    errors.inviteCode ? 'border-red-500' : ''
                  }`}
                  disabled={isSubmitting || !!success}
                  maxLength={6} // 6자리 초대 코드
                />
                {errors.inviteCode && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.inviteCode.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  * 초대 코드는 6자리 영문 대문자와 숫자로 구성됩니다 (예:
                  JJD3XD)
                </p>
              </div>

              {/* 안내 정보 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  📋 팀 참여 안내사항
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>
                    • 초대 코드는 팀장이 팀 생성 시 자동으로 발급받는 6자리 고유
                    코드입니다
                  </li>
                  <li>• 팀 참여 후 팀원 권한으로 일정을 조회할 수 있습니다</li>
                  <li>
                    • 일정 생성 및 수정은 팀장만 가능하며, 변경 요청은 채팅을
                    통해 할 수 있습니다
                  </li>
                  <li>
                    • 잘못된 초대 코드 입력 시 팀장에게 올바른 코드를 다시
                    요청해주세요
                  </li>
                </ul>
              </div>

              {/* 버튼 그룹 */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                  disabled={isSubmitting || !!success}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || !!success}
                >
                  {success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      참여 완료!
                    </div>
                  ) : isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      참여 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />팀 참여하기
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 추가 안내 */}
        <div className="mt-8">
          <Card>
            <CardContent className="py-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  초대 코드가 없으신가요?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  새로운 팀을 직접 생성하여 팀장이 되어보세요
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/teams/create')}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />새 팀 생성하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 도움말 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            팀 참여에 문제가 있거나 궁금한 점이 있으시면{' '}
            <a
              href="/help"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              도움말
            </a>
            을 확인해보세요.
          </p>
        </div>
      </div>
    </div>
  )
}
