import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export const Home = () => {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Team CalTalk에 오신 것을 환영합니다!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼
        </p>
        <Link
          to={ROUTES.DASHBOARD}
          className="btn btn-primary text-lg px-8 py-3"
        >
          대시보드로 이동
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Team CalTalk</h1>
      <p className="text-xl text-gray-600 mb-8">
        팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼
      </p>
      <div className="space-x-4">
        <Link
          to={ROUTES.REGISTER}
          className="btn btn-primary text-lg px-8 py-3"
        >
          시작하기
        </Link>
        <Link to={ROUTES.LOGIN} className="btn btn-outline text-lg px-8 py-3">
          로그인
        </Link>
      </div>
    </div>
  )
}
