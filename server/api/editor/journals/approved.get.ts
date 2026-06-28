import { db } from '#server/db/client'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const journals = await db.query.journals.findMany({
    where: (table, { eq, or }) => or(
      eq(table.approvalStatus, MANUSCRIPT_STATUS.APPROVED),
      eq(table.approvalStatus, MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT)
    )
  })

  return { journals }
})
