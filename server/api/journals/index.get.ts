import { getValidatedQuery } from 'h3'
import { listPublicJournals } from '#server/utils/journalQuery'
import { journalQuerySchema } from '#shared/validation/journals'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, value => journalQuerySchema.parse(value))
  return listPublicJournals(query)
})
