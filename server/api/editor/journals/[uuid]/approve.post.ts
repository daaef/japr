import { readBody } from 'h3'
import { z } from 'zod'
import { approveManuscript } from '#server/utils/editorDecision'
import { requirePermission } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'

const bodySchema = z.object({
  comment: z.string().trim().max(2000).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, 'journal', 'approve')
  const uuid = getRouterParam(event, 'uuid')
  const body = bodySchema.parse(await readBody(event))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // This endpoint additionally accepts REVIEWED as a starting status (a manuscript where
  // every reviewer responded but the quorum wasn't met by completions alone) —
  // send-approval-notice.post.ts does not. See editorDecision.ts (F-D) for the shared
  // quorum check and side effects both endpoints now go through.
  await approveManuscript({
    journal,
    actorUserId: session.user.id,
    comment: body.comment,
    allowedStatuses: [MANUSCRIPT_STATUS.REVIEWED, MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE],
    action: 'approving for publication',
    defaultComment: 'Manuscript approved.'
  })

  return { ok: true }
})
