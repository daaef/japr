export const REVIEWER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  DECLINED: 'declined',
  REVIEWED: 'reviewed'
} as const

export type ReviewerStatus = typeof REVIEWER_STATUS[keyof typeof REVIEWER_STATUS]

export const REVIEWER_STATUSES = Object.values(REVIEWER_STATUS)

export function isReviewerStatus(status: string): status is ReviewerStatus {
  return REVIEWER_STATUSES.some(reviewerStatus => reviewerStatus === status)
}

// Both `declined` and `reviewed` are terminal from the reviewer's own side — a re-invite
// or a reopen after review are editor-initiated actions, not self-service transitions,
// so they aren't modeled here.
export const ALLOWED_REVIEWER_TRANSITIONS: Record<ReviewerStatus, ReviewerStatus[]> = {
  [REVIEWER_STATUS.PENDING]: [REVIEWER_STATUS.IN_PROGRESS, REVIEWER_STATUS.DECLINED],
  [REVIEWER_STATUS.IN_PROGRESS]: [REVIEWER_STATUS.REVIEWED, REVIEWER_STATUS.DECLINED],
  [REVIEWER_STATUS.DECLINED]: [],
  [REVIEWER_STATUS.REVIEWED]: []
}

export function canTransitionReviewerStatus(from: ReviewerStatus, to: ReviewerStatus) {
  return ALLOWED_REVIEWER_TRANSITIONS[from].includes(to)
}
