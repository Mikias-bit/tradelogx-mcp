import { TIMELINE } from './data'

export default function AuditPanel({ onExport }: { onExport: () => void }) {
  return (
    <div className="tab-panel">
      <div className="panel-title">
        <div>
          <h2>Audit trail</h2>
          <p>A clear record of every automated and human decision.</p>
        </div>
        <button className="secondary" onClick={onExport}>
          Export log
        </button>
      </div>

      <div className="timeline">
        {TIMELINE.map(([title, detail, when]) => (
          <div className="timeline-item" key={title}>
            <span className="timeline-dot"></span>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
            <time>{when}</time>
          </div>
        ))}
      </div>
    </div>
  )
}
