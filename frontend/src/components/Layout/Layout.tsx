import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export const Layout = () => {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        backgroundColor: '#f9fafb',
      }}
    >
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
