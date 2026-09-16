import type { MouseEvent } from 'react'
import { DOC_TYPE_OPTIONS } from './data'

interface UploadModalProps {
  selectedType: string
  onSelectType: (type: string) => void
  onContinue: () => void
  onClose: () => void
}

export default function UploadModal({
  selectedType,
  onSelectType,
  onContinue,
  onClose,
}: UploadModalProps) {
  const backdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={backdrop}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <span className="modal-step">ADD TO TRADE FILE</span>
            <h2 id="modal-title">Which documents are you adding?</h2>
            <p>Choose a type, or let Tradelogx classify it automatically.</p>
          </div>
          <button aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="type-grid">
          {DOC_TYPE_OPTIONS.map((option) => (
            <button
              key={option.type}
              className={selectedType === option.type ? 'selected' : undefined}
              onClick={() => onSelectType(option.type)}
            >
              <span>{option.glyph}</span>
              {option.label}
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <span>{selectedType} selected</span>
          <button className="primary" onClick={onContinue}>
            Choose files
          </button>
        </div>
      </div>
    </div>
  )
}
