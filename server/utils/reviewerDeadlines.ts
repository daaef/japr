export const DEFAULT_REVIEW_DEADLINE_DAYS = 14

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getDefaultReviewDeadline(assignedAt = new Date()) {
  return new Date(assignedAt.getTime() + DEFAULT_REVIEW_DEADLINE_DAYS * MS_PER_DAY)
}

export function buildApprovedExtension(currentDeadline: Date, extensionDays: number, approvedAt = new Date()) {
  return {
    reviewDeadline: new Date(currentDeadline.getTime() + extensionDays * MS_PER_DAY),
    deadlineExtensionRequested: false,
    deadlineExtensionReason: null,
    deadlineExtendedAt: approvedAt,
    originalDeadline: currentDeadline
  }
}
