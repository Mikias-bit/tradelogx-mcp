interface TopbarProps {
  transactionLabel: string
  onToggleSidebar: () => void
  onNewCheck: () => void
}

export default function Topbar({ transactionLabel, onToggleSidebar, onNewCheck }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onToggleSidebar}>
        ☰
      </button>
      <div className="breadcrumbs">
        <span>Transactions</span>
        <b>/</b>
        <strong>{transactionLabel}</strong>
      </div>
      <div className="header-actions">
        <button className="icon-button" title="Search">
          ⌕
        </button>
        <button className="icon-button" title="Notifications">
          ♢<i></i>
        </button>
        <button className="primary compact" onClick={onNewCheck}>
          New check
        </button>
      </div>
    </header>
  )
}
