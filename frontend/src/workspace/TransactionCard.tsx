interface TransactionCardProps {
  txId: string
  title: string
  meta: string
  evidenceCoverage?: number | null
  confidence: number | null
  acknowledged: boolean
  isSample?: boolean
  statusLabel?: string
}

export default function TransactionCard({
  txId,
  title,
  meta,
  confidence,
  evidenceCoverage,
  acknowledged,
  isSample = false,
  statusLabel,
}: TransactionCardProps) {
  const isCoverage = !isSample && evidenceCoverage !== undefined
  const metric = isCoverage ? evidenceCoverage : confidence
  return (
    <div className="transaction-card">
      <div className="transaction-main">
        <div className="route-icon">
          {isSample ? <><span>CN</span><br /><span>→</span><br /><span>NL</span></> : <><span>TRADE</span><br /><span>✓</span><br /><span>FILE</span></>}
        </div>
        <div>
          <div className="meta-line">
            <span>{txId}</span>
            <span className={`status-pill ${acknowledged ? 'complete' : 'reviewing'}`}>
              {statusLabel || (acknowledged ? 'Acknowledged' : 'Review needed')}
            </span>
          </div>
          <h2>{title}</h2>
          <p>{meta}</p>
        </div>
      </div>
      <div className="score-block">
        <small>{isSample ? "Sample confidence" : isCoverage ? "Evidence coverage" : "Legacy rule score"}</small>
        <strong>{metric === null ? "Not available" : `${metric ?? 0}%`}</strong>
        <div className="score-bar">
          <i style={{ width: `${metric ?? 0}%` }} />
        </div>
        {isCoverage ? <small>Conclusive checks, not authenticity</small> : null}
      </div>
    </div>
  )
}
