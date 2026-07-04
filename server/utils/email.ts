import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import nodemailer, { type Transporter } from 'nodemailer'
import { Resend } from 'resend'

export interface AppEmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface LocalEmailRecord extends AppEmailPayload {
  id: string
  createdAt: string
  transport: 'local'
}

const isProduction = process.env.NODE_ENV === 'production'
const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM ?? `JAPR <noreply@${process.env.MAIL_DOMAIN ?? 'journal.local'}>`
const mailFrom = process.env.MAIL_FROM ?? resendFrom
const emailTransport = (process.env.EMAIL_TRANSPORT ?? (resendApiKey ? 'resend' : 'local')).toLowerCase()
const localMailDir = resolve(process.cwd(), process.env.LOCAL_MAIL_DIR ?? '.data/mail')

let smtpTransport: Transporter | null = null

function getSmtpTransport() {
  if (smtpTransport) {
    return smtpTransport
  }

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('EMAIL_TRANSPORT=smtp requires SMTP_HOST, SMTP_USER and SMTP_PASS.')
  }

  smtpTransport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    // true only for implicit TLS on port 465; STARTTLS ports (587/2525) use false.
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  })

  return smtpTransport
}

function toPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Escape user-controlled values before interpolating them into email HTML.
 * Captured-to-disk mail is low risk, but once EMAIL_TRANSPORT=resend is enabled,
 * unescaped names/titles/letters become an HTML/script-injection vector in
 * outgoing mail. Safe for both text and double-quoted attribute contexts.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function ensureLocalMailDir() {
  await mkdir(localMailDir, { recursive: true })
}

async function writeLocalEmail(payload: AppEmailPayload) {
  await ensureLocalMailDir()

  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const record: LocalEmailRecord = {
    id,
    createdAt,
    transport: 'local',
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text ?? toPlainText(payload.html)
  }

  const filePath = join(localMailDir, `${createdAt.replaceAll(':', '-')}-${id}.json`)
  await writeFile(filePath, JSON.stringify(record, null, 2), 'utf8')
  return record
}

export async function sendEmail(payload: AppEmailPayload) {
  if (emailTransport === 'smtp') {
    return getSmtpTransport().sendMail({
      from: mailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? toPlainText(payload.html)
    })
  }

  if (emailTransport === 'resend' && resendApiKey) {
    const resend = new Resend(resendApiKey)

    return resend.emails.send({
      from: mailFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? toPlainText(payload.html)
    })
  }

  // The local transport writes to disk, which fails on read-only serverless
  // filesystems (e.g. Vercel). Surface a clear config error instead of a
  // generic 500 raised deep inside a request handler.
  if (isProduction) {
    throw new Error('EMAIL_TRANSPORT=local is not supported in production (read-only filesystem). Set EMAIL_TRANSPORT=smtp or resend.')
  }

  return writeLocalEmail(payload)
}

export async function listLocalEmails() {
  await ensureLocalMailDir()
  const files = await readdir(localMailDir)
  const jsonFiles = files.filter(file => file.endsWith('.json')).sort().reverse()

  const records = await Promise.all(jsonFiles.map(async (file) => {
    const record = JSON.parse(await readFile(join(localMailDir, file), 'utf8')) as LocalEmailRecord
    return record
  }))

  return records
}

export async function getLocalEmail(id: string) {
  const emails = await listLocalEmails()
  return emails.find(email => email.id === id) ?? null
}

function buildBaseEmail(title: string, body: string) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1c1917; max-width: 640px; margin: 0 auto; padding: 32px;">
      <p style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #047857;">JAPR</p>
      <h1 style="font-size: 28px; margin: 0 0 16px; font-family: Georgia, serif;">${title}</h1>
      <div>${body}</div>
    </div>
  `
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  return sendEmail({
    to,
    subject: 'Reset your JAPR password',
    html: buildBaseEmail(
      'Reset your password',
      `<p>Hello ${escapeHtml(name)},</p>
       <p>Use the link below to reset your password.</p>
       <p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#047857;color:#fff;text-decoration:none;border-radius:999px;">Reset password</a></p>
       <p>If you did not request this change, you can safely ignore this message.</p>`
    )
  })
}

export async function sendActivationEmail(to: string, name: string, code: string) {
  return sendEmail({
    to,
    subject: 'Activate your JAPR account',
    html: buildBaseEmail(
      'Activation code',
      `<p>Hello ${escapeHtml(name)},</p>
       <p>Use this 6-digit code to activate your account:</p>
       <p style="font-size:32px;letter-spacing:0.18em;font-weight:700;margin:24px 0;">${escapeHtml(code)}</p>`
    )
  })
}

export async function sendSubmissionReceivedEmail(to: string, name: string, submissionTitle: string) {
  return sendEmail({
    to,
    subject: `Submission received: ${submissionTitle}`,
    html: buildBaseEmail(
      'Submission received',
      `<p>Hello ${escapeHtml(name)},</p><p>Your submission <strong>${escapeHtml(submissionTitle)}</strong> has been received and is now in the editorial queue.</p>`
    )
  })
}

export async function sendManuscriptStatusEmail(to: string, name: string, submissionTitle: string, statusLabel: string) {
  return sendEmail({
    to,
    subject: `Manuscript status update: ${submissionTitle}`,
    html: buildBaseEmail(
      'Manuscript status update',
      `<p>Hello ${escapeHtml(name)},</p><p>Your submission <strong>${escapeHtml(submissionTitle)}</strong> is now marked as <strong>${escapeHtml(statusLabel)}</strong>.</p>`
    )
  })
}

export async function sendReviewInvitationEmail(
  to: string,
  reviewerName: string,
  submissionTitle: string,
  acceptUrl?: string,
  declineUrl?: string
) {
  return sendEmail({
    to,
    subject: `Review invitation: ${submissionTitle}`,
    html: buildBaseEmail(
      'Review invitation',
      `<p>Hello ${escapeHtml(reviewerName)},</p>
       <p>You have been invited to review <strong>${escapeHtml(submissionTitle)}</strong>.</p>
       ${acceptUrl ? `<p><a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:12px 18px;background:#047857;color:#fff;text-decoration:none;border-radius:999px;">Accept invitation</a></p>` : ''}
       ${declineUrl ? `<p><a href="${escapeHtml(declineUrl)}" style="display:inline-block;padding:12px 18px;background:#44403c;color:#fff;text-decoration:none;border-radius:999px;">Decline invitation</a></p>` : ''}`
    )
  })
}

export async function sendDecisionEmail(to: string, authorName: string, submissionTitle: string, decision: string, letter?: string | null) {
  return sendEmail({
    to,
    subject: `Editorial decision: ${submissionTitle}`,
    html: buildBaseEmail(
      'Editorial decision',
      `<p>Hello ${escapeHtml(authorName)},</p>
       <p>A decision has been recorded for <strong>${escapeHtml(submissionTitle)}</strong>: <strong>${escapeHtml(decision.replaceAll('_', ' '))}</strong>.</p>
       ${letter ? `<div style="margin-top:16px;padding:16px;border:1px solid #d6d3d1;border-radius:16px;background:#fafaf9;">${escapeHtml(letter).replace(/\n/g, '<br>')}</div>` : ''}`
    )
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to JAPR',
    html: buildBaseEmail(
      'Welcome to JAPR',
      `<p>Hello ${escapeHtml(name)},</p><p>Your account is active. You can now sign in and continue your work.</p>`
    )
  })
}

export async function sendAdminCreatedUserEmail(to: string, name: string, password: string) {
  return sendEmail({
    to,
    subject: 'Your JAPR account has been created',
    html: buildBaseEmail(
      'Account created',
      `<p>Hello ${escapeHtml(name)},</p>
       <p>An administrator created a JAPR account for you.</p>
       <p>Temporary password: <strong>${escapeHtml(password)}</strong></p>
       <p>Please sign in and change your password after your first login.</p>`
    )
  })
}

export async function sendLoginNotificationEmail(to: string, name: string, ipAddress?: string | null, userAgent?: string | null) {
  return sendEmail({
    to,
    subject: 'New sign-in to JAPR',
    html: buildBaseEmail(
      'New sign-in',
      `<p>Hello ${escapeHtml(name)},</p>
       <p>Your account was used to sign in.</p>
       ${ipAddress ? `<p>IP: ${escapeHtml(ipAddress)}</p>` : ''}
       ${userAgent ? `<p>Device: ${escapeHtml(userAgent)}</p>` : ''}`
    )
  })
}

export async function sendReviewResponseEmail(to: string, editorName: string, reviewerName: string, submissionTitle: string, action: 'accepted' | 'declined') {
  return sendEmail({
    to,
    subject: `Reviewer ${action} invitation: ${submissionTitle}`,
    html: buildBaseEmail(
      `Review invitation ${action}`,
      `<p>Hello ${escapeHtml(editorName)},</p>
       <p>${escapeHtml(reviewerName)} has <strong>${escapeHtml(action)}</strong> the review invitation for <strong>${escapeHtml(submissionTitle)}</strong>.</p>`
    )
  })
}

export async function sendAllReviewsCompleteEmail(to: string, editorName: string, submissionTitle: string) {
  return sendEmail({
    to,
    subject: `All reviews complete: ${submissionTitle}`,
    html: buildBaseEmail(
      'Review round complete',
      `<p>Hello ${escapeHtml(editorName)},</p>
       <p>All assigned reviews have been submitted for <strong>${escapeHtml(submissionTitle)}</strong>.</p>`
    )
  })
}

export async function sendRevisionUploadedEmail(to: string, editorName: string, submissionTitle: string) {
  return sendEmail({
    to,
    subject: `Revision uploaded: ${submissionTitle}`,
    html: buildJournalEmail(
      'Revision uploaded',
      `<p>Hello ${escapeHtml(editorName)},</p>
       <p>The author uploaded a revised manuscript for <strong>${escapeHtml(submissionTitle)}</strong>.</p>`
    )
  })
}

function buildJournalEmail(title: string, body: string) {
  return `<!DOCTYPE html><html><head><title>${title}</title></head><body>${body}<p>Thanks,<br>JAPR</p></body></html>`
}

export async function sendRegistrationEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to JAPR — complete activation',
    html: buildJournalEmail(
      'Registration received',
      `<h1>Hello, ${escapeHtml(name)}</h1>
       <p>Thank you for registering with JAPR. Please check your inbox for your activation code.</p>`
    )
  })
}

export async function sendManuscriptSubmissionEmail(
  to: string,
  name: string,
  submissionTitle: string,
  role: 'author' | 'editor'
) {
  const safeName = escapeHtml(name)
  const safeTitle = escapeHtml(submissionTitle)
  const body = role === 'author'
    ? `<h1>Hello, ${safeName}</h1>
       <p>You have successfully submitted a manuscript titled "${safeTitle}".</p>
       <p>Please visit your submissions dashboard to track progress.</p>`
    : `<h1>Hello, ${safeName}</h1>
       <p>A manuscript titled "${safeTitle}" has been submitted.</p>
       <p>Please visit your editor dashboard to review the queue.</p>`

  return sendEmail({
    to,
    subject: role === 'author' ? `Submission received: ${submissionTitle}` : `New manuscript submitted: ${submissionTitle}`,
    html: buildJournalEmail('Manuscript Submission', body)
  })
}

export async function sendChangeRequestedEmail(to: string, name: string, submissionTitle: string, details: string) {
  return sendEmail({
    to,
    subject: `Changes requested: ${submissionTitle}`,
    html: buildJournalEmail(
      'Changes requested',
      `<h1>Hello, ${escapeHtml(name)}</h1>
       <p>An editor requested changes to "${escapeHtml(submissionTitle)}".</p>
       <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(details)}</pre>`
    )
  })
}

export async function sendChangeResolvedEmail(to: string, name: string, submissionTitle: string) {
  return sendEmail({
    to,
    subject: `Changes resolved: ${submissionTitle}`,
    html: buildJournalEmail(
      'Changes resolved',
      `<h1>Hello, ${escapeHtml(name)}</h1>
       <p>The author has submitted updates for "${escapeHtml(submissionTitle)}" in response to change requests.</p>`
    )
  })
}

export async function sendReviewSubmittedEmail(to: string, name: string, submissionTitle: string) {
  return sendEmail({
    to,
    subject: `Review submitted: ${submissionTitle}`,
    html: buildJournalEmail(
      'Review submitted',
      `<h1>Hello, ${escapeHtml(name)}</h1>
       <p>A review has been submitted for "${escapeHtml(submissionTitle)}".</p>`
    )
  })
}

export async function sendJournalStatusChangeEmail(to: string, name: string, submissionTitle: string, message: string) {
  return sendEmail({
    to,
    subject: `Status update: ${submissionTitle}`,
    html: buildJournalEmail(
      'Manuscript status update',
      `<h1>Hello, ${escapeHtml(name)}</h1>
       <p>${escapeHtml(message)}</p>`
    )
  })
}

export async function sendReviewDeadlineReminderEmail(
  to: string,
  reviewerName: string,
  submissionTitle: string,
  deadline: Date,
  isOverdue: boolean
) {
  const deadlineLabel = deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return sendEmail({
    to,
    subject: isOverdue ? `Overdue review: ${submissionTitle}` : `Review deadline approaching: ${submissionTitle}`,
    html: buildJournalEmail(
      isOverdue ? 'Your review is overdue' : 'Your review deadline is approaching',
      `<h1>Hello, ${escapeHtml(reviewerName)}</h1>
       <p>${isOverdue
        ? `Your review of <strong>${escapeHtml(submissionTitle)}</strong> was due on ${deadlineLabel} and has not yet been submitted.`
        : `Your review of <strong>${escapeHtml(submissionTitle)}</strong> is due on ${deadlineLabel}.`}</p>`
    )
  })
}
