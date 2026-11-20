import { useEffect, useRef, type MouseEvent } from 'react'
import type { Finding } from './data'

interface EvidenceModalProps {
  finding: Finding
  onClose: () => void
}

function EvidenceValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span>Not supplied</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span>None recorded</span>
    return <ol>{value.map((item, index) => <li key={index}><EvidenceValue value={item} /></li>)}</ol>
  }
  if (typeof value === 'object') {
    return <dl>{Object.entries(value).map(([key, item]) => (
      <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd><EvidenceValue value={item} /></dd></div>
    ))}</dl>
  }
  return <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
}

export default function EvidenceModal({ finding, onClose }: EvidenceModalProps) {
  const modal = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    close.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
      if (event.key !== 'Tab') return
      const buttons = modal.current?.querySelectorAll<HTMLButtonElement>('button')
      if (!buttons?.length) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [onClose])
  const backdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }
  const hasEvidence = finding.evidence && Object.keys(finding.evidence).length > 0
  return (
    <div className="modal-backdrop" onClick={backdrop}>
      <div className="modal evidence-modal" ref={modal} role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <div className="modal-head">
          <div>
            <span className={`severity ${finding.severity}`}>{finding.severity.toUpperCase()}</span>
            <h2 id="evidence-title">{finding.title}</h2>
            <p>{finding.body}</p>
          </div>
          <button ref={close} aria-label="Close evidence" onClick={onClose}>×</button>
        </div>
        <div className="evidence-details">
          {finding.ruleId ? <p><strong>Check:</strong> {finding.ruleId}</p> : null}
          {finding.sources.length ? <p><strong>Sources:</strong> {finding.sources.join(' · ')}</p> : null}
          <h3>Recorded evidence</h3>
          {hasEvidence ? <EvidenceValue value={finding.evidence} /> : (
            <p>No additional evidence was supplied for this finding. The finding summary is shown above.</p>
          )}
        </div>
        <div className="modal-actions"><button className="secondary" onClick={onClose}>Close</button></div>
      </div>
    </div>
  )
}
