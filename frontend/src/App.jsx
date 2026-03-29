import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'
import AdminUsersPage from './pages/AdminUsersPage'
import { useAuth } from './contexts/AuthContext'

function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const mobileNavItems = [
    { icon: '📊', label: 'Dashboard', path: '/dashboard' },
    { icon: '📋', label: 'Tasks', path: '/tasks' },
    ...(isAdmin ? [{ icon: '👥', label: 'Users', path: '/admin/users' }] : []),
  ]

  if (!user) return null

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <button className="mobile-brand" onClick={() => navigate('/dashboard')}>
          <span className="mobile-brand-icon">⚡</span>
          <span>TaskFlow</span>
        </button>
        <button className="mobile-logout" onClick={logout} title="Logout">🚪</button>
      </header>

      <Sidebar onNavigate={navigate} currentPath={location.pathname} />
      <main className="main-content">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <nav className="mobile-nav">
        {mobileNavItems.map((item) => (
          <button
            key={item.path}
            className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function PublicLayout() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function RootRouter() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="page-loading" style={{ minHeight: '100vh' }}>
      <div className="loading-spinner" style={{ width: 48, height: 48 }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading TaskFlow…</span>
    </div>
  )

  return user ? (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ) : (
    <PublicLayout />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RootRouter />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
