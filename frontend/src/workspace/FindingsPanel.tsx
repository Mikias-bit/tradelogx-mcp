import { FINDINGS } from './data'

interface FindingsPanelProps {
  /** Either a severity ("all" | "high" | "medium") or a check-card category. */
  filter: string
  /** Which severity chip renders as active — tracked separately, as in the original. */
  activeChip: string
  onChangeSeverity: (severity: string) => void
  onOpenEvidence: (title: string) => void
  isSample: boolean
  violations: Array<Record<string, unknown>>
}

const SEVERITY_CHIPS: ReadonlyArray<[string, string]> = [
  ['all', 'All'],
  ['high', 'High'],
  ['medium', 'Medium'],
]

export default function FindingsPanel({
  filter,
  activeChip,
  onChangeSeverity,
  onOpenEvidence,
  isSample,
  violations,
}: FindingsPanelProps) {
  const findings = isSample ? FINDINGS : violations.map((violation, index) => {
    const backendSeverity = String(violation.severity || 'minor').toLowerCase()
    const context = (violation.context || {}) as Record<string, unknown>
    const ruleMeta = (context.rule_meta || {}) as Record<string, unknown>
    return {
      severity: backendSeverity === 'critical' ? 'high' : backendSeverity === 'major' ? 'medium' : 'low',
      category: String(ruleMeta.suite || violation.scope || 'validation'),
      title: String(violation.title || violation.message || violation.rule_id || `Finding ${index + 1}`),
      body: String(violation.description || violation.message || 'This validation rule requires review.'),
      sources: [violation.document_key, ruleMeta.suite].filter(Boolean).map(String),
    }
  })
  const visible = findings.filter(
    (f) => filter === 'all' || f.severity === filter || f.category === filter,
  )

  return (
    <div className="tab-panel">
      <div className="panel-title">
        <div>
          <h2>Findings</h2>
          <p>Prioritized discrepancies with linked evidence and recommended action.</p>
        </div>
        <div className="filter-set">
          {SEVERITY_CHIPS.map(([value, label]) => (
            <button
              key={value}
              className={`filter${activeChip === value ? ' active' : ''}`}
              onClick={() => onChangeSeverity(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="finding-list">
        {!visible.length ? <p>No validation findings were reported for this case.</p> : null}
        {visible.map((finding, i) => (
          <article className="finding-card" data-severity={finding.severity} key={finding.title}>
            <span className={`severity ${finding.severity}`}>{finding.severity.toUpperCase()}</span>
            <div>
              <h3>{finding.title}</h3>
              <p>{finding.body}</p>
              <div className="finding-source">
                {finding.sources.map((source) => (
                  <span key={source}>{source}</span>
                ))}
              </div>
            </div>
            <button className="evidence-link" onClick={() => onOpenEvidence(finding.title)}>
              {i === 0 && filter === 'all' ? 'View evidence' : 'Open check'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
