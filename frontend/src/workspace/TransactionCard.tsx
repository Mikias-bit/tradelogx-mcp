interface TransactionCardProps {
  txId: string
  title: string
  meta: string
  confidence: number
  acknowledged: boolean
}

export default function TransactionCard({
  txId,
  title,
  meta,
  confidence,
  acknowledged,
}: TransactionCardProps) {
  return (
    <div className="transaction-card">
      <div className="transaction-main">
        <div className="route-icon">
          CN
          <br />
          <span>→</span>
          <br />
          NL
        </div>
        <div>
          <div className="meta-line">
            <span>{txId}</span>
            <span className={`status-pill ${acknowledged ? 'complete' : 'reviewing'}`}>
              {acknowledged ? 'Acknowledged' : 'Review needed'}
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
