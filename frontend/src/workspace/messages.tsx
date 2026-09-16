import type { ReactNode } from 'react'

export interface AssistantMessage {
  id: number
  role: 'assistant'
  body: ReactNode
  prompts?: Array<string>
  /** Only the opening message's prompts trigger actions, as in the original. */
  promptActions?: Array<'sample' | 'required' | 'checks'>
}

export interface UserMessage {
  id: number
  role: 'user'
  text: string
}

export type ThreadMessage = AssistantMessage | UserMessage

export const OPENING: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <>
      <p>
        <strong>Let’s verify a trade file.</strong>
      </p>
      <p>Add any document you already have—I’ll identify it and tell you what is still needed.</p>
    </>
  ),
  prompts: ['Try a sample shipment', 'What documents do I need?', 'What can you verify?'],
  promptActions: ['sample', 'required', 'checks'],
}

export const SAMPLE_VERIFIED: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <>
      <p>
        <strong>I verified the sample shipment.</strong>
      </p>
      <p>
        Six documents produced 46 checks. One value mismatch should be resolved first: the invoice
        and insurance certificate differ by USD 10,000.
      </p>
    </>
  ),
  prompts: ['Show the evidence', 'Give me a review checklist'],
}

export function received(count: number, types: Array<string>): Omit<AssistantMessage, 'id'> {
  return {
    role: 'assistant',
    body: (
      <>
        <p>
          <strong>
            I received {count} document{count > 1 ? 's' : ''}.
          </strong>
        </p>
        <p>
          {types.join(', ')} {count > 1 ? 'were' : 'was'} detected. I’m checking structure,
          identifiers and trade terms now.
        </p>
      </>
    ),
  }
}

export const PRELIMINARY_READY: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <>
      <p>
        <strong>Preliminary verification is ready.</strong>
      </p>
      <p>
        The uploaded documents passed basic integrity and structure checks. Add the invoice,
        transport document and packing list to compare values across the full transaction.
      </p>
    </>
  ),
  prompts: ['Add missing documents', 'Open document results'],
}

export const REQUIRED_DOCS: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <p>
      For this commodity shipment, start with the{' '}
      <strong>commercial invoice, bill of lading and packing list</strong>. Then add origin,
      inspection and insurance certificates for stronger compliance and integrity checks.
    </p>
  ),
}

export const WHAT_I_CHECK: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <p>
      I check facts across documents, ICC-related conditions, ISO 6346 container numbers, HS codes,
      Incoterms, price ranges, party similarity and signs of digital alteration. Every result links
      back to evidence.
    </p>
  ),
}

/** Reply chosen from keywords in whatever the operator typed. */
export function replyTo(text: string): Omit<AssistantMessage, 'id'> {
  const lower = text.toLowerCase()

  if (lower.includes('high') || lower.includes('evidence') || lower.includes('mismatch')) {
    return {
      role: 'assistant',
      body: (
        <p>
          The high issue is a <strong>USD 10,000 value mismatch</strong> between the commercial
          invoice and insurance certificate. Open the evidence comparison, confirm the issuer’s
          value, then replace or acknowledge the certificate.
        </p>
      ),
      prompts: ['Open evidence'],
    }
  }

  if (lower.includes('next') || lower.includes('do')) {
    return {
      role: 'assistant',
      body: (
        <p>
          Review the value mismatch first, then ask the insurer for a corrected certificate. After
          replacement, run verification again and export the audit-ready report.
        </p>
      ),
    }
  }

  return {
    role: 'assistant',
    body: (
      <p>
        I can help interpret discrepancies, identify missing documents, explain rule checks, or
        build a next-action list for this trade file.
      </p>
    ),
    prompts: ['Explain current findings', 'List missing documents'],
  }
}

export const HIGH_ISSUE_DETAIL: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <p>
      The invoice is USD 927,350, while the insurance certificate is USD 917,350. Review both fields
      and request issuer confirmation before release.
    </p>
  ),
}

export const REVIEW_CHECKLIST: Omit<AssistantMessage, 'id'> = {
  role: 'assistant',
  body: (
    <p>
      1. Resolve the commercial value mismatch.
      <br />
      2. Confirm required insurance coverage.
      <br />
      3. Obtain an issuer-original origin certificate.
      <br />
      4. Re-run verification and export the audit report.
    </p>
  ),
}
