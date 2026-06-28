import { getLocalEmail } from '#server/utils/email'
import { assertMailViewerAccess } from '#server/utils/devMail'

export default defineEventHandler(async (event) => {
  await assertMailViewerAccess(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing email id.' })
  }

  const email = await getLocalEmail(id)
  if (!email) {
    throw createError({ statusCode: 404, statusMessage: 'Email not found.' })
  }

  return email
})
