import { db } from '#server/db/client'
import { requireEditor } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

export default defineEventHandler(async (event) => {
  await requireEditor(event)
  const journals = await db.query.journals.findMany({
    where: (table, { eq }) => eq(table.approvalStatus, MANUSCRIPT_STATUS.CHANGES_REQUESTED)
  })

  return { journals }
})
