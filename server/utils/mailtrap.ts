/**
 * Mailtrap Testing API source for the dev/demo mail viewer.
 *
 * When the Mailtrap env vars are set, `/api/dev/mail` reads captured messages
 * from the Mailtrap sandbox inbox instead of local disk files — so testers can
 * read activation codes on a deployed (read-only filesystem) environment such
 * as Vercel. Records are mapped to the same shape the local viewer returns.
 */

export interface MailViewerRecord {
  id: string
  createdAt: string
  transport: 'mailtrap'
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface MailtrapMessage {
  id: number
  subject: string
  sent_at: string
  to_email: string
}

const MAILTRAP_API_BASE = 'https://mailtrap.io/api'
const MAX_MESSAGES = 30

export function isMailtrapViewerConfigured() {
  return Boolean(
    process.env.MAILTRAP_API_TOKEN
    && process.env.MAILTRAP_ACCOUNT_ID
    && process.env.MAILTRAP_INBOX_ID
  )
}

function mailtrapHeaders() {
  return { 'Api-Token': process.env.MAILTRAP_API_TOKEN as string }
}

function inboxBase() {
  return `${MAILTRAP_API_BASE}/accounts/${process.env.MAILTRAP_ACCOUNT_ID}/inboxes/${process.env.MAILTRAP_INBOX_ID}`
}

async function fetchBody(messageId: number, ext: 'html' | 'txt') {
  const response = await fetch(`${inboxBase()}/messages/${messageId}/body.${ext}`, {
    headers: mailtrapHeaders()
  })

  return response.ok ? response.text() : ''
}

async function toRecord(message: MailtrapMessage): Promise<MailViewerRecord> {
  const [html, text] = await Promise.all([
    fetchBody(message.id, 'html'),
    fetchBody(message.id, 'txt')
  ])

  return {
    id: String(message.id),
    createdAt: message.sent_at,
    transport: 'mailtrap',
    to: message.to_email,
    subject: message.subject,
    html,
    text
  }
}

export async function listMailtrapEmails(): Promise<MailViewerRecord[]> {
  const response = await fetch(`${inboxBase()}/messages`, { headers: mailtrapHeaders() })

  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: `Mailtrap API error (${response.status}).` })
  }

  const messages = await response.json() as MailtrapMessage[]
  const recent = messages
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
    .slice(0, MAX_MESSAGES)

  return Promise.all(recent.map(toRecord))
}

export async function getMailtrapEmail(id: string): Promise<MailViewerRecord | null> {
  const messageId = Number(id)
  if (!Number.isFinite(messageId)) {
    return null
  }

  const response = await fetch(`${inboxBase()}/messages/${messageId}`, { headers: mailtrapHeaders() })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw createError({ statusCode: 502, statusMessage: `Mailtrap API error (${response.status}).` })
  }

  return toRecord(await response.json() as MailtrapMessage)
}
