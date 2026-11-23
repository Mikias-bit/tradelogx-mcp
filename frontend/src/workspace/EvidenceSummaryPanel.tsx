import type { ValidationAggregate } from './api'
export default function EvidenceSummaryPanel({ result }: { result?: ValidationAggregate }) {
  const summary = result?.evidence_summary
  if (!summary) return null
  return <section className="check-detail" aria-label="Evidence and finding summary">
    <h3>Evidence, findings, and review</h3>
    <p><strong>Evidence coverage: {summary.coverage_percent === null ? 'Unavailable' : `${summary.coverage_percent}%`}</strong> ({summary.conclusive_checks} of {summary.applicable_or_unresolved_checks} applicable or unresolved checks reached a conclusion).</p>
    <p><strong>Finding severity: {summary.highest_finding_severity.replaceAll('_', ' ')}</strong> | {summary.finding_group_count} grouped rule findings.</p>
    <p><strong>Review status: {summary.review_status.replaceAll('_', ' ')}</strong> | {summary.unresolved_checks} unresolved checks; {summary.not_applicable_checks} not applicable.</p>
    <p>{summary.limitations}</p>
    <details><summary>Grouped findings and legacy scoring</summary>
      <p>Related arithmetic findings on the same document share one group. The legacy penalty score is retained only for audit: {typeof result?.legacy_penalty_score === 'number' ? result.legacy_penalty_score : 'Unavailable'}. It is not a probability or an authenticity rating.</p>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(summary.finding_groups, null, 2)}</pre>
    </details>
  </section>
}
