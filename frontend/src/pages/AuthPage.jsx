import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'

export default function AuthPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/register' ? 'register' : 'login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    setMode(location.pathname === '/register' ? 'register' : 'login')
  }, [location.pathname])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.name, form.email, form.password)
      }
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong'
      const errs = err.response?.data?.errors || []
      setError(errs.length ? errs.join('\n') : msg)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    const nextPath = mode === 'login' ? '/register' : '/login'
    navigate(nextPath)
    setError('')
    setForm({ name: '', email: '', password: '' })
  }

  return (
    <div className="auth-layout">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <span style={{ fontSize: 26, fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TaskFlow
          </span>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to manage your tasks'
            : 'Get started with TaskFlow today'}
        </p>

        {error && (
          <div className="auth-error" style={{ marginBottom: 20, whiteSpace: 'pre-line' }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="auth-name"
                className="form-input"
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="auth-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="auth-password"
              className="form-input"
              type="password"
              placeholder={mode === 'register' ? 'Min 8 chars, 1 uppercase, 1 number' : '••••••••'}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
            />
          </div>

          <button
            id="auth-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : mode === 'login' ? '🔐 Sign In' : '🚀 Create Account'
            }
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span className="auth-link" onClick={switchMode} id="auth-switch-link">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </span>
        </div>

        {mode === 'login' && (
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>🧪 Demo credentials:</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Any registered email + password</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Register first, then promote via Admin panel</p>
          </div>
        )}
      </div>
    </div>
  )
}
