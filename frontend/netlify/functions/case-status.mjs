import { getUser } from '@netlify/identity'
import { json, methodNotAllowed, tenantConfig } from './_shared.mjs'

const CASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async (request) => {
  if (request.method !== 'GET') return methodNotAllowed()
  try {
    const user = await getUser()
    if (!user) return json({ error: 'Authentication required' }, 401)

    const caseId = new URL(request.url).searchParams.get('case_id')?.trim()
    if (!caseId || !CASE_ID_PATTERN.test(caseId)) {
      return json({ error: 'A valid case_id is required' }, 400)
    }

    const { backendUrl, tenantId, tenantApiKey } = tenantConfig()
    const response = await fetch(`${backendUrl}/v1/cases/${encodeURIComponent(caseId)}`, {
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Tenant-API-Key': tenantApiKey,
      },
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Unable to retrieve TradeLogX case', error)
    return json({ error: error instanceof Error ? error.message : 'Case status request failed' }, 500)
  }
}
