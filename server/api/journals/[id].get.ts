import { getRouterParam } from 'h3'
import { findJournalByParam } from '#server/utils/journal-resolve'

export default defineEventHandler(async (event) => {
  const param = getRouterParam(event, 'id')

  if (!param) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal identifier.' })
  }

  const journal = await findJournalByParam(param)

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  if (!journal.isActive) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  return { journal }
})
