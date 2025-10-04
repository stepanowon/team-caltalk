import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { queryClient } from '@/hooks/queryClient'
import { Layout } from '@/components/Layout/Layout'
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { Dashboard } from '@/pages/Dashboard'
import { Teams } from '@/pages/Teams'
import { CreateTeam } from '@/pages/CreateTeam'
import { JoinTeam } from '@/pages/JoinTeam'
import { Calendar } from '@/pages/Calendar'
import { Toaster } from '@/components/ui/toaster'
import { ROUTES } from '@/utils/constants'
import '@/styles/globals.css'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const authStorage = localStorage.getItem('auth-storage')

  if (!authStorage) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  try {
    const { state } = JSON.parse(authStorage)
    if (!state.isAuthenticated || !state.user) {
      return <Navigate to={ROUTES.LOGIN} replace />
    }
  } catch {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path={ROUTES.LOGIN} element={<Login />} />
            <Route path={ROUTES.REGISTER} element={<Register />} />
            <Route
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.TEAMS}
              element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.TEAMS_CREATE}
              element={
                <ProtectedRoute>
                  <CreateTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.TEAMS_JOIN}
              element={
                <ProtectedRoute>
                  <JoinTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.CALENDAR}
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
