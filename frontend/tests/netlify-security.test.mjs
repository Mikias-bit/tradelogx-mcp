import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { ownerPrefix, sameOrigin, userHeaders, json } from '../netlify/functions/_shared.mjs'

test('uploads are scoped to both the tenant and authenticated user', () => {
  const alice = ownerPrefix('acme', 'alice')
  assert.equal(alice, `uploads/${createHash('sha256').update('acme:alice').digest('hex')}/`)
  assert.notEqual(alice, ownerPrefix('acme', 'bob'))
  assert.notEqual(alice, ownerPrefix('other', 'alice'))
  assert.throws(() => ownerPrefix('acme', '../alice'))
  assert.throws(() => ownerPrefix('acme', undefined))
})

test('mutation origin must match the authenticated site', () => {
  const request = origin => new Request('https://verify.example/.netlify/functions/submit-case', {
    method: 'POST', headers: origin ? { origin } : {},
  })
  assert.equal(sameOrigin(request('https://verify.example')), true)
  assert.equal(sameOrigin(request('https://attacker.example')), false)
  assert.equal(sameOrigin(request(null)), false)
})

test('trusted user identity is forwarded separately from the tenant credential', () => {
  assert.deepEqual(userHeaders({ id: 'alice' }, 'acme', 'private-test-credential'), {
    'Content-Type': 'application/json', 'X-Tenant-ID': 'acme',
    'X-Tenant-API-Key': 'private-test-credential', 'X-User-ID': 'alice',
  })
  assert.throws(() => userHeaders({}, 'acme', 'private-test-credential'))
})

test('customer responses are not cacheable', () => {
  assert.equal(json({ case_id: 'example' }).headers.get('cache-control'), 'no-store')
})
