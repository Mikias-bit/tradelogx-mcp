import type { MouseEvent } from 'react'

interface EvidenceModalProps {
  onAcknowledge: () => void
  onClose: () => void
}

export default function EvidenceModal({ onAcknowledge, onClose }: EvidenceModalProps) {
  const backdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={backdrop}>
      <div className="modal evidence-modal">
        <div className="modal-head">
          <div>
            <span className="severity high">HIGH</span>
            <h2>Commercial value mismatch</h2>
            <p>Values should agree across the invoice and insurance certificate.</p>
          </div>
          <button className="evidence-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="evidence-compare">
          <div>
            <small>COMMERCIAL INVOICE · PAGE 1</small>
            <span>Total invoice value</span>
            <strong>USD 927,350.00</strong>
            <mark>Confidence 99%</mark>
          </div>
          <div className="not-equal">≠</div>
          <div>
            <small>INSURANCE CERTIFICATE · PAGE 1</small>
            <span>Insured commercial value</span>
            <strong>USD 917,350.00</strong>
            <mark>Confidence 97%</mark>
          </div>
        </div>

        <div className="recommended">
          <span>✦</span>
          <div>
            <strong>Recommended action</strong>
            <p>
              Ask the issuer to confirm the correct insured value. If insurance should cover 110% of
              CIF value, the expected insured amount is USD 1,020,085.
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary evidence-close" onClick={onClose}>
            Keep open
          </button>
          <button className="primary" onClick={onAcknowledge}>
            Mark as acknowledged
          </button>
        </div>
      </div>
    </div>
  )
}
