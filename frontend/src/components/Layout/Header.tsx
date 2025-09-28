import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={ROUTES.HOME} className="text-xl font-bold text-blue-600">
            Team CalTalk
          </Link>

          <nav className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.DASHBOARD}
                  className="text-gray-700 hover:text-blue-600"
                >
                  대시보드
                </Link>
                <Link
                  to={ROUTES.TEAMS}
                  className="text-gray-700 hover:text-blue-600"
                >
                  팀
                </Link>
                <span className="text-gray-600">
                  안녕하세요, {user?.full_name}님
                </span>
                <button onClick={handleLogout} className="btn btn-outline">
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className="btn btn-outline">
                  로그인
                </Link>
                <Link to={ROUTES.REGISTER} className="btn btn-primary">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
