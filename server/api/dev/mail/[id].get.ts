import { getLocalEmail } from '#server/utils/email'
import { assertMailViewerAccess } from '#server/utils/devMail'
import { getMailtrapEmail, isMailtrapViewerConfigured } from '#server/utils/mailtrap'

export default defineEventHandler(async (event) => {
  assertMailViewerAccess(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing email id.' })
  }

  const email = isMailtrapViewerConfigured()
    ? await getMailtrapEmail(id)
    : await getLocalEmail(id)

  if (!email) {
    throw createError({ statusCode: 404, statusMessage: 'Email not found.' })
  }

  return email
})
