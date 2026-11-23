import { createHash } from 'node:crypto'
import { Storage } from '@google-cloud/storage'

const jsonHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders })
}

export function methodNotAllowed() {
  return json({ error: 'Method not allowed' }, 405)
}

export function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function tenantConfig() {
  return {
    backendUrl: requireEnv('TRADELOGX_BACKEND_URL').replace(/\/$/, ''),
    tenantId: requireEnv('TRADELOGX_TENANT_ID'),
    tenantApiKey: requireEnv('TRADELOGX_TENANT_API_KEY'),
    bucket: requireEnv('TRADELOGX_GCS_BUCKET'),
  }
}

export function storageClient() {
  const raw = requireEnv('GOOGLE_SERVICE_ACCOUNT_JSON')
  let credentials
  try {
    credentials = JSON.parse(raw)
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON')
  }
  if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
  return new Storage({
    projectId: credentials.project_id || 'pdf2gdoc-with-vnlp',
    credentials,
  })
}

export function safeFilename(value) {
  return String(value || 'document')
    .normalize('NFKC')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180) || 'document'
}

export function ownerPrefix(tenantId, userId) {
  if (typeof userId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(userId)) throw new Error('Invalid user identity')
  return `uploads/${createHash('sha256').update(`${tenantId}:${userId}`).digest('hex')}/`
}

export function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin
}

export function userHeaders(user, tenantId, tenantApiKey) {
  ownerPrefix(tenantId, user.id)
  return { 'Content-Type': 'application/json', 'X-Tenant-ID': tenantId,
    'X-Tenant-API-Key': tenantApiKey, 'X-User-ID': user.id }
}
