import type { ManuscriptStatus } from '../constants/manuscriptStatus'

export interface EditorDashboardSummary {
  deskReview: number
  legacyPending: number
  pendingQueue: number
  inProgress: number
  underPeerReview: number
  reviewed: number
  readyForNotice: number
  approved: number
  published: number
  changesRequested: number
  declined: number
  byStatus: Record<ManuscriptStatus, number>
}

export interface ReviewerDashboardMetrics {
  averageReviewTimeDays: number
  completionRate: number
  completedThisMonth: number
  overdueReviews: number
  urgentAssignments: number
}

export interface ReviewerDashboardSummary extends ReviewerDashboardMetrics {
  pending: number
  inProgress: number
  reviewed: number
  approved: number
  declinedInvitations: number
  declinedManuscripts: number
  assignments: ReviewerDashboardAssignment[]
}

export interface ReviewerDashboardAssignment {
  id: string
  journalId: string
  journalTitle: string
  status: string
  journalStatus: ManuscriptStatus
  assignedAt: string | null
  reviewDeadline: string | null
}

export interface PublicDashboardStats {
  journals: number
  authors: number
  associateEditors: number
  manuscripts: number
}

export interface AdminRoleDistribution {
  role: string
  count: number
  percentage: number
}

export interface AdminTopReviewer {
  userId: string
  name: string
  completedReviews: number
}

export interface AdminSubmissionTrend {
  label: string
  count: number
}

export interface AdminDashboardSummary {
  totalJournals: number
  approvedJournals: number
  pendingManuscripts: number
  declinedJournals: number
  recentSubmissions: number
  averageProcessingTimeDays: number
  totalUsers: number
  newUsersThisMonth: number
  activeReviewers: number
  totalRoles: number
  totalCategories: number
  averageReviewTimeDays: number
  reviewsCompletedThisMonth: number
  overdueReviews: number
  systemHealth: {
    overallScore: number
    emailEnabled: boolean
    storageAccessible: boolean
    storageMeasured: boolean
    recentErrors: number
    recentErrorsMeasured: boolean
  }
  submissionsByMonth: AdminSubmissionTrend[]
  journalsByStatus: Record<ManuscriptStatus, number>
  usersByRole: AdminRoleDistribution[]
  topReviewers: AdminTopReviewer[]
}
