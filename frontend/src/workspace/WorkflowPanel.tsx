import type { ValidationAggregate } from './api'
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
export default function WorkflowPanel({ result }: { result?: ValidationAggregate }) {
  const workflow = record(result?.ai_workflow)
  if (!Object.keys(workflow).length) return null
  const initial = record(workflow.initial_proposal)
  const assessment = record(workflow.assessment)
  const decision = record(workflow.planning_decision)
  const plan = record(result?.validation_plan)
  const proposals = [record(initial.proposal), record(assessment.proposal)]
  const questions = [...new Set(proposals.flatMap(row => list(row.questions).filter((value): value is string => typeof value === 'string')))]
  return <section className="check-detail">
    <h2>Shipment context and verification workflow</h2>
    <p>Execution region: <strong>{text(workflow.data_region).toUpperCase()}</strong>. Rules and benchmarks remain authoritative; AI selects candidate checks subject to server validation.</p>
    <p>Initial AI proposal: <strong>{text(initial.status).replaceAll('_', ' ')}</strong>. {text(initial.reason)}</p>
    <ol>{list(workflow.events).map((event, index) => <li key={index}>{text(event).replaceAll('_', ' ')}</li>)}</ol>
    <p>Outcome: <strong>{text(workflow.status).replaceAll('_', ' ')}</strong>. At most one additive planning round is permitted; unresolved questions remain for review.</p>
    <h3>Extracted shipment context</h3>
    <p>These are cited extraction values, not independently confirmed shipment facts.</p>
    <ul>{list(workflow.shipment_context).map((value, index) => {
      const row = record(value)
      return <li key={index}><strong>{text(row.kind)}:</strong> {text(row.quote)} <small>({text(row.document_key)} / {text(row.field)}; source {text(row.evidence_id)})</small></li>
    })}</ul>
    <h3>Approved plan</h3>
    {list(workflow.plan_history).map((value, index) => {
      const row = record(value)
      return <p key={index}>Plan {index + 1}: {list(row.suites).map(value => text(value)).join(', ')} <small>({text(row.plan_id)})</small></p>
    })}
    <p>Standards reference keys: {list(plan.standard_resource_keys).map(value => text(value)).join(', ') || 'None recorded'}. References alone do not establish source text, edition, or applicability.</p>
    {questions.length ? <><h3>Evidence questions</h3><ul>{questions.map((question, index) => <li key={index}>{question}</li>)}</ul></> : null}
    <details><summary>Why checks were accepted or rejected</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(decision, null, 2)}</pre></details>
  </section>
}
