import { useEffect, useState } from 'react'
import { listCases, type CaseHistoryItem } from './api'

export default function CaseHistoryPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<CaseHistoryItem[]>([])
  const [cursor, setCursor] = useState<string>()
  const [next, setNext] = useState<string | null>(null)
  const [pages, setPages] = useState<Array<string | undefined>>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let cancelled = false
    setBusy(true); setError(''); setRows([])
    listCases(cursor).then(response => {
      if (!cancelled) { setRows(response.result.cases); setNext(response.result.next_cursor) }
    }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load cases') })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [cursor, refresh])
  return <section className="case-history">
    <h2>My cases</h2>
    <p>Saved cases belonging to your signed-in account. Open a case to retrieve its documents, processing status, and results.</p>
    <button disabled={busy} onClick={() => setRefresh(value => value + 1)}>Refresh list</button>
    {busy ? <p role="status">Loading saved cases...</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {!busy && !error && !rows.length ? <p>No saved cases found for this account. Cases created before account ownership was recorded require an administrator to establish ownership.</p> : null}
    {rows.map(row => <article className="check-detail" key={row.case_id}>
      <h3>Case {row.case_id.slice(0, 8)}</h3>
      <p>{row.created_at ? new Date(row.created_at * 1000).toLocaleString() : 'Creation date unavailable'} | {row.data_region.toUpperCase()}</p>
      <small>{row.case_id}</small><br />
      <button onClick={() => onOpen(row.case_id)}>Open case</button>
    </article>)}
    <button disabled={busy || !pages.length} onClick={() => { setCursor(pages[pages.length - 1]); setPages(pages.slice(0, -1)) }}>Previous</button>{' '}
    <button disabled={busy || !!error || !next} onClick={() => { setPages([...pages, cursor]); setCursor(next!) }}>Next</button>
  </section>
}
