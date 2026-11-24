import WorkflowPanel from './WorkflowPanel'
import type { ValidationAggregate } from './api'
export default function HybridReviewPanel({ result, isSample = false }: { result?: ValidationAggregate; isSample?: boolean }) {
  const review = isSample ? undefined : result?.hybrid_review
  if (!review) return <section><WorkflowPanel result={isSample ? undefined : result} /><h2>Supplemental AI review</h2><p>No AI review is recorded for this case. New verifications can include it when enabled; saved results are not automatically recalculated.</p></section>
  return <section className="hybrid-review">
    <WorkflowPanel result={result} />
    <h2>Supplemental AI review</h2>
    <p><strong>{review.status.replaceAll('_', ' ')}</strong></p>
    <p>These interpretations require human review. They do not change extracted facts, rule conclusions, benchmark results, or evidence coverage.</p>
    {review.reason ? <p>{review.reason}</p> : null}
    {review.interpretations.map((item, index) => <article className="check-detail" key={index}>
      <h3>{item.kind.replaceAll('_', ' ')}</h3><p>{item.explanation}</p>
      <p><strong>Suggested next step:</strong> {item.suggested_next_step}</p>
      {item.citations.map(id => {
        const evidence = review.evidence.find(row => row.id === id)
        return <details key={id}><summary>Source {id}: {evidence?.tool.replaceAll('_', ' ') || 'Unavailable'}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 420, overflow: 'auto' }}>{JSON.stringify(evidence?.value ?? { status: 'Evidence unavailable' }, null, 2)}</pre>
        </details>
      })}
    </article>)}
    {review.questions.length ? <><h3>Information needed</h3><ul>{review.questions.map((question, index) => <li key={index}>{question}</li>)}</ul></> : null}
    <details><summary>Review audit record</summary><p>Execution region: {review.data_region.toUpperCase()}. Model processing follows the configured provider endpoint.</p>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify({ policy_version: review.policy_version, input_hash: review.input_hash, output_hash: review.output_hash, model_calls: review.model_calls, tool_calls: review.tool_calls }, null, 2)}</pre>
    </details>
  </section>
}
