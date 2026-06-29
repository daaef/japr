import { listLocalEmails } from '#server/utils/email'
import { assertMailViewerAccess } from '#server/utils/devMail'
import { isMailtrapViewerConfigured, listMailtrapEmails } from '#server/utils/mailtrap'

export default defineEventHandler((event) => {
  assertMailViewerAccess(event)
  return isMailtrapViewerConfigured() ? listMailtrapEmails() : listLocalEmails()
})
