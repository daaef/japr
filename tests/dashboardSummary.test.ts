import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAdminDashboardSummary,
  buildEditorDashboardSummary,
  buildReviewerDashboardSummary,
  buildReviewerDashboardMetrics
} from '../server/utils/dashboardSummary'
import { MANUSCRIPT_STATUS } from '../shared/constants/manuscriptStatus'

test('buildEditorDashboardSummary keeps new desk-review submissions visible in the pending queue', () => {
  const summary = buildEditorDashboardSummary([
    { approvalStatus: MANUSCRIPT_STATUS.DESK_REVIEW },
    { approvalStatus: MANUSCRIPT_STATUS.PENDING },
    { approvalStatus: MANUSCRIPT_STATUS.IN_PROGRESS },
    { approvalStatus: MANUSCRIPT_STATUS.UNDER_PEER_REVIEW },
    { approvalStatus: MANUSCRIPT_STATUS.READY_FOR_MANAGING_EDITOR_NOTICE },
    { approvalStatus: MANUSCRIPT_STATUS.APPROVED },
    { approvalStatus: MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT },
    { approvalStatus: MANUSCRIPT_STATUS.PUBLISHED },
    { approvalStatus: MANUSCRIPT_STATUS.CHANGES_REQUESTED },
    { approvalStatus: MANUSCRIPT_STATUS.DECLINED }
  ])

  assert.equal(summary.deskReview, 1)
  assert.equal(summary.legacyPending, 1)
  assert.equal(summary.pendingQueue, 2)
  assert.equal(summary.inProgress, 1)
  assert.equal(summary.underPeerReview, 1)
  assert.equal(summary.readyForNotice, 1)
  assert.equal(summary.approved, 2)
  assert.equal(summary.published, 1)
  assert.equal(summary.changesRequested, 1)
  assert.equal(summary.declined, 1)
})

test('buildReviewerDashboardMetrics derives real review performance metrics from assignments', () => {
  const now = new Date('2026-06-27T12:00:00.000Z')
  const metrics = buildReviewerDashboardMetrics([
    {
      status: 'reviewed',
      assignedAt: new Date('2026-06-01T12:00:00.000Z'),
      reviewSubmittedAt: new Date('2026-06-05T12:00:00.000Z'),
      reviewDeadline: new Date('2026-06-10T12:00:00.000Z')
    },
    {
      status: 'reviewed',
      assignedAt: new Date('2026-06-10T12:00:00.000Z'),
      reviewSubmittedAt: new Date('2026-06-16T00:00:00.000Z'),
      reviewDeadline: new Date('2026-06-24T12:00:00.000Z')
    },
    {
      status: 'in-progress',
      assignedAt: new Date('2026-06-11T12:00:00.000Z'),
      reviewSubmittedAt: null,
      reviewDeadline: new Date('2026-06-26T12:00:00.000Z')
    },
    {
      status: 'pending',
      assignedAt: new Date('2026-06-20T12:00:00.000Z'),
      reviewSubmittedAt: null,
      reviewDeadline: new Date('2026-07-04T12:00:00.000Z')
    }
  ], now)

  assert.equal(metrics.averageReviewTimeDays, 4.8)
  assert.equal(metrics.completionRate, 50)
  assert.equal(metrics.completedThisMonth, 2)
  assert.equal(metrics.overdueReviews, 1)
  assert.equal(metrics.urgentAssignments, 1)
})

test('buildReviewerDashboardSummary separates declined invitations from declined manuscripts', () => {
  const now = new Date('2026-06-27T12:00:00.000Z')
  const summary = buildReviewerDashboardSummary([
    {
      status: 'declined',
      journalStatus: MANUSCRIPT_STATUS.UNDER_PEER_REVIEW,
      assignedAt: null,
      reviewSubmittedAt: null,
      reviewDeadline: null
    },
    {
      status: 'reviewed',
      journalStatus: MANUSCRIPT_STATUS.DECLINED,
      assignedAt: new Date('2026-06-01T12:00:00.000Z'),
      reviewSubmittedAt: new Date('2026-06-05T12:00:00.000Z'),
      reviewDeadline: new Date('2026-06-10T12:00:00.000Z')
    }
  ], now)

  assert.equal(summary.declinedInvitations, 1)
  assert.equal(summary.declinedManuscripts, 1)
  assert.equal(summary.reviewed, 1)
})

test('buildAdminDashboardSummary derives operational metrics from dashboard rows', () => {
  const now = new Date('2026-06-27T12:00:00.000Z')
  const summary = buildAdminDashboardSummary({
    journals: [
      {
        approvalStatus: MANUSCRIPT_STATUS.APPROVED,
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
        updatedAt: new Date('2026-06-06T12:00:00.000Z')
      },
      {
        approvalStatus: MANUSCRIPT_STATUS.APPROVED_WITH_COMMENT,
        createdAt: new Date('2026-05-15T12:00:00.000Z'),
        updatedAt: new Date('2026-05-25T12:00:00.000Z')
      },
      {
        approvalStatus: MANUSCRIPT_STATUS.DESK_REVIEW,
        createdAt: new Date('2026-06-20T12:00:00.000Z'),
        updatedAt: new Date('2026-06-20T12:00:00.000Z')
      },
      {
        approvalStatus: MANUSCRIPT_STATUS.DECLINED,
        createdAt: new Date('2026-04-01T12:00:00.000Z'),
        updatedAt: new Date('2026-04-11T12:00:00.000Z')
      }
    ],
    users: [
      { id: 'u1', createdAt: new Date('2026-06-01T12:00:00.000Z'), availableForReview: true },
      { id: 'u2', createdAt: new Date('2026-05-01T12:00:00.000Z'), availableForReview: true },
      { id: 'u3', createdAt: new Date('2026-06-15T12:00:00.000Z'), availableForReview: false }
    ],
    categories: 4,
    roles: ['admin', 'associate_editor', 'author'],
    userRoles: [
      { userId: 'u1', roleName: 'associate_editor' },
      { userId: 'u2', roleName: 'author' },
      { userId: 'u3', roleName: 'author' }
    ],
    reviewers: [
      {
        userId: 'u1',
        reviewerName: 'Ada Reviewer',
        assignedAt: new Date('2026-06-01T12:00:00.000Z'),
        reviewSubmittedAt: new Date('2026-06-05T12:00:00.000Z'),
        reviewDeadline: new Date('2026-06-10T12:00:00.000Z')
      },
      {
        userId: 'u1',
        reviewerName: 'Ada Reviewer',
        assignedAt: new Date('2026-06-10T12:00:00.000Z'),
        reviewSubmittedAt: null,
        reviewDeadline: new Date('2026-06-20T12:00:00.000Z')
      }
    ]
  }, now)

  assert.equal(summary.totalJournals, 4)
  assert.equal(summary.approvedJournals, 2)
  assert.equal(summary.pendingManuscripts, 1)
  assert.equal(summary.declinedJournals, 1)
  assert.equal(summary.recentSubmissions, 2)
  assert.equal(summary.averageProcessingTimeDays, 8.3)
  assert.equal(summary.totalUsers, 3)
  assert.equal(summary.newUsersThisMonth, 2)
  assert.equal(summary.activeReviewers, 1)
  assert.equal(summary.averageReviewTimeDays, 4)
  assert.equal(summary.reviewsCompletedThisMonth, 1)
  assert.equal(summary.overdueReviews, 1)
  assert.deepEqual(summary.usersByRole, [
    { role: 'associate_editor', count: 1, percentage: 33.3 },
    { role: 'author', count: 2, percentage: 66.7 }
  ])
  assert.deepEqual(summary.topReviewers, [
    { userId: 'u1', name: 'Ada Reviewer', completedReviews: 1 }
  ])
})
