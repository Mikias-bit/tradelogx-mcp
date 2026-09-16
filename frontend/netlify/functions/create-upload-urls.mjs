import { randomUUID } from 'node:crypto'
import { getUser } from '@netlify/identity'
import { json, methodNotAllowed, safeFilename, storageClient, tenantConfig } from './_shared.mjs'

const MAX_FILES = 25
const MAX_FILE_BYTES = 25 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export default async (request) => {
  if (request.method !== 'POST') return methodNotAllowed()
  try {
    const user = await getUser()
    if (!user) return json({ error: 'Authentication required' }, 401)
    const payload = await request.json()
    const files = payload?.files
    if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
      return json({ error: `files must contain between 1 and ${MAX_FILES} items` }, 400)
    }
    const { bucket } = tenantConfig()
    const storage = storageClient()
    const expires = Date.now() + 15 * 60 * 1000
    const uploads = await Promise.all(files.map(async (item) => {
      const filename = safeFilename(item?.filename)
      const size = Number(item?.size)
      const contentType = String(item?.contentType || 'application/octet-stream')
      if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
        throw new Error(`${filename} must be between 1 byte and 25 MB`)
      }
      if (!ALLOWED_TYPES.has(contentType)) {
        throw new Error(`${filename} has unsupported content type ${contentType}`)
      }
      const date = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
      const gcsObject = `uploads/${date}_${randomUUID()}_${filename}`
      const [uploadUrl] = await storage.bucket(bucket).file(gcsObject).getSignedUrl({
        version: 'v4', action: 'write', expires, contentType,
      })
      return {
        filename,
        documentType: String(item?.documentType || 'auto'),
        contentType,
        gcsObject,
        uploadUrl,
      }
    }))
    return json({ uploads })
  } catch (error) {
    console.error('Unable to create signed upload URLs', error)
    return json({ error: error instanceof Error ? error.message : 'Upload setup failed' }, 500)
  }
}
