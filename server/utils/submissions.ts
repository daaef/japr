import { db } from '#server/db/client'

interface AuthorReviewerSource {
  comment: string | null
  criteriaRatings: {
    originality: number
    methodology: number
    significance: number
    clarity: number
    literatureReview: number
    dataAnalysis: number
  } | null
  recommendation: string | null
  status: string
  reviewSubmittedAt: Date | null
}

export interface AuthorReviewerView {
  id: string
  recommendation: string | null
  comment: string | null
  criteriaRatings: AuthorReviewerSource['criteriaRatings']
  status: string
  reviewSubmittedAt: Date | null
}

export function toAuthorReviewerView<T extends AuthorReviewerSource>(
  reviewer: T,
  index: number
): AuthorReviewerView {
  return {
    id: `Reviewer ${index + 1}`,
    recommendation: reviewer.recommendation,
    comment: reviewer.comment,
    criteriaRatings: reviewer.criteriaRatings,
    status: reviewer.status,
    reviewSubmittedAt: reviewer.reviewSubmittedAt
  }
}

export function sanitizeJournalForAuthor<T extends { reviewers?: unknown, changeRequests?: unknown }>(journal: T) {
  const reviewerLabels = Array.isArray(journal.reviewers)
    ? journal.reviewers.map((_, index) => ({ id: `Reviewer ${index + 1}` }))
    : []

  // changeRequests entries carry the acting editor/reviewer's raw user id (editor_id) —
  // strip it before this ever reaches the author it was written about.
  const scrubbedChangeRequests = Array.isArray(journal.changeRequests)
    ? journal.changeRequests.map((request) => {
        if (!request || typeof request !== 'object') {
          return request
        }
        const { editor_id: _editorId, ...rest } = request as Record<string, unknown>
        return rest
      })
    : journal.changeRequests

  return {
    ...journal,
    reviewers: reviewerLabels,
    changeRequests: scrubbedChangeRequests
  }
}

export async function getJournalById(id: string) {
  return db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })
}

export async function getJournalBySlug(slug: string) {
  return db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.slug, slug)
  })
}

export async function getJournalDetails(id: string) {
  const journal = await getJournalById(id)

  if (!journal) {
    return null
  }

  const categoryId = journal.categoryId
  const subCategoryId = journal.subCategoryId
  const subSubCategoryId = journal.subSubCategoryId

  const [versions, reviewerRows, category, subCategory, subSubCategory] = await Promise.all([
    db.query.manuscriptVersions.findMany({
      where: (table, { eq }) => eq(table.journalId, journal.id)
    }),
    db.query.reviewers.findMany({
      where: (table, { eq }) => eq(table.journalId, journal.id)
    }),
    categoryId
      ? db.query.categories.findFirst({ where: (table, { eq }) => eq(table.id, categoryId) })
      : null,
    subCategoryId
      ? db.query.subCategories.findFirst({ where: (table, { eq }) => eq(table.id, subCategoryId) })
      : null,
    subSubCategoryId
      ? db.query.subSubCategories.findFirst({ where: (table, { eq }) => eq(table.id, subSubCategoryId) })
      : null
  ])

  return {
    journal,
    category,
    subCategory,
    subSubCategory,
    versions,
    reviewers: reviewerRows
  }
}

export async function getAuthorSubmissionDetails(id: string) {
  const details = await getJournalDetails(id)

  if (!details) {
    return null
  }

  return {
    journal: sanitizeJournalForAuthor(details.journal),
    versions: details.versions,
    reviewers: details.reviewers.map(toAuthorReviewerView)
  }
}

export async function getReviewerAssignmentById(id: string) {
  return db.query.reviewers.findFirst({
    where: (table, { eq }) => eq(table.id, id)
  })
}
