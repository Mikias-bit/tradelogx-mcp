import {
  extensionOf,
  pageLabel,
  statusClass,
  statusLabel,
  type TradeDocument,
} from './data'

/** Compact row used in the Overview "Trade file" list. */
export default function DocumentRow({ doc }: { doc: TradeDocument }) {
  return (
    <div className="doc-row">
      <span className="doc-file-icon">{extensionOf(doc.name)}</span>
      <span className="doc-info">
        <strong>{doc.name}</strong>
        <span>
          {doc.type} · {pageLabel(doc.pages)} · {doc.size}
        </span>
      </span>
      <span className={`doc-tag ${statusClass(doc.status)}`}>{statusLabel(doc.status)}</span>
      <button className="more-button">•••</button>
    </div>
  )
}
