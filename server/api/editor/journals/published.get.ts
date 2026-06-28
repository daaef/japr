import { db } from '#server/db/client'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const journals = await db.query.journals.findMany({
    where: (table, { eq }) => eq(table.approvalStatus, MANUSCRIPT_STATUS.PUBLISHED)
  })

  return { journals }
})
