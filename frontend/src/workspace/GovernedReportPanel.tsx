import type { ValidationAggregate } from './api'
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const text = (value: unknown, fallback = 'Not recorded') => typeof value === 'string' ? value : fallback
export default function GovernedReportPanel({ result }: { result?: ValidationAggregate }) {
  const report = record(result?.consolidated_report)
  const governed = record(result?.governed_references)
  if (!Object.keys(report).length && !Object.keys(governed).length) return null
  const dimensions = record(report.dimensions)
  return <section className="check-detail">
    <h2>Verification coverage and outstanding actions</h2>
    <p><strong>{text(report.status)}</strong>. Coverage describes available evidence; it is not a clearance or fraud-probability score.</p>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Area</th><th>Completed / required or unresolved</th><th>Coverage</th></tr></thead><tbody>
      {Object.entries(dimensions).map(([key, value]) => { const row = record(value); return <tr key={key}><td>{key.replaceAll('_', ' ')}</td><td>{String(row.completed ?? 0)} / {String(row.required_or_unresolved ?? 0)}</td><td>{typeof row.coverage_percent === 'number' ? `${row.coverage_percent}%` : 'Not assessed'}</td></tr> })}
    </tbody></table></div>
    <p>Highest recorded finding severity: {text(report.highest_finding_severity)}. Outstanding requirements: {String(report.outstanding_count ?? 0)}.</p>
    <details><summary>What is missing and what to do next</summary>
      {list(report.outstanding).map((value, index) => { const row = record(value); return <article key={index}><h4>{text(row.id)} - {text(row.status)}</h4><p>{text(row.reason)}</p><p>{text(row.action)}</p></article> })}
    </details>
    <h3>References and source updates</h3>
    <p>Reference date: {text(record(governed.context).as_of, 'Missing or ambiguous')}. References are pinned to this case; source changes require review.</p>
    {list(governed.references).map((value, index) => { const row = record(value); return <details key={index}><summary>{text(row.resource_key)} - {text(row.status)}</summary>
      <p>{text(row.reason)}</p><p>Edition: {text(row.edition)}. Source check: {text(row.update_check)}.</p><p>Source: {text(row.source_uri)}</p>
      {list(row.sections).map((value, i) => { const section = record(value); return <blockquote key={i}><strong>{text(section.section_id)}</strong><p style={{ whiteSpace: 'pre-wrap' }}>{text(section.text)}</p>{section.truncated === true ? <small>Excerpt truncated; consult the complete reference.</small> : null}</blockquote> })}
      <p>{text(row.action)}</p>
    </details> })}
    <h3>Additional regulatory checks</h3>
    {list(governed.tools).map((value, index) => { const row = record(value); return <details key={index}><summary>{text(row.tool)} - {text(row.status)}</summary><p>{text(row.reason)}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(row.evidence ?? {}, null, 2)}</pre></details> })}
  </section>
}
