import { logAdminAction } from '#server/utils/adminAudit'
import { sendEmail } from '#server/utils/email'
import { requireAdmin } from '#server/utils/permissions'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const recipient = session.appUser.email

  await sendEmail({
    to: recipient,
    subject: 'JAPR email system test',
    html: `
      <p>Hello,</p>
      <p>This is a test message from the JAPR admin dashboard.</p>
      <p>If you received this message, the configured email transport is accepting mail.</p>
    `
  })

  await logAdminAction(event, {
    action: 'email_sent',
    resourceType: 'system_email',
    resourceId: recipient,
    description: `Sent admin test email to ${recipient}`,
    metadata: { recipient }
  })

  return {
    ok: true,
    recipient
  }
})
