import { NAV_ITEMS } from './data'

interface SidebarProps {
  open: boolean
  onNavigate: (item: { id: string; label: string }) => void
}

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path d="M7 8.5 16 4l9 4.5v10.8c0 4-3 7-9 9.7-6-2.7-9-5.7-9-9.7V8.5Z" fill="currentColor" />
            <path
              d="m11.5 16 3 3 6-7"
              fill="none"
              stroke="#07152b"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <strong>Tradelogx</strong>
          <span>Verify</span>
        </div>
      </div>

      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item${item.id === 'workspace' ? ' active' : ''}`}
            onClick={() => onNavigate(item)}
          >
            <span className="nav-icon">{item.glyph}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="usage">
          <span>Workspace</span>
          <strong>Sandbox EU</strong>
          <small>Data region · Frankfurt</small>
        </div>
        <button className="user-card">
          <span className="avatar">MA</span>
          <span>
            <strong>Mikias</strong>
            <small>Administrator</small>
          </span>
          <span>•••</span>
        </button>
      </div>
    </aside>
  )
}
