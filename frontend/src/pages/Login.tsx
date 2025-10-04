import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/auth-service'
import { ROUTES } from '@/utils/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { logger } from '@/utils/logger'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await AuthService.login({ email, password })

      if (result.success && result.data && result.data.tokens) {
        setAuth(
          result.data.user,
          result.data.tokens.accessToken,
          result.data.tokens.refreshToken
        )

        await new Promise((resolve) => setTimeout(resolve, 100))
        navigate(ROUTES.DASHBOARD, { replace: true })
      } else {
        setError(
          result.error ||
            '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
        )
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
      logger.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
          <p className="text-sm text-muted-foreground">
            이메일과 비밀번호를 입력하여 로그인하세요
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Team CalTalk</CardTitle>
            <CardDescription className="text-center">
              팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-center text-sm text-muted-foreground w-full">
              계정이 없으신가요?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="font-medium text-primary hover:underline"
              >
                회원가입
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
