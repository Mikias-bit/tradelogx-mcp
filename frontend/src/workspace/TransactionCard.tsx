interface TransactionCardProps {
  txId: string
  title: string
  meta: string
  confidence: number
  acknowledged: boolean
  isSample?: boolean
  statusLabel?: string
}

export default function TransactionCard({
  txId,
  title,
  meta,
  confidence,
  acknowledged,
  isSample = false,
  statusLabel,
}: TransactionCardProps) {
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
        <small>File confidence</small>
        <strong>{confidence}%</strong>
        <div className="score-bar">
          <i style={{ width: `${confidence}%` }} />
        </div>
      </div>
    </div>
  )
}
