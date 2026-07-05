export const MANUSCRIPT_STATUS = {
  DESK_REVIEW: 'desk_review',
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  UNDER_PEER_REVIEW: 'under_peer_review',
  READY_FOR_MANAGING_EDITOR_NOTICE: 'ready_for_managing_editor_notice',
  APPROVED: 'approved',
  APPROVED_WITH_COMMENT: 'approved_with_comment',
  PUBLISHED: 'published',
  DECLINED: 'declined',
  CHANGES_REQUESTED: 'changes_requested',
  REVIEWED: 'reviewed'
} as const

export type ManuscriptStatus = typeof MANUSCRIPT_STATUS[keyof typeof MANUSCRIPT_STATUS]

export const MANUSCRIPT_STATUSES = Object.values(MANUSCRIPT_STATUS)

export function isManuscriptStatus(status: string): status is ManuscriptStatus {
  return MANUSCRIPT_STATUSES.some(manuscriptStatus => manuscriptStatus === status)
}

export const MANUSCRIPT_STATUS_LABELS: Record<ManuscriptStatus, string> = {
  [MANUSCRIPT_STATUS.DESK_REVIEW]: 'Desk Review',
  [MANUSCRIPT_STATUS.PENDING]: 'Pending',
  [MANUSCRIPT_STATUS.IN_PROGRESS]: 'In Progress',
  [MANUSCRIPT_STATUS.UNDER_PEER_REVIEW]: 'Under Peer Review',
  [MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE]: 'Ready For Managing Editor Notice',
  [MANUSCRIPT_STATUS.APPROVED]: 'Approved',
  [MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT]: 'Approved With Comment',
  [MANUSCRIPT_STATUS.PUBLISHED]: 'Published',
  [MANUSCRIPT_STATUS.DECLINED]: 'Declined',
  [MANUSCRIPT_STATUS.CHANGES_REQUESTED]: 'Changes Requested',
  [MANUSCRIPT_STATUS.REVIEWED]: 'Reviewed'
}

export const MANUSCRIPT_STATUS_COLORS: Record<ManuscriptStatus, string> = {
  [MANUSCRIPT_STATUS.DESK_REVIEW]: 'bg-warning-50 text-warning-600',
  [MANUSCRIPT_STATUS.PENDING]: 'bg-warning-50 text-warning-600',
  [MANUSCRIPT_STATUS.IN_PROGRESS]: 'bg-info-50 text-info-600',
  [MANUSCRIPT_STATUS.UNDER_PEER_REVIEW]: 'bg-info-50 text-info-600',
  [MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE]: 'bg-primary-50 text-primary-600',
  [MANUSCRIPT_STATUS.REVIEWED]: 'bg-primary-50 text-primary-600',
  [MANUSCRIPT_STATUS.APPROVED]: 'bg-success-50 text-success-600',
  [MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT]: 'bg-success-50 text-success-600',
  [MANUSCRIPT_STATUS.PUBLISHED]: 'bg-success-50 text-success-600',
  [MANUSCRIPT_STATUS.DECLINED]: 'bg-danger-50 text-danger-600',
  [MANUSCRIPT_STATUS.CHANGES_REQUESTED]: 'bg-warning-50 text-warning-600'
}

export const PUBLIC_MANUSCRIPT_STATUSES = [
  MANUSCRIPT_STATUS.APPROVED,
  MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
  MANUSCRIPT_STATUS.PUBLISHED
] as const

export const TERMINAL_MANUSCRIPT_STATUSES = [
  MANUSCRIPT_STATUS.APPROVED,
  MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
  MANUSCRIPT_STATUS.PUBLISHED,
  MANUSCRIPT_STATUS.DECLINED
] as const

export const REVIEW_STAGE_STATUSES = [
  MANUSCRIPT_STATUS.IN_PROGRESS,
  MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
  MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
  MANUSCRIPT_STATUS.REVIEWED
] as const

export const ALLOWED_MANUSCRIPT_TRANSITIONS: Record<ManuscriptStatus, ManuscriptStatus[]> = {
  [MANUSCRIPT_STATUS.DESK_REVIEW]: [
    MANUSCRIPT_STATUS.IN_PROGRESS,
    MANUSCRIPT_STATUS.DECLINED
  ],
  [MANUSCRIPT_STATUS.PENDING]: [
    MANUSCRIPT_STATUS.IN_PROGRESS,
    MANUSCRIPT_STATUS.DECLINED
  ],
  [MANUSCRIPT_STATUS.IN_PROGRESS]: [
    MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
    MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
    // A single-reviewer manuscript where that reviewer declines goes straight from
    // in-progress to reviewed (0 completed reviews, but the only reviewer responded) —
    // syncJournalReviewStatus already produces this; the table just didn't allow it (F11).
    MANUSCRIPT_STATUS.REVIEWED,
    MANUSCRIPT_STATUS.CHANGES_REQUESTED
  ],
  [MANUSCRIPT_STATUS.UNDER_PEER_REVIEW]: [
    MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE,
    // Reachable when the completed reviewer count stays under the notice threshold but
    // every remaining reviewer ends up declining — all responses are terminal (F11).
    MANUSCRIPT_STATUS.REVIEWED,
    MANUSCRIPT_STATUS.CHANGES_REQUESTED
  ],
  [MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE]: [
    MANUSCRIPT_STATUS.APPROVED,
    MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
    MANUSCRIPT_STATUS.DECLINED,
    MANUSCRIPT_STATUS.CHANGES_REQUESTED
  ],
  [MANUSCRIPT_STATUS.REVIEWED]: [
    MANUSCRIPT_STATUS.APPROVED,
    MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
    MANUSCRIPT_STATUS.DECLINED,
    MANUSCRIPT_STATUS.CHANGES_REQUESTED,
    // F10 now lets an editor assign-reviewers while stuck at reviewed with too few
    // completed reviews; the newly-added pending reviewer moves the auto-computed status
    // back to in-progress/under_peer_review, so the table must legalize that reverse
    // edge instead of the engine silently disagreeing with it (F11).
    MANUSCRIPT_STATUS.IN_PROGRESS,
    MANUSCRIPT_STATUS.UNDER_PEER_REVIEW
  ],
  [MANUSCRIPT_STATUS.APPROVED]: [
    MANUSCRIPT_STATUS.PUBLISHED
  ],
  [MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT]: [
    MANUSCRIPT_STATUS.PUBLISHED
  ],
  [MANUSCRIPT_STATUS.PUBLISHED]: [],
  [MANUSCRIPT_STATUS.DECLINED]: [],
  [MANUSCRIPT_STATUS.CHANGES_REQUESTED]: [
    MANUSCRIPT_STATUS.PENDING,
    MANUSCRIPT_STATUS.IN_PROGRESS
  ]
}

export function canTransitionManuscriptStatus(from: ManuscriptStatus, to: ManuscriptStatus) {
  return ALLOWED_MANUSCRIPT_TRANSITIONS[from].includes(to)
}
