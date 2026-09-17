/**
 * Static content for the verification workspace.
 *
 * Everything here is demonstration data, mirroring the prototype this interface
 * was ported from. Nothing is fetched and no document contents are processed —
 * wiring these shapes to a real verification service is a separate task.
 */

export type Severity = 'high' | 'medium' | 'low'
export type DocStatus = 'verified' | 'issue' | 'processing'
export type TabId = 'overview' | 'documents' | 'findings' | 'audit'

export interface TradeDocument {
  name: string
  type: string
  pages: number
  confidence: number
  status: DocStatus
  size: string
}

export function dedupeDocuments(documents: ReadonlyArray<TradeDocument>): Array<TradeDocument> {
  const seen = new Set<string>()
  return documents.filter((document) => {
    const key = `${document.name.toLowerCase()}|${document.size}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export interface Finding {
  severity: Severity
  category: string
  title: string
  body: string
  sources: Array<string>
}

export const SAMPLE_DOCUMENTS: ReadonlyArray<TradeDocument> = [
  { name: 'Commercial_Invoice_7642.pdf', type: 'Commercial Invoice', pages: 2, confidence: 99, status: 'issue', size: '1.2 MB' },
  { name: 'Bill_of_Lading_MSKU.pdf', type: 'Bill of Lading', pages: 3, confidence: 98, status: 'verified', size: '2.8 MB' },
  { name: 'Packing_List_7642.pdf', type: 'Packing List', pages: 1, confidence: 99, status: 'verified', size: '620 KB' },
  { name: 'Certificate_of_Origin.pdf', type: 'Certificate of Origin', pages: 1, confidence: 96, status: 'verified', size: '845 KB' },
  { name: 'SGS_Inspection_Certificate.pdf', type: 'Inspection Certificate', pages: 4, confidence: 94, status: 'verified', size: '3.1 MB' },
  { name: 'Cargo_Insurance_Certificate.pdf', type: 'Insurance Certificate', pages: 2, confidence: 97, status: 'issue', size: '1.5 MB' },
]

export const FINDINGS: ReadonlyArray<Finding> = [
  {
    severity: 'high',
    category: 'consistency',
    title: 'Commercial value mismatch',
    body: 'Invoice total is USD 927,350, while the insurance certificate states USD 917,350. The USD 10,000 difference requires confirmation.',
    sources: ['Commercial Invoice · p1', 'Insurance Certificate · p1'],
  },
  {
    severity: 'medium',
    category: 'icc',
    title: 'Insurance coverage below expected CIF uplift',
    body: 'The certificate does not reflect the commonly stipulated 110% CIF coverage. Confirm the contractual or credit requirement before acceptance.',
    sources: ['Insurance Certificate · p1', 'Incoterms® rule set'],
  },
  {
    severity: 'medium',
    category: 'integrity',
    title: 'Stamp region may have been altered',
    body: 'Compression and edge characteristics around the exporter stamp differ from the surrounding page. Request an issuer-original copy.',
    sources: ['Certificate of Origin · p1', 'Image integrity model'],
  },
  {
    severity: 'medium',
    category: 'market',
    title: 'Unit price is 3.8% above demo reference',
    body: 'The invoiced USD 9,273.50/MT is above the configured reference range. Freight, premium and contract date may explain the variance.',
    sources: ['Commercial Invoice · p1', 'Configured benchmark · demo'],
  },
  {
    severity: 'low',
    category: 'consistency',
    title: 'Vessel naming format differs',
    body: '“EVER GIVEN” and “M/V EVER GIVEN” resolve to the same vessel. No action is normally required.',
    sources: ['Bill of Lading · p1', 'Inspection Certificate · p2'],
  },
  {
    severity: 'low',
    category: 'cargo',
    title: 'Container check digit valid',
    body: 'MSCU6639871 passes ISO 6346 check-digit validation and appears consistently in the transport documents.',
    sources: ['Bill of Lading · p2', 'Packing List · p1'],
  },
  {
    severity: 'low',
    category: 'cargo',
    title: 'HS code is consistent',
    body: 'HS 7403.11 is used across the invoice, packing list and origin certificate.',
    sources: ['3 supporting documents'],
  },
  {
    severity: 'low',
    category: 'parties',
    title: 'No sanctions similarity detected',
    body: 'Four named parties were screened with no reviewable similarity above the configured threshold.',
    sources: ['Buyer', 'Seller', 'Carrier', 'Inspection company'],
  },
]

export interface NavItem {
  id: string
  glyph: string
  label: string
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { id: 'workspace', glyph: '⌁', label: 'Workspace' },
  { id: 'documents', glyph: '▤', label: 'Documents' },
  { id: 'rules', glyph: '◇', label: 'Rules library' },
  { id: 'benchmarks', glyph: '↗', label: 'Benchmarks' },
  { id: 'audit', glyph: '◷', label: 'Audit trail' },
]

export interface CheckCard {
  filter: string
  tone: 'amber' | 'blue' | 'green' | 'red'
  glyph: string
  label: string
  value: string
  note: string
}

export const CHECK_CARDS: ReadonlyArray<CheckCard> = [
  { filter: 'consistency', tone: 'amber', glyph: '⇄', label: 'Cross-document', value: '2 inconsistencies', note: '18 fields reconciled' },
  { filter: 'icc', tone: 'blue', glyph: '§', label: 'ICC & trade rules', value: '1 condition to review', note: 'Incoterms® 2020 · UCP checks' },
  { filter: 'cargo', tone: 'green', glyph: '▣', label: 'Cargo & classification', value: 'All checks passed', note: 'Container · HS code · quantity' },
  { filter: 'market', tone: 'amber', glyph: '↗', label: 'Price benchmark', value: '3.8% above reference', note: 'LME-derived demo range' },
  { filter: 'integrity', tone: 'red', glyph: '⌁', label: 'Document integrity', value: '1 suspected alteration', note: 'Stamp region · metadata' },
  { filter: 'parties', tone: 'green', glyph: '◎', label: 'Parties & sanctions', value: 'No matches found', note: '4 entities screened' },
]

export interface DocTypeOption {
  type: string
  glyph: string
  label: string
}

export const DOC_TYPE_OPTIONS: ReadonlyArray<DocTypeOption> = [
  { type: 'Auto-detect', glyph: '✦', label: 'Auto-detect' },
  { type: 'Commercial Invoice', glyph: '▤', label: 'Commercial invoice' },
  { type: 'Bill of Lading', glyph: '▱', label: 'Bill of lading' },
  { type: 'Packing List', glyph: '≣', label: 'Packing list' },
  { type: 'Certificate of Origin', glyph: '◈', label: 'Certificate of origin' },
  { type: 'Inspection Certificate', glyph: '⌕', label: 'Inspection certificate' },
  { type: 'Letter of Credit', glyph: 'LC', label: 'Letter of credit' },
  { type: 'Other Trade Document', glyph: '＋', label: 'Other / 23 more' },
]

export const TIMELINE: ReadonlyArray<[string, string, string]> = [
  ['Verification completed', '46 checks run across 6 document types', 'Today · 10:42'],
  ['Entity screening completed', '4 parties checked against the configured source', 'Today · 10:42'],
  ['Extraction completed', '32 key facts normalized with provenance', 'Today · 10:41'],
  ['Document set classified', '6 documents matched to trade-document schemas', 'Today · 10:40'],
  ['Trade file created', 'Created from guided sample shipment', 'Today · 10:40'],
]

export const DOC_CHIPS: ReadonlyArray<string> = [
  'Bill of lading',
  'Invoice',
  'Packing list',
  'Certificate',
  '+ 25 types',
]

/** Guess a document type from its filename, as the prototype did. */
export function inferType(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('invoice')) return 'Commercial Invoice'
  if (n.includes('lading') || n.includes('b_l')) return 'Bill of Lading'
  if (n.includes('packing')) return 'Packing List'
  if (n.includes('origin')) return 'Certificate of Origin'
  if (n.includes('inspect') || n.includes('sgs')) return 'Inspection Certificate'
  if (n.includes('insurance')) return 'Insurance Certificate'
  if (n.includes('credit') || n.includes('lc_')) return 'Letter of Credit'
  if (n.includes('phyto')) return 'Phytosanitary Certificate'
  if (n.includes('fumigation')) return 'Fumigation Certificate'
  return 'Trade Document'
}

/** Byte count to the "1.2 MB" / "620 KB" form used throughout the UI. */
export function formatSize(bytes: number): string {
  return bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Shared label helpers, so panels agree on wording. */
export const statusLabel = (status: DocStatus): string =>
  status === 'processing' ? 'Extracting' : status === 'issue' ? 'Review' : 'Verified'

export const statusClass = (status: DocStatus): string =>
  status === 'processing' ? 'processing' : status === 'issue' ? 'issue' : ''

export const pageLabel = (pages: number): string => `${pages} page${pages > 1 ? 's' : ''}`

export const extensionOf = (name: string): string =>
  (name.split('.').pop() || '').toUpperCase()
