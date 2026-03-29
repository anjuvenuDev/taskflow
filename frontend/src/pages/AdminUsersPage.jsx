import { useState, useEffect } from 'react'
import { usersAPI } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [actionLoading, setActionLoading] = useState(null)

  const fetchUsers = async (page = 1) => {
    setLoading(true)
    try {
      const res = await usersAPI.getAll({ page, limit: 10 })
      setUsers(res.data.data)
      setPagination(res.data.pagination)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleRoleChange = async (id, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!confirm(`Change this user's role to ${newRole}?`)) return
    setActionLoading(`role-${id}`)
    try {
      await usersAPI.updateRole(id, newRole)
      toast.success(`Role updated to ${newRole}`)
      fetchUsers(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This will also delete all their tasks.`)) return
    setActionLoading(`del-${id}`)
    try {
      await usersAPI.delete(id)
      toast.success('User deleted')
      fetchUsers(pagination.page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  const initials = (name) => name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 User Management</h1>
          <p className="page-subtitle">Admin panel — {pagination.total} registered users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { icon: '👤', label: 'Total Users', value: pagination.total, color: '#6366f1' },
          { icon: '🛡️', label: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, color: '#8b5cf6' },
          { icon: '🙋', label: 'Regular Users', value: users.filter(u => u.role === 'USER').length, color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="page-loading" style={{ minHeight: 300 }}>
          <div className="loading-spinner" />
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Tasks</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: u.role === 'ADMIN' ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'linear-gradient(135deg,#06b6d4,#6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0
                        }}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                          {u.id === currentUser?.id && (
                            <div style={{ fontSize: 11, color: 'var(--accent-primary)' }}>You</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-user'}`}>
                        {u.role === 'ADMIN' ? '🛡️ ' : '👤 '}{u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{u._count?.tasks ?? 0}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>tasks</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className={`btn btn-sm ${u.role === 'ADMIN' ? 'badge-user btn-ghost' : 'btn-secondary'}`}
                          disabled={u.id === currentUser?.id || actionLoading === `role-${u.id}`}
                          onClick={() => handleRoleChange(u.id, u.role)}
                          title={u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                          style={{ fontSize: 12 }}
                        >
                          {actionLoading === `role-${u.id}` ? <div className="spinner" style={{ width: 12, height: 12 }} /> : u.role === 'ADMIN' ? '⬇️ Demote' : '⬆️ Promote'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          disabled={u.id === currentUser?.id || actionLoading === `del-${u.id}`}
                          onClick={() => handleDelete(u.id, u.name)}
                          title="Delete user"
                        >
                          {actionLoading === `del-${u.id}` ? <div className="spinner" style={{ width: 12, height: 12 }} /> : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination" style={{ padding: '16px 0' }}>
              <button className="page-btn" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>←</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchUsers(p)}>{p}</button>
              ))}
              <button className="page-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)}>→</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
