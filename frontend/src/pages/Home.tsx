import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { ROUTES } from '@/utils/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Home = () => {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Team CalTalk에 오신 것을 환영합니다!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼으로 효율적인 팀 협업을 경험하세요
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" asChild>
            <Link to={ROUTES.DASHBOARD}>
              대시보드로 이동
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container" style={{ padding: '0 1rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#1f2937', lineHeight: '1.1' }}>
              Team CalTalk
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: '42rem', margin: '0 auto' }}>
              팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼으로 더 스마트한 팀 협업을 시작하세요
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="sm:flex-row">
            <Link
              to={ROUTES.REGISTER}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-block',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            >
              시작하기
            </Link>
            <Link
              to={ROUTES.LOGIN}
              style={{
                border: '2px solid #2563eb',
                color: '#2563eb',
                padding: '0.75rem 2rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: '600',
                display: 'inline-block',
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#eff6ff'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
            >
              로그인
            </Link>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          maxWidth: '80rem',
          margin: '3rem auto 0',
          padding: '0 1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📅 일정 관리
                <span style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>핵심</span>
              </h3>
            </div>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
              팀원들과 함께 일정을 공유하고 관리하세요. 실시간 동기화로 모든 팀원이 최신 일정을 확인할 수 있습니다.
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                💬 실시간 채팅
                <span style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>소통</span>
              </h3>
            </div>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
              일정별 채팅방으로 효율적인 소통을 하세요. 중요한 대화 내용을 놓치지 않고 팀워크를 강화할 수 있습니다.
            </p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                👥 팀 관리
                <span style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>협업</span>
              </h3>
            </div>
            <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
              팀장과 팀원 역할로 체계적인 팀 관리를 하세요. 권한 기반으로 안전하고 효율적인 협업이 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
