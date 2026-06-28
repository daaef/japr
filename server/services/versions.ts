import DiffMatchPatch from 'diff-match-patch'
import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { journals, manuscriptVersions } from '#server/db/schema'
import { getUserRoles } from '#server/utils/session'
import { isEditorialProfileRole, isReviewerRole } from '#server/utils/permissions'

const dmp = new DiffMatchPatch()

export async function assertVersionAccess(userId: string, journalId: string) {
  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, journalId)
  })

  if (!journal) {
    throw createError({ statusCode: 404, statusMessage: 'Journal not found.' })
  }

  const roles = await getUserRoles(userId)
  const roleNames = roles.map(role => role.name)

  if (roleNames.includes('admin') || roleNames.some(isEditorialProfileRole)) {
    return journal
  }

  if (journal.userId === userId) {
    return journal
  }

  if (roleNames.some(isReviewerRole)) {
    const assignment = await db.query.reviewers.findFirst({
      where: (table, { and, eq }) => and(eq(table.journalId, journalId), eq(table.userId, userId))
    })

    if (assignment) {
      return journal
    }
  }

  throw createError({ statusCode: 403, statusMessage: 'Access denied.' })
}

export async function listJournalVersions(journalId: string) {
  return db.query.manuscriptVersions.findMany({
    where: (table, { eq }) => eq(table.journalId, journalId),
    orderBy: (table, { asc }) => [asc(table.createdAt)]
  })
}

export function compareVersionTexts(left: string, right: string) {
  const diffs = dmp.diff_main(left, right)
  dmp.diff_cleanupSemantic(diffs)

  return {
    diffs,
    html: dmp.diff_prettyHtml(diffs)
  }
}

export async function revertToVersion(journalId: string, versionId: string, userId: string) {
  const source = await db.query.manuscriptVersions.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, versionId), eq(table.journalId, journalId))
  })

  if (!source) {
    throw createError({ statusCode: 404, statusMessage: 'Version not found.' })
  }

  const existing = await db.query.manuscriptVersions.findMany({
    where: (table, { eq }) => eq(table.journalId, journalId)
  })

  const nextMinor = existing.length + 1
  const versionNumber = `${Math.floor(nextMinor / 10) || 1}.${nextMinor % 10}`

  const inserted = await db.insert(manuscriptVersions).values({
    journalId,
    versionNumber,
    title: source.title,
    abstract: source.abstract,
    content: source.content,
    changesSummary: `Reverted from version ${source.versionNumber}`,
    createdBy: userId,
    parentVersionId: source.id,
    status: 'submitted'
  }).returning()

  await db.update(journals).set({
    title: source.title,
    abstract: source.abstract,
    description: source.content,
    updatedAt: new Date()
  }).where(eq(journals.id, journalId))

  return inserted[0]!
}
