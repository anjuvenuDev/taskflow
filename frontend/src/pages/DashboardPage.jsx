import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { tasksAPI } from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentTasks, setRecentTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, tasksRes] = await Promise.all([
          tasksAPI.getStats(),
          tasksAPI.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        ])
        setStats(statsRes.data.data.stats)
        setRecentTasks(tasksRes.data.data)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return '🌅 Good morning'
    if (h < 18) return '☀️ Good afternoon'
    return '🌙 Good evening'
  }

  const statusColor = { TODO: '#64748b', IN_PROGRESS: '#f59e0b', DONE: '#10b981' }
  const priorityColor = { LOW: '#06b6d4', MEDIUM: '#f59e0b', HIGH: '#ef4444' }

  if (loading) return (
    <div className="page-loading">
      <div className="loading-spinner" />
      <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</span>
    </div>
  )

  const completionRate = stats?.total > 0
    ? Math.round((stats.byStatus.DONE / stats.total) * 100)
    : 0

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{greet()}, {user?.name?.split(' ')[0]}!</h1>
          <p className="page-subtitle">
            {isAdmin ? 'Admin Dashboard — Full system overview' : "Here's your task overview"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
          ➕ New Task
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="stats-grid">
          {[
            { icon: '📊', label: 'Total Tasks', value: stats.total, color: '#6366f1' },
            { icon: '📝', label: 'To Do', value: stats.byStatus.TODO, color: '#64748b' },
            { icon: '🔄', label: 'In Progress', value: stats.byStatus.IN_PROGRESS, color: '#f59e0b' },
            { icon: '✅', label: 'Completed', value: stats.byStatus.DONE, color: '#10b981' },
            { icon: '🏆', label: 'Completion', value: `${completionRate}%`, color: completionRate > 70 ? '#10b981' : completionRate > 40 ? '#f59e0b' : '#ef4444' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Two-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>
        {/* Recent Tasks */}
        <div className="card card-padded">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>📋 Recent Tasks</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all →</button>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div className="empty-icon">📭</div>
              <div className="empty-text">No tasks yet</div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/tasks')}>Create one</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTasks.map(task => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                  onClick={() => navigate('/tasks')}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-strong)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: statusColor[task.status]
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  </div>
                  <div style={{ fontSize: 11, color: priorityColor[task.priority], fontWeight: 600 }}>{task.priority}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority Breakdown */}
        <div className="card card-padded">
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>🎯 Priority Breakdown</h2>
          {stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'High Priority', value: stats.byPriority.HIGH, color: '#ef4444', icon: '🔴' },
                { label: 'Medium Priority', value: stats.byPriority.MEDIUM, color: '#f59e0b', icon: '🟡' },
                { label: 'Low Priority', value: stats.byPriority.LOW, color: '#06b6d4', icon: '🔵' },
              ].map(p => {
                const pct = stats.total > 0 ? Math.round((p.value / stats.total) * 100) : 0
                return (
                  <div key={p.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.icon} {p.label}</span>
                      <span style={{ fontWeight: 700, color: p.color }}>{p.value} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 3,
                        background: p.color, transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>
                )
              })}

              <div style={{ marginTop: 8, padding: '14px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Overall Completion</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: completionRate > 70 ? '#10b981' : '#6366f1' }}>{completionRate}%</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>tasks done</span>
                </div>
                <div style={{ marginTop: 8, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${completionRate}%`,
                    background: 'var(--gradient-primary)', borderRadius: 4, transition: 'width 0.8s ease'
                  }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role info */}
      {isAdmin && (
        <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(139,92,246,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 2 }}>Admin Mode Active</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              You have full visibility into all users and tasks. Use the Users panel to manage roles.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={() => navigate('/admin/users')}>
            Manage Users
          </button>
        </div>
      )}
    </div>
  )
}
