import { listLocalEmails } from '#server/utils/email'
import { assertMailViewerAccess } from '#server/utils/devMail'

export default defineEventHandler((event) => {
  assertMailViewerAccess(event)
  return listLocalEmails()
})
