import { db } from '#server/db/client'
import { requireEditor } from '#server/utils/permissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

export default defineEventHandler(async (event) => {
  await requireEditor(event)

  const journals = await db.query.journals.findMany({
    where: (table, { eq: eqFn }) => eqFn(table.approvalStatus, MANUSCRIPT_STATUS.UNDER_PEER_REVIEW),
    orderBy: (table, { desc }) => [desc(table.updatedAt)]
  })

  return { journals }
})
