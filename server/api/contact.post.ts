import { readValidatedBody } from 'h3'
import { escapeHtml, sendEmail } from '#server/utils/email'
import { contactSchema } from '#shared/validation/contact'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, payload => contactSchema.parse(payload))
  const inbox = process.env.CONTACT_INBOX ?? process.env.RESEND_FROM ?? 'support@japr-research.org'
  const fullName = `${body.firstName} ${body.lastName}`
  const phone = [body.phoneCountry, body.phoneNumber].filter(Boolean).join(' ')

  await sendEmail({
    to: inbox,
    subject: `JAPR contact form — ${fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New contact message</h2>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(body.message).replace(/\n/g, '<br>')}</p>
      </div>
    `
  })

  return {
    ok: true,
    message: 'Your message has been sent. We will respond as soon as possible.'
  }
})
