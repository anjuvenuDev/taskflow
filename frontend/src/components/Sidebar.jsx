import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { icon: '⚡', label: 'Dashboard', path: '/dashboard' },
  { icon: '📋', label: 'My Tasks', path: '/tasks' },
]
const adminItems = [
  { icon: '👥', label: 'Users', path: '/admin/users' },
]

export default function Sidebar({ onNavigate, currentPath }) {
  const { user, logout, isAdmin } = useAuth()

  const initials = user?.name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <span className="sidebar-logo-text">TaskFlow</span>
      </div>

      <nav className="sidebar-nav">
        {allItems.map(item => (
          <button
            key={item.path}
            className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
            onClick={() => onNavigate(item.path)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px', transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = '#ef4444'}
            onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  )
}
