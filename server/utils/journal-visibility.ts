import { sanitizeJournalForAuthor } from '#server/utils/submissions'
import { PUBLIC_MANUSCRIPT_STATUSES } from '#shared/constants/manuscriptStatus'

export type JournalViewerRole = 'public' | 'owner' | 'reviewer' | 'editor'

export interface JournalVisibilityFields {
  id: string
  userId: string
  approvalStatus: string
  isDraft: boolean
  isActive: boolean
}

/** Whether a manuscript is visible to an anonymous/unrelated viewer, independent of role. */
export function isPubliclyVisibleJournal(journal: JournalVisibilityFields): boolean {
  return journal.isActive
    && !journal.isDraft
    && PUBLIC_MANUSCRIPT_STATUSES.some(status => status === journal.approvalStatus)
}

/** Anonymizes a denormalized reviewer-identity list the same way for author and reviewer viewers. */
function anonymizeReviewerList(reviewers: unknown): Array<{ id: string }> {
  return Array.isArray(reviewers)
    ? reviewers.map((_, index) => ({ id: `Reviewer ${index + 1}` }))
    : []
}

/** Strips co-reviewer identities and the editor-only rating field from a reviewer's own view. */
function sanitizeJournalForReviewer<T extends { reviewers?: unknown, reviewersRatings?: unknown, journalUrl?: unknown }>(journal: T) {
  const { journalUrl, ...rest } = journal
  return {
    ...rest,
    reviewers: anonymizeReviewerList(journal.reviewers),
    reviewersRatings: [],
    // The raw storage key never leaves the server for non-editors; downloads go through
    // the authz'd /api/journals/[id]/download endpoint, which re-queries the row itself.
    hasManuscriptFile: Boolean(journalUrl)
  }
}

// Single source of truth for the public exclusion list — the "no per-endpoint copy-pasted
// column list" list lives here, in this one destructuring statement, not duplicated.
type PublicExcludedKey = 'reviewers' | 'reviewersRatings' | 'createdBy' | 'updatedBy' | 'approvedBy' | 'declinedBy' | 'searchVector' | 'journalUrl' | 'journalFormat'

/** The canonical public projection — never leak reviewer identities or internal editorial metadata. */
function projectJournalForPublic<T extends Record<PublicExcludedKey, unknown>>(journal: T): Omit<T, PublicExcludedKey> & { hasManuscriptFile: boolean } {
  const { reviewers, reviewersRatings, createdBy, updatedBy, approvedBy, declinedBy, searchVector, journalUrl, journalFormat, ...rest } = journal
  // Public viewers still need to know a file exists: the public journal page shows an
  // authenticated-user Download button for approved manuscripts (served by the authz'd
  // download endpoint) — but they never get the storage key itself.
  return { ...rest, hasManuscriptFile: Boolean(journalUrl) }
}

/**
 * Single source of truth for what a `journals` row exposes to a given viewer. Pure —
 * takes an already-resolved role, does no I/O, so it's independently testable. Deliberately
 * has no h3/session/db imports (see journal-viewer-role.ts for role resolution) so this
 * module stays importable from plain `tsx --test`, not just inside Nuxt's own runtime.
 */
export function projectJournalForViewer<T extends Record<PublicExcludedKey, unknown>>(
  journal: T,
  role: JournalViewerRole
) {
  switch (role) {
    case 'editor':
      return journal
    case 'owner':
      return sanitizeJournalForAuthor(journal)
    case 'reviewer':
      return sanitizeJournalForReviewer(journal)
    case 'public':
    default:
      return projectJournalForPublic(journal)
  }
}
