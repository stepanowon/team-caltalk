import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setIsLoading(false)
      return
    }

    try {
      const result = await AuthService.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
      })

      if (result.success) {
        navigate(ROUTES.LOGIN)
      } else {
        setError(result.error || '회원가입에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
      console.error('Register error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
          <p className="text-sm text-muted-foreground">
            Team CalTalk에 가입하여 팀 협업을 시작하세요
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">계정 생성</CardTitle>
            <CardDescription className="text-center">
              아래 정보를 입력하여 새 계정을 만드세요
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error && (
              <div className="rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">사용자명</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="사용자명"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">전체 이름</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="홍길동"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '가입 중...' : '회원가입'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <div className="text-center text-sm text-muted-foreground w-full">
              이미 계정이 있으신가요?{' '}
              <Link
                to={ROUTES.LOGIN}
                className="font-medium text-primary hover:underline"
              >
                로그인
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
