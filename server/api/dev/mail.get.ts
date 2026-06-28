import { listLocalEmails } from '#server/utils/email'
import { assertMailViewerAccess } from '#server/utils/devMail'

export default defineEventHandler(async (event) => {
  await assertMailViewerAccess(event)
  return listLocalEmails()
})
