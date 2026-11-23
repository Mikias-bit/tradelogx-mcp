import { useState } from 'react'
import type { ValidationAggregate } from './api'
import type { Finding } from './data'
import rules from './ruleCatalog.json'
import benchmarks from './priceBenchmarks.json'

interface Props {
  mode: 'rules' | 'benchmarks'
  result?: ValidationAggregate
  isSample: boolean
  onOpenEvidence: (finding: Finding) => void
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []
}

export default function ReferencePanel({ mode, result, isSample, onOpenEvidence }: Props) {
  const [search, setSearch] = useState('')
  const [suite, setSuite] = useState('all')
  const outcomes = isSample ? [] : records(result?.outcomes)
  const skipped = isSample ? [] : records(result?.skipped_rules)
  const priceChecks = outcomes.filter((row) => row.rule_id === 'tbml_benchmark_price_outlier')
  const openCheck = (row: Record<string, unknown>) => {
    const context = row.context && typeof row.context === 'object' ? row.context as Record<string, unknown> : {}
    onOpenEvidence({ title: String(row.name || row.rule_id), ruleId: String(row.rule_id),
      body: String(context.message || row.message || 'Recorded validation result'),
      severity: row.violated ? 'medium' : 'low', category: 'validation',
      sources: row.document_key ? [String(row.document_key)] : [], evidence: { ...context, evaluation_status: row.evaluation_status || "NOT_VERIFIED" } })
  }
  if (mode === 'benchmarks') return (
    <div className="tab-panel reference-panel">
      <h2>Benchmarks</h2>
      <p>Configured reference mappings. Availability depends on provider access and comparable invoice terms.</p>
      <h3>Current file price check</h3>
      {isSample ? <p>This is a sample file. No live price evidence is attached.</p> : priceChecks.length ? priceChecks.map((row, index) => {
        const context = (row.context || {}) as Record<string, unknown>
        return <article className="finding-card" key={index}>
          <div><h3>{String(context.status || (row.violated ? 'Review needed' : 'Price check recorded'))}</h3>
            <p>{String(context.message || context.explanation || 'Open the check to inspect recorded price evidence.')}</p>
          </div>
          <button className="evidence-link" onClick={() => openCheck(row)}>Open check</button>
        </article>
      }) : <p>No price-check evidence was recorded in the available results. This does not mean the invoice price was verified.</p>}
      <h3>Configured mappings</h3>
      <p>Apples, oranges, grapes, and other unmapped goods require an appropriate reference source. No price is inferred for them.</p>
      <div className="reference-table-wrap"><table className="reference-table">
        <thead><tr><th>Commodity</th><th>Provider</th><th>Benchmark</th><th>Currency / unit</th></tr></thead>
        <tbody>{benchmarks.map((row) => <tr key={row.series_id}><td>{row.commodity}</td><td>{row.provider === 'eia' ? 'EIA' : 'Twelve Data'}</td><td>{row.benchmark}</td><td>{row.currency} / {row.unit}</td></tr>)}</tbody>
      </table></div>
      <p>These public references are indicative, not exact contract assessments. This catalog reflects the bundled defaults; server overrides may differ.</p>
    </div>
  )
  const query = search.trim().toLowerCase()
  const visible = rules.filter((rule) => (suite === 'all' || rule.suite === suite) &&
    `${rule.name} ${rule.id} ${rule.suite}`.toLowerCase().includes(query))
  return (
    <div className="tab-panel reference-panel">
      <h2>Rules library</h2>
      <p>Bundled application rules. A rule being listed does not mean it ran for this file. This is not the full text of external standards.</p>
      <div className="reference-controls">
        <label>Search rules<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or rule ID" /></label>
        <label>Rule suite<select value={suite} onChange={(event) => setSuite(event.target.value)}><option value="all">All suites</option>
          {Array.from(new Set(rules.map((rule) => rule.suite))).sort().map((name) => <option key={name} value={name}>{name}</option>)}
        </select></label>
      </div>
      <p>{visible.length} of {rules.length} rules</p>
      {!visible.length ? <p>No rules match this search.</p> : null}
      {visible.map((rule) => {
        const matches = outcomes.filter((row) => row.rule_id === rule.id)
        const skippedMatches = skipped.filter((row) => row.rule_id === rule.id)
        const state = !matches.length ? (skippedMatches.length ? 'Skipped' : 'No execution recorded') :
          matches.some((row) => row.violated) ? 'Review needed' : String(matches[0]?.evaluation_status || 'NOT_VERIFIED').replaceAll('_', ' ')
        return <article className="reference-rule" key={rule.id}>
          <h3>{rule.name}</h3><p>{rule.id} · {rule.suite} · {rule.severity}</p>
          {rule.documents.length ? <p>Required documents: {rule.documents.join(', ')}</p> : null}
          <p>{state}{matches.length && skippedMatches.length ? ' · Some executions skipped' : ''}</p>
          {matches.map((row, index) => <button className="text-link" key={index} onClick={() => openCheck(row)}>Open result{matches.length > 1 ? ` ${index + 1}` : ''}</button>)}
          {skippedMatches.map((row, index) => <p key={index}>Not run: {String(row.reason || 'Reason not supplied')}{Array.isArray(row.missing_documents) && row.missing_documents.length ? ` — missing ${row.missing_documents.join(', ')}` : ''}</p>)}
        </article>
      })}
    </div>
  )
}
