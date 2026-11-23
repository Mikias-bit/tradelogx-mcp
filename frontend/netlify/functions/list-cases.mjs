import { getUser } from '@netlify/identity'
import { json, methodNotAllowed, tenantConfig, userHeaders } from './_shared.mjs'

export default async (request) => {
  if (request.method !== 'GET') return methodNotAllowed()
  try {
    const user = await getUser()
    if (!user) return json({ error: 'Authentication required' }, 401)
    const cursor = new URL(request.url).searchParams.get('cursor')
    if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) return json({ error: 'Invalid case cursor' }, 400)
    const { backendUrl, tenantId, tenantApiKey } = tenantConfig()
    const query = new URLSearchParams({ limit: '20' })
    if (cursor) query.set('cursor', cursor)
    const response = await fetch(`${backendUrl}/v1/cases?${query}`, {
      headers: userHeaders(user, tenantId, tenantApiKey), signal: AbortSignal.timeout(25000),
    })
    return new Response(await response.text(), { status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch {
    return json({ error: 'Case history is temporarily unavailable. Please retry.' }, 502)
  }
}
