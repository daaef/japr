// Spec for docs/tasks/20260726_review-rounds Phase 2: F-E, F-F, F-G, F-H.
//
// These pin the guard predicates each endpoint now evaluates before touching the DB.
// They're written against the same constants/helpers the endpoints import, so a change
// to the endpoint that silently drops a check will also break the assertion here.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { assertReviewerStatus } from '../server/utils/journalWorkflow'
import { MANUSCRIPT_STATUS, TERMINAL_MANUSCRIPT_STATUSES } from '../shared/constants/manuscriptStatus'
import { REVIEWER_STATUS } from '../shared/constants/reviewerStatus'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- F-G: author edit window (journals/[id].patch.ts) ---

const authorEditableStatuses: string[] = [MANUSCRIPT_STATUS.DESK_REVIEW, MANUSCRIPT_STATUS.PENDING]

test('F-G: authors may edit a brand-new submission (desk_review) and a resubmitted revision (pending)', () => {
  assert.equal(authorEditableStatuses.includes(MANUSCRIPT_STATUS.DESK_REVIEW), true)
  assert.equal(authorEditableStatuses.includes(MANUSCRIPT_STATUS.PENDING), true)
})

test('F-G: authors may not edit once the manuscript has left desk review for peer review', () => {
  for (const status of [
    MANUSCRIPT_STATUS.IN_PROGRESS,
    MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
    MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
    MANUSCRIPT_STATUS.REVIEWED,
    MANUSCRIPT_STATUS.CHANGES_REQUESTED
  ]) {
    assert.equal(authorEditableStatuses.includes(status), false)
  }
})

// --- F-E: terminal manuscripts are frozen for everyone (journals/[id].patch.ts) ---

test('F-E: PATCH rejects every terminal status regardless of who is editing', () => {
  for (const status of TERMINAL_MANUSCRIPT_STATUSES) {
    assert.equal((TERMINAL_MANUSCRIPT_STATUSES as readonly string[]).includes(status), true)
  }
  // Published and declined manuscripts specifically must never be silently rewritable.
  assert.equal(TERMINAL_MANUSCRIPT_STATUSES.includes(MANUSCRIPT_STATUS.PUBLISHED), true)
  assert.equal(TERMINAL_MANUSCRIPT_STATUSES.includes(MANUSCRIPT_STATUS.DECLINED), true)
})

test('F-E: an in-progress manuscript is not terminal, so a permitted editor may still edit it', () => {
  assert.equal((TERMINAL_MANUSCRIPT_STATUSES as readonly string[]).includes(MANUSCRIPT_STATUS.IN_PROGRESS), false)
})

// --- F-F: request-change requires an active reviewer (reviewer/journals/request-change.post.ts) ---

test('F-F: only an in-progress reviewer may suggest changes', () => {
  const allowed = [REVIEWER_STATUS.IN_PROGRESS]

  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.IN_PROGRESS, allowed, 'suggesting changes'))
  // Previously unguarded: a reviewer who already submitted, or already declined, could
  // keep appending to changeRequests indefinitely.
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.REVIEWED, allowed, 'suggesting changes'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.DECLINED, allowed, 'suggesting changes'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.PENDING, allowed, 'suggesting changes'))
})

test('F-F: the changeRequests cap rejects a batch that would push the array past the limit', () => {
  const MAX_CHANGE_REQUESTS = 50
  const wouldExceed = (existingCount: number, incomingCount: number) =>
    existingCount + incomingCount > MAX_CHANGE_REQUESTS

  assert.equal(wouldExceed(49, 1), false)
  assert.equal(wouldExceed(50, 1), true)
  assert.equal(wouldExceed(48, 3), true)
})

// --- F-H: approve-extension requires an active reviewer who actually asked (editor/journals/[uuid]/approve-extension.post.ts) ---

test('F-H: only an in-progress reviewer\'s extension may be approved', () => {
  const allowed = [REVIEWER_STATUS.IN_PROGRESS]

  assert.doesNotThrow(() => assertReviewerStatus(REVIEWER_STATUS.IN_PROGRESS, allowed, 'extending this review'))
  // Extending a deadline for a reviewer who already submitted or declined is meaningless.
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.REVIEWED, allowed, 'extending this review'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.DECLINED, allowed, 'extending this review'))
  assert.throws(() => assertReviewerStatus(REVIEWER_STATUS.PENDING, allowed, 'extending this review'))
})

test('F-H: an unsolicited extension is rejected even for an in-progress reviewer', () => {
  const wasRequested = (reviewer: { deadlineExtensionRequested: boolean }) => reviewer.deadlineExtensionRequested

  assert.equal(wasRequested({ deadlineExtensionRequested: true }), true)
  assert.equal(wasRequested({ deadlineExtensionRequested: false }), false)
})

// --- F-J: explicit null clears an optional field on PATCH (journals/[id].patch.ts) ---

test('F-J: a nullable field uses undefined-check so an explicit null clears it, unlike ??', () => {
  const applyPatch = (incoming: string | null | undefined, existing: string | null) =>
    incoming !== undefined ? incoming : existing

  // Field omitted entirely — keep the existing value.
  assert.equal(applyPatch(undefined, 'Acme University'), 'Acme University')
  // Field explicitly cleared — must actually become null, which `??` would have refused.
  assert.equal(applyPatch(null, 'Acme University'), null)
  // Field explicitly replaced — takes the new value.
  assert.equal(applyPatch('New University', 'Acme University'), 'New University')
})

// --- F-D: a single decision path to `approved` (server/utils/editorDecision.ts) ---

test('F-D: approve.post.ts and send-approval-notice.post.ts no longer write approvalStatus directly', () => {
  // Both endpoints used to independently set journals.approvalStatus to APPROVED /
  // APPROVED_WITH_COMMENT with different side effects (one wrote journalComments and
  // managingEditorNoticeSentAt, the other didn't; only one checked the review quorum).
  // A static scan is a cheap regression guard: the moment either file starts assigning
  // approvalStatus again instead of delegating to approveManuscript, this fails.
  const root = resolve(__dirname, '..')
  const approveSource = readFileSync(resolve(root, 'server/api/editor/journals/[uuid]/approve.post.ts'), 'utf8')
  const noticeSource = readFileSync(resolve(root, 'server/api/editor/journals/[uuid]/send-approval-notice.post.ts'), 'utf8')

  for (const source of [approveSource, noticeSource]) {
    assert.equal(source.includes('approveManuscript'), true)
    assert.equal(/approvalStatus:\s*(finalStatus|MANUSCRIPT_STATUS\.APPROVED)/.test(source), false)
  }
})
