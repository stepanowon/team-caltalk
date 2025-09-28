import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AuthService } from '@/services/auth-service'
import { ROUTES } from '@/utils/constants'

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

      if (result.success && result.data) {
        setAuth(result.data.user, result.data.token)
        navigate(ROUTES.DASHBOARD)
      } else {
        setError(result.error || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-8">로그인</h1>

        {error && <div className="text-error text-center mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              이메일
            </label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="text-center mt-6">
          <span className="text-gray-600">계정이 없으신가요? </span>
          <Link to={ROUTES.REGISTER} className="text-blue-600 hover:underline">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  )
}