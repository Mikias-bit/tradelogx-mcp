import { TIMELINE } from './data'
import type { ValidationAggregate } from './api'

interface AuditPanelProps {
  onExport: () => void
  isSample: boolean
  result?: ValidationAggregate
  documentCount: number
}

export default function AuditPanel({ onExport, isSample, result, documentCount }: AuditPanelProps) {
  const timeline: ReadonlyArray<[string, string, string]> = isSample ? TIMELINE : [
    ['Verification completed', `${result?.evaluated_rule_count || 0} rules evaluated with ${result?.violation_count || 0} findings`, 'Latest run'],
    ['Validation suites executed', `${result?.rule_suites?.length || 0} rule suites`, 'Latest run'],
    ['Documents processed', `${documentCount} document${documentCount === 1 ? '' : 's'} classified and extracted`, 'Latest run'],
  ]
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
        {timeline.map(([title, detail, when]) => (
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
