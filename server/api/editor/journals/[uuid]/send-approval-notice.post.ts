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
  const session = await requirePermission(event, 'journal', 'send_approval_notice')
  const uuid = getRouterParam(event, 'uuid')
  const body = bodySchema.parse(await readBody(event))

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const journal = await getJournalById(uuid)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // This endpoint only accepts READY_FOR_MANAGING_EDITOR_NOTICE — that status is only
  // ever set by the engine once the current-round quorum is met (getReviewWorkflowStatus),
  // so the >=3 check in approveManuscript is defense in depth here, not the primary gate.
  // See editorDecision.ts (F-D) — this used to have no quorum check of its own at all.
  await approveManuscript({
    journal,
    actorUserId: session.user.id,
    comment: body.comment,
    allowedStatuses: [MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE],
    action: 'sending an approval notice',
    defaultComment: 'Manuscript approved by Managing Editor.'
  })

  return { ok: true }
})
