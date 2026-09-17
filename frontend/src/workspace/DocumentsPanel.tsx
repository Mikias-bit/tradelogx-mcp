import {
  extensionOf,
  pageLabel,
  statusClass,
  statusLabel,
  type TradeDocument,
} from './data'

interface DocumentsPanelProps {
  documents: Array<TradeDocument>
  onAdd: () => void
}

export default function DocumentsPanel({ documents, onAdd }: DocumentsPanelProps) {
  return (
    <div className="tab-panel">
      <div className="panel-title">
        <div>
          <h2>Documents</h2>
          <p>Originals, extraction status and document-level evidence.</p>
        </div>
        <button className="primary" onClick={onAdd}>
          ＋ Add documents
        </button>
      </div>

      <div className="document-table">
        <div className="doc-table-head">
          <span>File</span>
          <span>Type</span>
          <span>Extraction</span>
          <span>Status</span>
          <span></span>
        </div>
        {documents.map((doc, i) => (
          <div className="doc-table-row" key={`${doc.name}-${i}`}>
            <span className="file-cell">
              <span className="doc-file-icon">{extensionOf(doc.name)}</span>
              <div>
                <strong>{doc.name}</strong>
                <small>
                  {doc.size} · {pageLabel(doc.pages)}
                </small>
              </div>
            </span>
            <span>{doc.type}</span>
            <span>
              {doc.status === 'processing' ? (
                'Extracting…'
              ) : (
                <>
                  <i className="extraction-bar">
                    <i style={{ width: `${doc.confidence}%` }} />
                  </i>
                  {doc.confidence}%
                </>
              )}
            </span>
            <span className={`doc-tag ${statusClass(doc.status)}`}>{statusLabel(doc.status)}</span>
            <button className="more-button">•••</button>
          </div>
        ))}
      </div>
    </div>
  )
}
