import { TIMELINE } from './data'
import type { ValidationAggregate } from './api'

interface AuditPanelProps {
  onExport: () => void
  isSample: boolean
  result?: ValidationAggregate
  documentCount: number
}

export default function AuditPanel({ onExport, isSample, result, documentCount }: AuditPanelProps) {
  const timeline: ReadonlyArray<[string, string, string]> = isSample ? TIMELINE : !result ? [
    ['No completed result available', 'Use the case status above to monitor processing or recover a failed attempt.', 'Pending'],
  ] : [
    ['Processing result recorded', `${result?.evaluated_rule_count || 0} rules evaluated with ${result?.violation_count || 0} findings`, String(result?.generated_at || 'Time not supplied')],
    ['Validation suites executed', `${result?.rule_suites?.length || 0} rule suites`, String(result?.generated_at || 'Time not supplied')],
    ['Documents processed', `${documentCount} document${documentCount === 1 ? '' : 's'} in the case view`, String(result?.generated_at || 'Time not supplied')],
  ]
  return (
    <div className="tab-panel">
      <div className="panel-title">
        <div>
          <h2>Audit trail</h2>
          <p>Recorded processing results. Human review decisions are not recorded here.</p>
        </div>
        <button disabled={!result && !isSample} className="secondary" onClick={onExport}>
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
