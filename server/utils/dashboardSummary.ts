import {
  MANUSCRIPT_STATUS,
  MANUSCRIPT_STATUSES,
  type ManuscriptStatus,
  isManuscriptStatus
} from '#shared/constants/manuscriptStatus'
import type {
  AdminDashboardSummary,
  AdminSubmissionTrend,
  EditorDashboardSummary,
  ReviewerDashboardMetrics,
  ReviewerDashboardSummary
} from '#shared/types/dashboard'

interface JournalStatusRow {
  approvalStatus: string
}

interface ReviewerMetricRow {
  status: string
  journalStatus?: string
  assignedAt?: Date | string | null
  reviewSubmittedAt?: Date | string | null
  reviewDeadline?: Date | string | null
}

const MS_PER_DAY = 1000 * 60 * 60 * 24
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const COMPLETED_JOURNAL_STATUSES = new Set<ManuscriptStatus>([
  MANUSCRIPT_STATUS.APPROVED,
  MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
  MANUSCRIPT_STATUS.DECLINED
])

function toDate(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  return value instanceof Date ? value : new Date(value)
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function sameMonth(first: Date, second: Date) {
  return first.getUTCFullYear() === second.getUTCFullYear()
    && first.getUTCMonth() === second.getUTCMonth()
}

function monthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel(value: Date) {
  return MONTH_FORMATTER.format(value)
}

function previousMonthStart(now: Date, monthsBack: number) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1, 0, 0, 0, 0))
}

function isOpenReviewerStatus(status: string) {
  return status === MANUSCRIPT_STATUS.PENDING || status === MANUSCRIPT_STATUS.IN_PROGRESS
}

export function buildEditorDashboardSummary(rows: JournalStatusRow[]): EditorDashboardSummary {
  const byStatus = Object.fromEntries(
    MANUSCRIPT_STATUSES.map(status => [status, 0])
  ) as Record<ManuscriptStatus, number>

  for (const row of rows) {
    if (isManuscriptStatus(row.approvalStatus)) {
      byStatus[row.approvalStatus] += 1
    }
  }

  const approved = byStatus[MANUSCRIPT_STATUS.APPROVED]
    + byStatus[MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT]

  return {
    deskReview: byStatus[MANUSCRIPT_STATUS.DESK_REVIEW],
    legacyPending: byStatus[MANUSCRIPT_STATUS.PENDING],
    pendingQueue: byStatus[MANUSCRIPT_STATUS.DESK_REVIEW] + byStatus[MANUSCRIPT_STATUS.PENDING],
    inProgress: byStatus[MANUSCRIPT_STATUS.IN_PROGRESS],
    underPeerReview: byStatus[MANUSCRIPT_STATUS.UNDER_PEER_REVIEW],
    reviewed: byStatus[MANUSCRIPT_STATUS.REVIEWED],
    readyForNotice: byStatus[MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE],
    approved,
    published: byStatus[MANUSCRIPT_STATUS.PUBLISHED],
    changesRequested: byStatus[MANUSCRIPT_STATUS.CHANGES_REQUESTED],
    declined: byStatus[MANUSCRIPT_STATUS.DECLINED],
    byStatus
  }
}

export function buildReviewerDashboardMetrics(
  rows: ReviewerMetricRow[],
  now = new Date()
): ReviewerDashboardMetrics {
  const completedRows = rows
    .map(row => ({
      assignedAt: toDate(row.assignedAt),
      reviewSubmittedAt: toDate(row.reviewSubmittedAt)
    }))
    .filter((row): row is { assignedAt: Date, reviewSubmittedAt: Date } =>
      row.assignedAt !== null && row.reviewSubmittedAt !== null
    )

  const totalReviewDays = completedRows.reduce((total, row) =>
    total + ((row.reviewSubmittedAt.getTime() - row.assignedAt.getTime()) / MS_PER_DAY), 0)

  const completedThisMonth = completedRows.filter(row => sameMonth(row.reviewSubmittedAt, now)).length

  const openRows = rows.filter(row => isOpenReviewerStatus(row.status))
  const overdueReviews = openRows.filter((row) => {
    const deadline = toDate(row.reviewDeadline)
    return deadline !== null && deadline.getTime() < now.getTime()
  }).length

  return {
    averageReviewTimeDays: completedRows.length ? roundOneDecimal(totalReviewDays / completedRows.length) : 0,
    completionRate: rows.length ? Math.round((completedRows.length / rows.length) * 100) : 0,
    completedThisMonth,
    overdueReviews,
    urgentAssignments: overdueReviews
  }
}

export function buildReviewerDashboardSummary(
  rows: ReviewerMetricRow[],
  now = new Date()
): Omit<ReviewerDashboardSummary, 'assignments'> {
  const metrics = buildReviewerDashboardMetrics(rows, now)

  return {
    ...metrics,
    pending: rows.filter(row => row.status === MANUSCRIPT_STATUS.PENDING).length,
    inProgress: rows.filter(row => row.status === MANUSCRIPT_STATUS.IN_PROGRESS).length,
    reviewed: rows.filter(row => row.status === MANUSCRIPT_STATUS.REVIEWED).length,
    approved: rows.filter(row =>
      row.journalStatus === MANUSCRIPT_STATUS.APPROVED
      || row.journalStatus === MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT
    ).length,
    declinedInvitations: rows.filter(row => row.status === MANUSCRIPT_STATUS.DECLINED).length,
    declinedManuscripts: rows.filter(row => row.journalStatus === MANUSCRIPT_STATUS.DECLINED).length
  }
}

interface AdminDashboardInput {
  journals: Array<{
    approvalStatus: string
    createdAt: Date | string
    updatedAt: Date | string
  }>
  users: Array<{
    id: string
    createdAt: Date | string
    availableForReview: boolean
  }>
  categories: number
  roles: string[]
  userRoles: Array<{
    userId: string
    roleName: string
  }>
  reviewers: Array<{
    userId: string
    reviewerName: string
    assignedAt: Date | string | null
    reviewSubmittedAt: Date | string | null
    reviewDeadline: Date | string | null
  }>
  systemHealth?: AdminDashboardSummary['systemHealth']
}

function buildSubmissionTrend(journals: AdminDashboardInput['journals'], now: Date): AdminSubmissionTrend[] {
  return Array.from({ length: 6 }, (_, index) => {
    const monthStart = previousMonthStart(now, 5 - index)
    const key = monthKey(monthStart)

    return {
      label: monthLabel(monthStart),
      count: journals.filter((journal) => {
        const createdAt = toDate(journal.createdAt)
        return createdAt !== null && monthKey(createdAt) === key
      }).length
    }
  })
}

export function buildAdminDashboardSummary(input: AdminDashboardInput, now = new Date()): AdminDashboardSummary {
  const editorSummary = buildEditorDashboardSummary(input.journals)
  const completedJournals = input.journals
    .map(journal => ({
      createdAt: toDate(journal.createdAt),
      updatedAt: toDate(journal.updatedAt),
      approvalStatus: journal.approvalStatus
    }))
    .filter((row): row is { createdAt: Date, updatedAt: Date, approvalStatus: ManuscriptStatus } =>
      row.createdAt !== null
      && row.updatedAt !== null
      && isManuscriptStatus(row.approvalStatus)
      && COMPLETED_JOURNAL_STATUSES.has(row.approvalStatus)
    )

  const totalProcessingDays = completedJournals.reduce((total, journal) =>
    total + ((journal.updatedAt.getTime() - journal.createdAt.getTime()) / MS_PER_DAY), 0)

  const reviewerMetrics = buildReviewerDashboardMetrics(input.reviewers.map(reviewer => ({
    status: reviewer.reviewSubmittedAt ? MANUSCRIPT_STATUS.REVIEWED : MANUSCRIPT_STATUS.IN_PROGRESS,
    assignedAt: reviewer.assignedAt,
    reviewSubmittedAt: reviewer.reviewSubmittedAt,
    reviewDeadline: reviewer.reviewDeadline
  })), now)

  const reviewerRoleUserIds = new Set(input.userRoles
    .filter(role => ['associate_editor', 'external_reviewer', 'desk_editor'].includes(role.roleName))
    .map(role => role.userId))

  const roleCounts = new Map<string, number>()
  for (const role of input.userRoles) {
    roleCounts.set(role.roleName, (roleCounts.get(role.roleName) ?? 0) + 1)
  }

  const completedByReviewer = new Map<string, { name: string, completedReviews: number }>()
  for (const reviewer of input.reviewers) {
    if (!reviewer.reviewSubmittedAt) {
      continue
    }

    const current = completedByReviewer.get(reviewer.userId) ?? {
      name: reviewer.reviewerName,
      completedReviews: 0
    }
    current.completedReviews += 1
    completedByReviewer.set(reviewer.userId, current)
  }

  return {
    totalJournals: input.journals.length,
    approvedJournals: editorSummary.approved,
    pendingManuscripts: editorSummary.pendingQueue,
    declinedJournals: editorSummary.declined,
    recentSubmissions: input.journals.filter((journal) => {
      const createdAt = toDate(journal.createdAt)
      return createdAt !== null && sameMonth(createdAt, now)
    }).length,
    averageProcessingTimeDays: completedJournals.length ? roundOneDecimal(totalProcessingDays / completedJournals.length) : 0,
    totalUsers: input.users.length,
    newUsersThisMonth: input.users.filter((user) => {
      const createdAt = toDate(user.createdAt)
      return createdAt !== null && sameMonth(createdAt, now)
    }).length,
    activeReviewers: input.users.filter(user => user.availableForReview && reviewerRoleUserIds.has(user.id)).length,
    totalRoles: input.roles.length,
    totalCategories: input.categories,
    averageReviewTimeDays: reviewerMetrics.averageReviewTimeDays,
    reviewsCompletedThisMonth: reviewerMetrics.completedThisMonth,
    overdueReviews: reviewerMetrics.overdueReviews,
    systemHealth: input.systemHealth ?? {
      overallScore: 100,
      emailEnabled: true,
      storageAccessible: true,
      storageMeasured: true,
      recentErrors: 0,
      recentErrorsMeasured: true
    },
    submissionsByMonth: buildSubmissionTrend(input.journals, now),
    journalsByStatus: editorSummary.byStatus,
    usersByRole: [...roleCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([role, count]) => ({
        role,
        count,
        percentage: input.users.length ? roundOneDecimal((count / input.users.length) * 100) : 0
      })),
    topReviewers: [...completedByReviewer.entries()]
      .map(([userId, reviewer]) => ({
        userId,
        name: reviewer.name,
        completedReviews: reviewer.completedReviews
      }))
      .sort((left, right) => right.completedReviews - left.completedReviews)
      .slice(0, 5)
  }
}
