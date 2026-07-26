import { eq } from 'drizzle-orm'
import { readBody } from 'h3'
import { z } from 'zod'
import { db } from '#server/db/client'
import { journals } from '#server/db/schema'
import { notifyEditorsOfReviewerSuggestions } from '#server/utils/editorNotifications'
import { assertManuscriptStatus, assertReviewerStatus } from '#server/utils/journalWorkflow'
import { requireReviewer } from '#server/utils/permissions'
import { getJournalById } from '#server/utils/submissions'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '#shared/constants/reviewerStatus'

// F-F: an unbounded array on a jsonb column. 50 is generous for a single review round —
// past it, something is wrong (a stuck client retrying, or abuse) rather than a
// legitimately large set of suggestions.
const MAX_CHANGE_REQUESTS = 50

const changeSchema = z.object({
  field: z.enum(['title', 'abstract', 'description']),
  suggestedChange: z.string().trim().min(1).max(10000),
  comment: z.string().trim().max(2000).optional()
})

const bodySchema = z.object({
  journalId: z.string().uuid(),
  changes: z.array(changeSchema).min(1)
})

export default defineEventHandler(async (event) => {
  const session = await requireReviewer(event)
  const body = bodySchema.parse(await readBody(event))

  const journal = await getJournalById(body.journalId)
  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  // Previously unguarded: any authenticated reviewer-role user could force any
  // manuscript into changes_requested, including ones they aren't assigned to and
  // ones already published/declined. Both checks below close that.
  const reviewer = await db.query.reviewers.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.journalId, journal.id),
      eq(table.roundNumber, journal.currentReviewRound),
      eq(table.userId, session.user.id)
    )
  })

  if (!reviewer) {
    throw createError({ statusCode: 403, statusMessage: 'You are not assigned as a reviewer for this journal.' })
  }

  // F-F: the only guard here was "an assignment row exists" — a reviewer who already
  // declined, or already submitted their review, could keep appending suggestions
  // indefinitely, at any review-stage status, past their actual reviewing window.
  assertReviewerStatus(reviewer.status, [REVIEWER_STATUS.IN_PROGRESS], 'suggesting changes')

  assertManuscriptStatus(
    journal.approvalStatus,
    [
      MANUSCRIPT_STATUS.IN_PROGRESS,
      MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
      MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
      MANUSCRIPT_STATUS.REVIEWED
    ],
    'requesting changes'
  )

  const existing = Array.isArray(journal.changeRequests) ? [...journal.changeRequests] : []
  const timestamp = new Date().toISOString()

  if (existing.length + body.changes.length > MAX_CHANGE_REQUESTS) {
    throw createError({
      statusCode: 409,
      statusMessage: `This manuscript already has ${existing.length} change suggestions; the limit is ${MAX_CHANGE_REQUESTS}.`
    })
  }

  for (const change of body.changes) {
    const currentValue = String(journal[change.field] ?? '')
    existing.push({
      field: change.field,
      current_value: currentValue,
      suggested_change: change.suggestedChange,
      comment: change.comment ?? null,
      reviewer_id: session.user.id,
      status: 'pending',
      timestamp
    })
  }

  // A single reviewer no longer moves the manuscript on their own. The change entries
  // are recorded as advisory input and surfaced to the managing editor; the manuscript
  // stays in its review stage until the full quorum of reviews is in (see
  // docs/tasks/20260713_review-consensus). Only editor endpoints write changes_requested.
  await db.update(journals).set({
    changeRequests: existing,
    updatedAt: new Date()
  }).where(eq(journals.id, journal.id))

  // The author is NOT notified here: their "changes requested" notice comes once, when
  // the editor formally requests revisions (request-revisions.post.ts). Editors instead
  // get an in-app heads-up that reviewer suggestions have landed.
  await notifyEditorsOfReviewerSuggestions(journal.id, session.user.id)

  return { ok: true }
})
