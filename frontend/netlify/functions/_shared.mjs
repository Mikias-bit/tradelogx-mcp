import { Storage } from '@google-cloud/storage'

const jsonHeaders = { 'Content-Type': 'application/json' }

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
