import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTeamStore } from '@/stores/team-store'
import { ROUTES } from '@/utils/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, X } from 'lucide-react'

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { currentTeam } = useTeamStore()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
    setIsMobileMenuOpen(false)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="flex items-center h-14 max-w-7xl mx-auto px-4">
        {/* 로고 */}
        <div className="flex-shrink-0">
          <Link
            to={ROUTES.HOME}
            className="flex items-center gap-2 text-decoration-none"
            onClick={closeMobileMenu}
          >
            <span className="font-bold text-xl text-gray-900">
              Team CalTalk
            </span>
          </Link>
        </div>

        {/* 데스크톱 메뉴 */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-4">
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.DASHBOARD}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                >
                  대시보드
                </Link>
                <Link
                  to={ROUTES.TEAMS}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                >
                  팀
                </Link>
                {currentTeam && (
                  <Link
                    to={ROUTES.CALENDAR}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                  >
                    캘린더
                  </Link>
                )}

                {/* 현재 팀 표시 */}
                {currentTeam && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {currentTeam.name}
                  </Badge>
                )}

                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                  {user?.full_name}님
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-700"
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                >
                  로그인
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors no-underline"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* 모바일 햄버거 버튼 */}
        <div className="flex md:hidden ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <nav className="px-4 py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.DASHBOARD}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                  onClick={closeMobileMenu}
                >
                  대시보드
                </Link>
                <Link
                  to={ROUTES.TEAMS}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                  onClick={closeMobileMenu}
                >
                  팀
                </Link>
                {currentTeam && (
                  <Link
                    to={ROUTES.CALENDAR}
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                    onClick={closeMobileMenu}
                  >
                    캘린더
                  </Link>
                )}

                {/* 모바일 사용자 정보 */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  {currentTeam && (
                    <div className="px-4 py-2 text-sm">
                      <span className="text-gray-500">현재 팀: </span>
                      <span className="font-medium text-blue-600">{currentTeam.name}</span>
                    </div>
                  )}
                  <div className="px-4 py-2 text-sm">
                    <span className="text-gray-500">사용자: </span>
                    <span className="font-medium">{user?.full_name}님</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors no-underline"
                  onClick={closeMobileMenu}
                >
                  로그인
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="block px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors no-underline text-center"
                  onClick={closeMobileMenu}
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
