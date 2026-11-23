import EvidenceSummaryPanel from './EvidenceSummaryPanel'
import type { ValidationAggregate } from './api'
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, fallback = 'Not recorded') => typeof value === 'string' ? value.replaceAll('_', ' ') : fallback
function Evidence({ value }: { value: unknown }) {
  return <details><summary>View recorded evidence</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(value, null, 2)}</pre></details>
}
export default function ChecksPanel({ result, isSample }: { result?: ValidationAggregate; isSample: boolean }) {
  if (!result || isSample) return <section><h2>Checks and coverage</h2><p>Open a completed live case to inspect its recorded checks.</p></section>
  const entity = record(result.entity_verification)
  const entities = Array.isArray(entity.extracted_entities) ? entity.extracted_entities.map(record) : []
  const integrity = (result.outcomes || []).filter(row => Object.keys(record(record(row.context).layout_analysis)).length > 0)
  const vessel = record(result.vessel_asset_verification)
  return <section className="checks-panel">
    <h2>Checks and coverage</h2><p>These are the checks recorded for this case. Missing evidence does not establish verification.</p>
    <p>{result.evaluated_rule_count ?? 0} rules evaluated; {result.skipped_rule_count ?? 0} skipped. Overall: {text(result.verification_status)}.</p>
    <EvidenceSummaryPanel result={result} />
    <h3>GLEIF / entity verification</h3>
    <Evidence value={entity.verification_summary || { status: 'No capability summary recorded' }} />
    <p>Registry matches concern legal identity. An absent match does not establish fraud; an identifier format check does not confirm registration.</p>
    {!entities.length ? <p>No entity-level evidence recorded.</p> : null}
    {entities.map((row, index) => <article className="check-detail" key={String(row.entity_id || index)}>
      <h4>{text(row.ocr_raw_name, `Entity ${index + 1}`)}</h4>
      <p>{text(row.role_in_transaction)} | {text(row.verification_status)}</p>
      <p>GLEIF name search: {text(record(record(row.verification_evidence).gleif_name_search).status, 'Not recorded')}</p>
      <Evidence value={row} />
    </article>)}
    <h3>Document integrity / possible tampering</h3>
    <p>Layout, PDF, and image signals support manual review. They cannot certify authenticity or prove forgery. Overlapping OCR regions can occur in ordinary documents.</p>
    {!integrity.length ? <p>No document-integrity result recorded.</p> : null}
    {integrity.map((row, index) => {
      const layout = record(record(row.context).layout_analysis)
      return <article className="check-detail" key={index}><h4>{text(row.rule_id)}</h4>
        <p>{text(row.evaluation_status)} | {text(row.message, 'No explanatory message recorded')}</p>
        <p>Template baseline: {layout.baseline_applied === true ? 'Applied' : 'Not applied; template drift is not established'}</p>
        <Evidence value={row} /></article>
    })}
    <h3>Vessel / asset verification</h3>
    <p>{vessel.enabled === false ? 'Disabled for this case' : text(vessel.status, 'No evidence recorded')}</p><Evidence value={vessel} />
    <h3>Skipped rules</h3>
    {Array.isArray(result.skipped_rules) && result.skipped_rules.length ? <Evidence value={result.skipped_rules} /> : <p>No skipped-rule details recorded.</p>}
    <h3>All recorded rule outcomes</h3>
    <p>Includes passed, incomplete, and skipped checks where recorded. Screening candidates require review and are not confirmed sanctions matches.</p>
    {(result.outcomes || []).map((row, index) => <details className="check-detail" key={index}>
      <summary>{text(row.rule_id)} | {text(row.evaluation_status)}</summary>
      <p>{text(row.message)}</p><Evidence value={row} />
    </details>)}
  </section>
}
