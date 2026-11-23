import { getUser } from '@netlify/identity'
import { json, methodNotAllowed, sameOrigin, tenantConfig, userHeaders } from './_shared.mjs'

export default async (request) => {
  if (request.method !== 'POST') return methodNotAllowed()
  if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
  try {
    const user = await getUser()
    if (!user) return json({ error: 'Authentication required' }, 401)
    const payload = await request.json()
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/.test(payload.case_id || '')) return json({ error: 'Invalid case ID' }, 400)
    const { backendUrl, tenantId, tenantApiKey } = tenantConfig()
    const action = new URL(request.url).pathname.endsWith('case-chat') ? 'chat' : 'retry'
    const response = await fetch(`${backendUrl}/v1/cases/${payload.case_id}/${action}`, {
      method: 'POST', headers: userHeaders(user, tenantId, tenantApiKey),
      body: JSON.stringify(action === 'chat' ? { message: payload.message, history: payload.history || [] } : {}),
      signal: AbortSignal.timeout(action === 'chat' ? 45000 : 20000),
    })
    return new Response(await response.text(), { status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch {
    return json({ error: 'The request could not be completed. Please try again.' }, 502)
  }
}
