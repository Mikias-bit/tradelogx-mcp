import { refreshSession } from '@netlify/identity'

export interface UploadCandidate {
  filename: string
  size: number
  contentType: string
  documentType: string
}

interface SignedUpload extends UploadCandidate {
  gcsObject: string
  uploadUrl: string
}

export interface SubmissionResponse {
  tenant_id: string
  data_region: 'eu' | 'us'
  result: { case_id: string; [key: string]: unknown }
}

export type CaseState = 'SUBMITTED' | 'NORMALIZED' | 'PLANNED' | 'SUITES_RUNNING' | 'COMPLETE'

export interface ValidationAggregate {
  violation_count?: number
  shipment_score?: number
  severity_counts?: Record<string, number>
  violations?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export interface CaseStatusResponse {
  tenant_id: string
  data_region: 'eu' | 'us'
  result: {
    case_id: string
    state: CaseState
    status: Record<string, unknown>
    results?: ValidationAggregate
  }
}

const DOCUMENT_ROLES: Readonly<Record<string, string>> = {
  'Commercial Invoice': 'commercial_invoice',
  'Bill of Lading': 'bill_of_lading',
  'Packing List': 'packing_list',
  'Certificate of Origin': 'certificate_of_origin',
  'Inspection Certificate': 'inspection_certificate',
  'Letter of Credit': 'letter_of_credit',
  'Insurance Certificate': 'insurance_certificate',
  'Phytosanitary Certificate': 'phytosanitary_certificate',
  'Fumigation Certificate': 'fumigation_certificate',
}

function documentRole(label: string): string {
  const role = DOCUMENT_ROLES[label]
  if (!role) {
    throw new Error(`Choose a supported document type for ${label}; this backend cannot auto-detect it yet`)
  }
  return role
}

function contentType(file: File): string {
  if (file.type) return file.type
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ({
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    csv: 'text/csv', xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  } as Record<string, string>)[extension || ''] || 'application/octet-stream'
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { error?: string }
  if (response.status === 401) {
    window.dispatchEvent(new Event('tradelogx:auth-required'))
    throw new Error('Your session expired. Please sign in again.')
  }
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body as T
}

async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  await refreshSession()
  return fetch(input, { ...init, credentials: 'same-origin' })
}

export async function uploadAndSubmit(
  files: ReadonlyArray<File>,
  documentTypes: ReadonlyArray<string>,
): Promise<SubmissionResponse> {
  const roles = documentTypes.map(documentRole)
  const setupResponse = await authenticatedFetch('/.netlify/functions/create-upload-urls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: files.map((file, index) => ({
      filename: file.name,
      size: file.size,
      contentType: contentType(file),
      documentType: roles[index] || '',
    } satisfies UploadCandidate)) }),
  })
  const { uploads } = await responseJson<{ uploads: Array<SignedUpload> }>(setupResponse)

  await Promise.all(uploads.map(async (upload, index) => {
    const response = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': upload.contentType },
      body: files[index],
    })
    if (!response.ok) throw new Error(`Upload failed for ${upload.filename} (${response.status})`)
  }))

  const submitResponse = await authenticatedFetch('/.netlify/functions/submit-case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents: (() => {
      const occurrences = new Map<string, number>()
      return uploads.map((upload) => {
        const occurrence = (occurrences.get(upload.documentType) || 0) + 1
        occurrences.set(upload.documentType, occurrence)
        return {
          document_type: occurrence === 1
            ? upload.documentType
            : `${upload.documentType}_${occurrence}`,
          gcs_object: upload.gcsObject,
          filename: upload.filename,
        }
      })
    })() }),
  })
  const submission = await responseJson<SubmissionResponse>(submitResponse)
  const orchestrationResponse = await authenticatedFetch('/.netlify/functions/orchestrate-case-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ case_id: submission.result.case_id }),
  })
  if (!orchestrationResponse.ok) {
    const body = await orchestrationResponse.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error || `Unable to start verification (${orchestrationResponse.status})`)
  }
  return submission
}

export async function getCaseStatus(caseId: string): Promise<CaseStatusResponse> {
  const response = await authenticatedFetch(
    `/.netlify/functions/case-status?case_id=${encodeURIComponent(caseId)}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  )
  return responseJson<CaseStatusResponse>(response)
}

export async function waitForCase(
  caseId: string,
  onState?: (state: CaseState) => void,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<CaseStatusResponse> {
  const intervalMs = options.intervalMs ?? 3000
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000
  const deadline = Date.now() + timeoutMs
  while (true) {
    const response = await getCaseStatus(caseId)
    onState?.(response.result.state)
    if (response.result.state === 'COMPLETE') return response
    if (Date.now() >= deadline) {
      throw new Error(`Verification for case ${caseId} is still running; check it again later`)
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
  }
}
