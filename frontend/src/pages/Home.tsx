import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Home = () => {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Team CalTalk에 오신 것을 환영합니다!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
            팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼으로 효율적인 팀
            협업을 경험하세요
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild>
            <Link to={ROUTES.DASHBOARD}>대시보드로 이동</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center">
      <div className="container px-4 max-w-[1200px] mx-auto">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Team CalTalk
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼으로 더 스마트한 팀
              협업을 시작하세요
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to={ROUTES.REGISTER}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              시작하기
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-12 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                📅 일정 관리
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                  핵심
                </span>
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              팀원들과 함께 일정을 공유하고 관리하세요. 실시간 동기화로 모든
              팀원이 최신 일정을 확인할 수 있습니다.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                💬 실시간 채팅
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                  소통
                </span>
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              일정별 채팅방으로 효율적인 소통을 하세요. 중요한 대화 내용을
              놓치지 않고 팀워크를 강화할 수 있습니다.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                👥 팀 관리
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">
                  협업
                </span>
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              팀장과 팀원 역할로 체계적인 팀 관리를 하세요. 권한 기반으로
              안전하고 효율적인 협업이 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
