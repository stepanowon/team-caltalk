/**
 * 팀 생성 페이지
 */

import { useState } from 'react'
import { logger } from '@/utils/logger'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Users, Plus, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { TeamService } from '@/services/team-service'
import { useTeamStore } from '@/stores/team-store'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

// 폼 검증 스키마
const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, '팀 이름은 최소 2자 이상이어야 합니다')
    .max(50, '팀 이름은 최대 50자까지 가능합니다')
    .regex(
      /^[가-힣a-zA-Z0-9\s]+$/,
      '팀 이름에는 한글, 영문, 숫자, 공백만 사용할 수 있습니다'
    ),
  description: z
    .string()
    .min(10, '팀 설명은 최소 10자 이상이어야 합니다')
    .max(200, '팀 설명은 최대 200자까지 가능합니다'),
})

type CreateTeamFormData = z.infer<typeof createTeamSchema>

export function CreateTeam() {
  const navigate = useNavigate()
  const { token, user, isAuthenticated } = useAuthStore()
  const { addTeam, setCurrentTeam } = useTeamStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  // 입력값 실시간 감시
  const watchedName = watch('name')
  const watchedDescription = watch('description')

  const onSubmit = async (data: CreateTeamFormData) => {
    // 토큰이 없으면 localStorage에서 직접 확인
    let authToken = token
    if (!authToken) {
      // access_token에서 직접 가져오기
      authToken = localStorage.getItem('access_token')

      // 만약 access_token도 없으면 auth-storage에서 확인
      if (!authToken) {
        const storedAuth = localStorage.getItem('auth-storage')
        if (storedAuth) {
          try {
            const parsed = JSON.parse(storedAuth)
            authToken = parsed.state?.token || parsed.token
          } catch (e) {
            logger.error('localStorage 파싱 오류:', e)
          }
        }
      }
    }

    if (!authToken) {
      setError('로그인이 필요합니다.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await TeamService.createTeam(data, authToken)

      if (response.success && response.data?.team) {
        // 스토어에 새 팀 추가
        addTeam(response.data.team)

        // 생성된 팀을 현재 팀으로 설정
        setCurrentTeam(response.data.team)

        // 대시보드로 이동
        navigate(ROUTES.DASHBOARD, {
          replace: true,
          state: { message: '팀이 성공적으로 생성되었습니다!' },
        })
      } else {
        setError(response.error || '팀 생성에 실패했습니다.')
      }
    } catch (error: any) {
      logger.error('팀 생성 오류:', error)
      setError(error.message || '네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(ROUTES.DASHBOARD)
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
            <ArrowLeft className="h-4 w-4 mr-2" />
            대시보드로 돌아가기
          </Button>

          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              새 팀 생성
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              팀원들과 함께 일정을 관리할 새로운 팀을 만들어보세요
            </p>
          </div>
        </div>

        {/* 폼 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />팀 정보 입력
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 에러 메시지 */}
            {error && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 팀 이름 */}
              <div>
                <Label htmlFor="name" className="text-base font-medium">
                  팀 이름 *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="예: 개발팀, 마케팅팀, 프로젝트 A팀"
                  {...register('name')}
                  className={`mt-2 ${errors.name ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.name.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {watchedName.length}/50자
                </p>
              </div>

              {/* 팀 설명 */}
              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  팀 설명 *
                </Label>
                <Textarea
                  id="description"
                  placeholder="팀의 목적이나 주요 업무에 대해 간단히 설명해주세요"
                  rows={4}
                  {...register('description')}
                  className={`mt-2 resize-none ${errors.description ? 'border-red-500' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.description.message}
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {watchedDescription.length}/200자
                </p>
              </div>

              {/* 안내 정보 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  📋 팀 생성 후 안내사항
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>
                    • 팀이 생성되면 고유한 초대 코드가 자동으로 발급됩니다
                  </li>
                  <li>
                    • 초대 코드를 팀원들과 공유하여 팀에 초대할 수 있습니다
                  </li>
                  <li>• 팀장으로서 팀 일정 생성 및 관리 권한을 갖게 됩니다</li>
                  <li>
                    • 팀원들은 일정 조회만 가능하며, 변경 요청은 채팅을 통해 할
                    수 있습니다
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
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      생성 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />팀 생성하기
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 도움말 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            팀 생성에 문제가 있거나 궁금한 점이 있으시면{' '}
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
