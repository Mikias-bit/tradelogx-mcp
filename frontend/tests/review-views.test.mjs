import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
function component(name) {
  const source = readFileSync(new URL(`../src/workspace/${name}.tsx`, import.meta.url), 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('require', 'exports', output)(name => name.startsWith('./') ? { default: component(name.slice(2)) } : require(name), exports)
  return exports.default
}
const Summary = component('EvidenceSummaryPanel')
const Review = component('HybridReviewPanel')

test('zero coverage is visible and never presented as a default perfect rating', () => {
  const html = renderToStaticMarkup(React.createElement(Summary, { result: { evidence_summary: {
    coverage_percent: 0, conclusive_checks: 0, applicable_or_unresolved_checks: 3, unresolved_checks: 3,
    finding_group_count: 0, highest_finding_severity: 'NONE_RECORDED', review_status: 'INCOMPLETE',
    not_applicable_checks: 0, finding_groups: [], limitations: 'Not a fraud probability',
  } } }))
  assert.match(html, /Evidence coverage: 0%/)
  assert.match(html, /INCOMPLETE/)
  assert.doesNotMatch(html, /100%/)
})

test('AI interpretations remain review proposals and their cited evidence is accessible and escaped', () => {
  const html = renderToStaticMarkup(React.createElement(Review, { result: { hybrid_review: {
    status: 'REVIEW_REQUIRED', data_region: 'eu', model_calls: [], tool_calls: [],
    interpretations: [{ kind: 'EXTRACTION_REVIEW', explanation: '<script>bad()</script>', suggested_next_step: 'Check invoice', citations: ['E1'] }],
    questions: [], evidence: [{ id: 'E1', tool: 'read_rule_evidence', value: { expected: 1156 } }],
  } } }))
  assert.match(html, /require human review/)
  assert.match(html, /Source E1/)
  assert.match(html, /1156/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})

test('old cases do not gain invented AI reviews', () => {
  const html = renderToStaticMarkup(React.createElement(Review, { result: {} }))
  assert.match(html, /No AI review is recorded/)
})

const Workflow = component('WorkflowPanel')
test('workflow shows approved plans, grounded context and source limitations', () => {
  const html = renderToStaticMarkup(React.createElement(Workflow, { result: {
    ai_workflow: { data_region: 'eu', initial_proposal: { status: 'PROPOSED' }, status: 'NO_ADDITIONAL_SUITES_REQUESTED',
      events: ['SERVER_PLAN_VALIDATED', 'REGIONAL_MCP_CHECKS_EXECUTED'],
      shipment_context: [{ kind: 'goods', quote: 'Fresh lychees', document_key: 'invoice', field: 'product', evidence_id: 'S1' }],
      plan_history: [{ plan_id: 'plan-1', suites: ['general', 'perishable'] }], planning_decision: {} },
    validation_plan: { standard_resource_keys: ['ippc.ispm12'] },
  } }))
  assert.match(html, /Fresh lychees/)
  assert.match(html, /general, perishable/)
  assert.match(html, /SERVER PLAN VALIDATED/)
  assert.match(html, /References alone do not establish/)
})

const Governed = component('GovernedReportPanel')
test('governed gaps remain visible with zero coverage and escaped reference text', () => {
  const html = renderToStaticMarkup(React.createElement(Governed, { result: {
    consolidated_report: { status: 'INCOMPLETE', outstanding_count: 1, dimensions: { reference: { completed: 0, required_or_unresolved: 1, coverage_percent: 0 } }, outstanding: [{ id: 'test', status: 'UNAVAILABLE', reason: 'Missing reference', action: 'Supply approved source' }] },
    governed_references: { references: [{ resource_key: 'test', status: 'UPDATE_REVIEW_REQUIRED', sections: [{ section_id: 'one', text: '<script>bad()</script>' }] }] }
  } }))
  assert.match(html, /0%/)
  assert.match(html, /UPDATE_REVIEW_REQUIRED/)
  assert.match(html, /Supply approved source/)
  assert.match(html, /&lt;script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})
