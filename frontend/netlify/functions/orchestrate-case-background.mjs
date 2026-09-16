import { getUser } from '@netlify/identity'
import { tenantConfig } from './_shared.mjs'

const CASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async (request) => {
  if (request.method !== 'POST') return
  const user = await getUser()
  if (!user) throw new Error('Authentication required')

  const payload = await request.json()
  const caseId = typeof payload?.case_id === 'string' ? payload.case_id.trim() : ''
  if (!CASE_ID_PATTERN.test(caseId)) throw new Error('A valid case_id is required')

  const { backendUrl, tenantId, tenantApiKey } = tenantConfig()
  const response = await fetch(`${backendUrl}/v1/cases/${encodeURIComponent(caseId)}/orchestrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
      'X-Tenant-API-Key': tenantApiKey,
    },
    body: JSON.stringify({ include_resources: false }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Case orchestration failed (${response.status}): ${text.slice(0, 500)}`)
  }
}

export const config = { type: 'background' }
