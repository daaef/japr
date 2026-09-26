/**
 * Mailtrap Testing API client for E2E tests.
 * Reads emails from the Mailtrap sandbox inbox to extract activation codes,
 * password reset links, and review invitation URLs.
 */

import { env } from './env'

const API_BASE = 'https://mailtrap.io/api'

function headers() {
  return {
    'Api-Token': env.mailtrap.apiToken,
    'Content-Type': 'application/json'
  }
}

function inboxUrl() {
  return `${API_BASE}/accounts/${env.mailtrap.accountId}/inboxes/${env.mailtrap.inboxId}`
}

interface MailtrapMessage {
  id: number
  subject: string
  sent_at: string
  to_email: string
  html_body_size: number
  text_body_size: number
}

interface MailtrapMessageDetail extends MailtrapMessage {
  html_body: string
  text_body: string
}

/** List recent messages in the inbox. */
async function listMessages(limit = 30): Promise<MailtrapMessage[]> {
  const res = await fetch(`${inboxUrl()}/messages?page=1&per_page=${limit}`, { headers: headers() })
  if (!res.ok) throw new Error(`Mailtrap list failed: ${res.status} ${await res.text()}`)
  return res.json()
}

/** Get the HTML body of a specific message. */
async function getMessageHtml(messageId: number): Promise<string> {
  const res = await fetch(`${inboxUrl()}/messages/${messageId}/body.html`, { headers: headers() })
  if (!res.ok) throw new Error(`Mailtrap body failed: ${res.status}`)
  return res.text()
}

/** Get the text body of a specific message. */
async function getMessageText(messageId: number): Promise<string> {
  const res = await fetch(`${inboxUrl()}/messages/${messageId}/body.txt`, { headers: headers() })
  if (!res.ok) throw new Error(`Mailtrap text body failed: ${res.status}`)
  return res.text()
}

/**
 * Wait for an email matching the given criteria. Polls every `intervalMs`
 * until a match is found or `timeoutMs` elapses.
 */
export async function waitForEmail(
  opts: {
    to: string
    subjectContains?: string
    after?: Date
    timeoutMs?: number
    intervalMs?: number
  }
): Promise<{ id: number, subject: string, html: string, text: string }> {
  const timeout = opts.timeoutMs ?? 30_000
  const interval = opts.intervalMs ?? 3_000
  const after = opts.after ?? new Date(Date.now() - 60_000)
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    const messages = await listMessages()

    const match = messages.find(m => {
      const sentAt = new Date(m.sent_at)
      const toMatch = m.to_email.toLowerCase().includes(opts.to.toLowerCase())
      const subjectMatch = !opts.subjectContains
        || m.subject.toLowerCase().includes(opts.subjectContains.toLowerCase())
      return toMatch && subjectMatch && sentAt > after
    })

    if (match) {
      const [html, text] = await Promise.all([
        getMessageHtml(match.id),
        getMessageText(match.id)
      ])
      return { id: match.id, subject: match.subject, html, text }
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(
    `Timed out waiting for email to="${opts.to}" subject~="${opts.subjectContains ?? '*'}" after ${timeout}ms`
  )
}

/**
 * Extract a 6-digit activation code from an email's HTML body.
 * Looks for patterns like "123456" that appear as standalone codes.
 */
export function extractActivationCode(html: string): string {
  // Look for a 6-digit code — activation emails typically render the code
  // prominently, often in a <strong>, <span>, or standalone block.
  const patterns = [
    /<(?:strong|b|span|code|h\d)[^>]*>\s*(\d{6})\s*<\//i,
    /activation\s*(?:code|pin)?[:\s]*(\d{6})/i,
    /code[:\s]*(\d{6})/i,
    /\b(\d{6})\b/
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }

  throw new Error('Could not extract activation code from email body')
}

/**
 * Extract a URL from an email body — used for password reset links
 * and review invitation links.
 */
export function extractLink(html: string, pathContains: string): string {
  const urlPattern = new RegExp(
    `https?://[^"'\\s<>]+${pathContains.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"'\\s<>]*`,
    'i'
  )
  const match = html.match(urlPattern)
  if (!match) {
    throw new Error(`Could not find link containing "${pathContains}" in email body`)
  }
  return match[0]
}

/** Delete all messages in the inbox (cleanup between test runs). */
export async function cleanInbox(): Promise<void> {
  await fetch(`${inboxUrl()}/clean`, {
    method: 'PATCH',
    headers: headers()
  })
}
