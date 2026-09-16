import { CHECK_CARDS, type TradeDocument } from './data'
import DocumentRow from './DocumentRow'

interface OverviewPanelProps {
  documents: Array<TradeDocument>
  /** True once an ad-hoc upload has replaced the sample's high-severity result. */
  preliminary: boolean
  criticalTotal: number
  onOpenFindings: () => void
  onFilterChecks: (filter: string) => void
  onRunAgain: () => void
  onAddMore: () => void
}

export default function OverviewPanel({
  documents,
  preliminary,
  criticalTotal,
  onOpenFindings,
  onFilterChecks,
  onRunAgain,
  onAddMore,
}: OverviewPanelProps) {
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
                  <span>{criticalTotal}</span> high-severity issue
                </>
              )}
            </strong>
            <p>
              {preliminary
                ? 'Add related documents for deeper reconciliation.'
                : 'Commercial value differs across two documents.'}
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
              <span>42</span> of <span>46</span> passed
            </strong>
            <p>Identity, shipment, compliance and integrity.</p>
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
        {CHECK_CARDS.map((card) => (
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
