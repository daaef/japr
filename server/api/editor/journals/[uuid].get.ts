import { getRouterParam } from 'h3'
import { getJournalDetails } from '#server/utils/submissions'
import { requireEditorOrCopyDesk } from '#server/utils/permissions'
import { getReviewConsensus, hasReviewQuorum } from '#server/utils/journalWorkflow'

export default defineEventHandler(async (event) => {
  await requireEditorOrCopyDesk(event)
  const uuid = getRouterParam(event, 'uuid')

  if (!uuid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing journal id.' })
  }

  const details = await getJournalDetails(uuid)

  if (!details) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Derived, read-only decision aids for the managing editor. `consensus.suggestion`
  // is advisory only — the editor still confirms every terminal decision via the
  // approve/request-revisions/decline endpoints. `hasQuorum` flags when a decline has
  // dropped the completed-review count below quorum and a replacement is needed.
  return {
    ...details,
    consensus: getReviewConsensus(details.reviewers),
    hasQuorum: hasReviewQuorum(details.reviewers)
  }
})
