import { getUser } from '@netlify/identity'
import { json, methodNotAllowed, tenantConfig } from './_shared.mjs'

export default async (request) => {
  if (request.method !== 'POST') return methodNotAllowed()
  try {
    const user = await getUser()
    if (!user) return json({ error: 'Authentication required' }, 401)
    const payload = await request.json()
    if (!Array.isArray(payload?.documents) || payload.documents.length === 0) {
      return json({ error: 'documents must be a non-empty list' }, 400)
    }
    for (const document of payload.documents) {
      if (typeof document?.gcs_object !== 'string' || !document.gcs_object.startsWith('uploads/')) {
        return json({ error: 'Every document must have an uploads/ GCS object' }, 400)
      }
    }
    const { backendUrl, tenantId, tenantApiKey } = tenantConfig()
    const response = await fetch(`${backendUrl}/v1/cases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
        'X-Tenant-API-Key': tenantApiKey,
      },
      body: JSON.stringify({
        documents: payload.documents,
        email: payload.email || null,
        wait_for_result: false,
        include_resources: true,
      }),
    })
    const text = await response.text()
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    })
  } catch (error) {
    console.error('Unable to submit TradeLogX case', error)
    return json({ error: error instanceof Error ? error.message : 'Case submission failed' }, 500)
  }
}
