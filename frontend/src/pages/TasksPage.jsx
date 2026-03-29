import { useState, useEffect } from 'react'
import { tasksAPI } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'DONE']
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH']

function statusBadge(s) {
  if (s === 'TODO') return <span className="badge badge-todo">Todo</span>
  if (s === 'IN_PROGRESS') return <span className="badge badge-progress">In Progress</span>
  return <span className="badge badge-done">Done</span>
}
function priorityBadge(p) {
  const cls = p === 'LOW' ? 'badge-low' : p === 'MEDIUM' ? 'badge-medium' : 'badge-high'
  return <span className={`badge ${cls}`}>{p}</span>
}

function TaskModal({ task, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'TODO',
    priority: task?.priority || 'MEDIUM',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 16) : '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setErrors([])
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }
      if (task) {
        await tasksAPI.update(task.id, payload)
        toast.success('Task updated!')
      } else {
        await tasksAPI.create(payload)
        toast.success('Task created!')
      }
      onSaved()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save task'
      const errs = err.response?.data?.errors || []
      setErrors(errs.length ? errs : [msg])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{task ? '✏️ Edit Task' : '➕ New Task'}</h2>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        {errors.length > 0 && (
          <div className="auth-error" style={{ marginBottom: 20 }}>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the task…" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input type="datetime-local" className="form-input" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" /> Saving…</> : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TasksPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalTask, setModalTask] = useState(undefined) // undefined=closed, null=new, obj=edit
  const [deleting, setDeleting] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })

  const [filters, setFilters] = useState({ search: '', status: '', priority: '', sortBy: 'createdAt', sortOrder: 'desc' })

  const fetchTasks = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 10, ...filters }
      Object.keys(params).forEach(k => !params[k] && delete params[k])
      const res = await tasksAPI.getAll(params)
      setTasks(res.data.data)
      setPagination(res.data.pagination)
    } catch (err) {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await tasksAPI.getStats()
      setStats(res.data.data.stats)
    } catch {}
  }

  useEffect(() => { fetchTasks(); fetchStats() }, [])
  useEffect(() => { fetchTasks(1) }, [filters])

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    setDeleting(id)
    try {
      await tasksAPI.delete(id)
      toast.success('Task deleted')
      fetchTasks(pagination.page)
      fetchStats()
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(null)
    }
  }

  const onSaved = () => { fetchTasks(pagination.page); fetchStats() }
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Tasks</h1>
          <p className="page-subtitle">{isAdmin ? 'Managing all tasks across users' : 'Your personal task board'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalTask(null)}>
          ➕ New Task
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total', value: stats.total, icon: '📊', color: '#6366f1' },
            { label: 'Todo', value: stats.byStatus.TODO, icon: '📝', color: '#64748b' },
            { label: 'In Progress', value: stats.byStatus.IN_PROGRESS, icon: '🔄', color: '#f59e0b' },
            { label: 'Done', value: stats.byStatus.DONE, icon: '✅', color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap" style={{ flex: 2 }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-input search-input"
            placeholder="Search tasks…"
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 140 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select className="form-select" style={{ width: 130 }} value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-select" style={{ width: 150 }} value={`${filters.sortBy}_${filters.sortOrder}`} onChange={e => {
          const [sortBy, sortOrder] = e.target.value.split('_')
          setFilters(f => ({ ...f, sortBy, sortOrder }))
        }}>
          <option value="createdAt_desc">Newest First</option>
          <option value="createdAt_asc">Oldest First</option>
          <option value="priority_desc">Priority ↓</option>
          <option value="dueDate_asc">Due Soon</option>
          <option value="title_asc">Title A–Z</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="page-loading" style={{ minHeight: 300 }}>
          <div className="loading-spinner" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-text">Create your first task to get started</div>
          <button className="btn btn-primary" onClick={() => setModalTask(null)}>➕ Create Task</button>
        </div>
      ) : (
        <div className="task-grid">
          {tasks.map(task => (
            <div key={task.id} className="task-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 auto' }}>
                {statusBadge(task.status)}
              </div>
              <div className="task-card-content">
                <div className="task-title">{task.title}</div>
                {task.description && <div className="task-description">{task.description}</div>}
                <div className="task-meta">
                  {priorityBadge(task.priority)}
                  {task.dueDate && (
                    <span className="task-date">📅 {new Date(task.dueDate).toLocaleDateString()}</span>
                  )}
                  {isAdmin && task.user && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👤 {task.user.name}</span>
                  )}
                </div>
              </div>
              <div className="task-actions">
                <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => setModalTask(task)}>✏️</button>
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  title="Delete"
                  disabled={deleting === task.id}
                  onClick={() => handleDelete(task.id)}
                >
                  {deleting === task.id ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={pagination.page <= 1} onClick={() => fetchTasks(pagination.page - 1)}>←</button>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => fetchTasks(p)}>{p}</button>
          ))}
          <button className="page-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTasks(pagination.page + 1)}>→</button>
        </div>
      )}

      {/* Modal */}
      {modalTask !== undefined && (
        <TaskModal task={modalTask} onClose={() => setModalTask(undefined)} onSaved={onSaved} />
      )}
    </div>
  )
}
