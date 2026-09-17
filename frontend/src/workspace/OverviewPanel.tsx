import { CHECK_CARDS, FINDINGS, type TradeDocument } from './data'
import type { ValidationAggregate } from './api'
import DocumentRow from './DocumentRow'

interface OverviewPanelProps {
  documents: Array<TradeDocument>
  /** True once an ad-hoc upload has replaced the sample's high-severity result. */
  preliminary: boolean
  criticalTotal: number
  isSample: boolean
  result?: ValidationAggregate
  onOpenFindings: () => void
  onFilterChecks: (filter: string) => void
  onRunAgain: () => void
  onAddMore: () => void
}

export default function OverviewPanel({
  documents,
  preliminary,
  criticalTotal,
  isSample,
  result,
  onOpenFindings,
  onFilterChecks,
  onRunAgain,
  onAddMore,
}: OverviewPanelProps) {
  const violationCount = isSample ? FINDINGS.length : Number(result?.violation_count || 0)
  const evaluatedCount = isSample ? 46 : Number(result?.evaluated_rule_count || 0)
  const passedCount = Math.max(0, evaluatedCount - violationCount)
  const skippedCount = isSample ? 4 : Number(result?.skipped_rule_count || 0)
  const crossCount = isSample
    ? 2
    : Number(result?.cross_validation?.violations?.length || 0)
  const cards = isSample ? CHECK_CARDS : [
    { filter: 'all', tone: crossCount ? 'amber' : 'green', glyph: '⇄', label: 'Cross-document', value: `${crossCount} finding${crossCount === 1 ? '' : 's'}`, note: `${result?.cross_validation?.outcomes?.length || 0} checks evaluated` },
    { filter: 'all', tone: violationCount ? 'amber' : 'green', glyph: '✓', label: 'Validation rules', value: `${passedCount} passed`, note: `${evaluatedCount} evaluated` },
    { filter: 'all', tone: skippedCount ? 'blue' : 'green', glyph: '−', label: 'Skipped rules', value: `${skippedCount} skipped`, note: `${result?.rule_suites?.length || 0} rule suites` },
  ] as const
  return (
    <div className="tab-panel">
      <div className="summary-grid">
        <article className="summary-card critical-summary">
          <div className="summary-icon">!</div>
          <div>
            <small>Requires attention</small>
            <strong>
              {preliminary ? (
                'No high-severity issues'
              ) : (
                <>
                  <span>{criticalTotal}</span> high-severity issue{criticalTotal === 1 ? '' : 's'}
                </>
              )}
            </strong>
            <p>
              {preliminary
                ? 'Add related documents for deeper reconciliation.'
                : isSample
                  ? 'Commercial value differs across two documents.'
                  : `${violationCount} total validation finding${violationCount === 1 ? '' : 's'}.`}
            </p>
          </div>
          <button className="text-link" onClick={onOpenFindings}>
            Review →
          </button>
        </article>

        <article className="summary-card">
          <div className="summary-icon shield">✓</div>
          <div>
            <small>Checks completed</small>
            <strong>
              <span>{passedCount}</span> of <span>{evaluatedCount}</span> passed
            </strong>
            <p>{isSample ? 'Identity, shipment, compliance and integrity.' : `${skippedCount} rule${skippedCount === 1 ? '' : 's'} skipped.`}</p>
          </div>
          <button className="text-link" onClick={onOpenFindings}>
            Details →
          </button>
        </article>
      </div>

      <div className="section-header">
        <div>
          <h2>Verification map</h2>
          <p>Grouped by decision, so the full evidence stays readable.</p>
        </div>
        <button className="quiet-button" onClick={onRunAgain}>
          ↻ Run again
        </button>
      </div>
      <div className="verification-grid">
        {cards.map((card) => (
          <button key={card.filter} className="check-card" onClick={() => onFilterChecks(card.filter)}>
            <span className={`check-icon ${card.tone}`}>{card.glyph}</span>
            <span>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              <em>{card.note}</em>
            </span>
            <b>›</b>
          </button>
        ))}
      </div>

      <div className="section-header documents-heading">
        <div>
          <h2>Trade file</h2>
          <p>
            {documents.length} document{documents.length === 1 ? '' : 's'} classified and extracted
          </p>
        </div>
        <button className="quiet-button" onClick={onAddMore}>
          ＋ Add
        </button>
      </div>
      <div className="document-list">
        {documents.map((doc, i) => (
          <DocumentRow key={`${doc.name}-${i}`} doc={doc} />
        ))}
      </div>
    </div>
  )
}
