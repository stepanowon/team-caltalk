import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useTeamStore } from '@/stores/team-store'
import { ROUTES } from '@/utils/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { currentTeam } = useTeamStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTES.LOGIN)
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: '100%',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '3.5rem',
          maxWidth: '100rem',
          margin: '0 auto',
          padding: '0 1rem',
        }}
      >
        <div style={{ marginRight: '1rem', display: 'flex' }}>
          <Link
            to={ROUTES.HOME}
            style={{
              marginRight: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '1.25rem',
                color: '#1f2937',
              }}
            >
              Team CalTalk
            </span>
          </Link>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
          }}
        >
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.DASHBOARD}
                  style={{
                    padding: '0.5rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.375rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = '#f3f4f6')
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = 'transparent')
                  }
                >
                  대시보드
                </Link>
                <Link
                  to={ROUTES.TEAMS}
                  style={{
                    padding: '0.5rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.375rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = '#f3f4f6')
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = 'transparent')
                  }
                >
                  팀
                </Link>
                {currentTeam && (
                  <Link
                    to={ROUTES.CALENDAR}
                    style={{
                      padding: '0.5rem 1rem',
                      color: '#374151',
                      textDecoration: 'none',
                      borderRadius: '0.375rem',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = '#f3f4f6')
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = 'transparent')
                    }
                  >
                    캘린더
                  </Link>
                )}

                {/* 현재 팀 표시 */}
                {currentTeam && (
                  <span
                    style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: window.innerWidth >= 768 ? 'inline' : 'none',
                    }}
                  >
                    {currentTeam.name}
                  </span>
                )}

                <span
                  style={{
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    display: window.innerWidth >= 768 ? 'inline' : 'none',
                  }}
                >
                  {user?.full_name}님
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'transparent',
                    color: '#374151',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = '#f9fafb')
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = 'transparent')
                  }
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  style={{
                    padding: '0.5rem 1rem',
                    color: '#374151',
                    textDecoration: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = '#f3f4f6')
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = 'transparent')
                  }
                >
                  로그인
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = '#1d4ed8')
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor = '#2563eb')
                  }
                >
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
