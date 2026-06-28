import { eq, inArray } from 'drizzle-orm'
import { db } from '#server/db/client'
import { roles, userRoles, users } from '#server/db/schema'
import { sendAllReviewsCompleteEmail, sendEmail, sendReviewResponseEmail, sendRevisionUploadedEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotifications } from '#server/utils/notifications'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function notifyEditorsOfReviewResponse(
  journalId: string,
  reviewerUserId: string,
  action: 'accepted' | 'declined'
) {
  const [journal, reviewerUser] = await Promise.all([
    db.query.journals.findFirst({ where: (table, { eq }) => eq(table.id, journalId) }),
    db.query.users.findFirst({ where: (table, { eq }) => eq(table.id, reviewerUserId) })
  ])

  if (!journal || !reviewerUser) {
    return
  }

  const editorRoleNames = ['admin', 'editor_in_chief', 'managing_editor']
  const editorRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, editorRoleNames))
  const editorRoleIds = editorRoles.map(role => role.id)

  if (!editorRoleIds.length) {
    return
  }

  const editorUsers = await db
    .select({ id: users.id, email: users.email, fullname: users.fullname })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(inArray(userRoles.roleId, editorRoleIds))

  await createNotifications(editorUsers.map(editor => ({
    userId: editor.id,
    type: `review-${action}`,
    data: {
      title: `Reviewer ${action} invitation`,
      message: `${reviewerUser.fullname} ${action} the review for ${journal.title}.`,
      journalId: journal.id
    }
  })))

  await Promise.all(editorUsers.map(editor =>
    sendIfEmailAllowed(editor.id, 'manuscript_status', () =>
      sendReviewResponseEmail(
        editor.email,
        editor.fullname,
        reviewerUser.fullname,
        journal.title,
        action
      )
    ).catch(() => undefined)
  ))
}

export async function notifyEditorsAllReviewsComplete(journalId: string) {
  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, journalId)
  })

  if (!journal) {
    return
  }

  const editorRoleNames = ['admin', 'editor_in_chief', 'managing_editor']
  const editorRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, editorRoleNames))
  const editorUsers = await db
    .select({ id: users.id, email: users.email, fullname: users.fullname })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(inArray(userRoles.roleId, editorRoles.map(role => role.id)))

  await createNotifications(editorUsers.map(editor => ({
    userId: editor.id,
    type: 'reviews-complete',
    data: {
      title: 'All reviews complete',
      message: `All reviews are in for ${journal.title}.`,
      journalId: journal.id
    }
  })))

  await Promise.all(editorUsers.map(editor =>
    sendIfEmailAllowed(editor.id, 'manuscript_status', () =>
      sendAllReviewsCompleteEmail(editor.email, editor.fullname, journal.title)
    ).catch(() => undefined)
  ))
}

export async function notifyEditorsReviewExtensionRequested(journalId: string, reviewerUserId: string, reason: string) {
  const [journal, reviewerUser] = await Promise.all([
    db.query.journals.findFirst({ where: (table, { eq }) => eq(table.id, journalId) }),
    db.query.users.findFirst({ where: (table, { eq }) => eq(table.id, reviewerUserId) })
  ])

  if (!journal || !reviewerUser) {
    return
  }

  const editorRoleNames = ['admin', 'editor_in_chief', 'managing_editor']
  const editorRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, editorRoleNames))
  const editorUsers = await db
    .select({ id: users.id, email: users.email, fullname: users.fullname })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(inArray(userRoles.roleId, editorRoles.map(role => role.id)))

  await createNotifications(editorUsers.map(editor => ({
    userId: editor.id,
    type: 'review-extension-requested',
    data: {
      title: 'Review extension requested',
      message: `${reviewerUser.fullname} requested more time for ${journal.title}.`,
      journalId: journal.id,
      reviewerId: reviewerUser.id,
      priority: 'high',
      action_url: `/editor/journals/${journal.id}`,
      icon: 'ph-clock',
      color: 'warning',
      reason
    }
  })))

  await Promise.all(editorUsers.map(editor =>
    sendIfEmailAllowed(editor.id, 'review_assignment', () =>
      sendEmail({
        to: editor.email,
        subject: `Review extension requested: ${journal.title}`,
        html: `<p>Hello ${escapeHtml(editor.fullname)},</p>
          <p>${escapeHtml(reviewerUser.fullname)} requested more time to review <strong>${escapeHtml(journal.title)}</strong>.</p>
          <p>Reason: ${escapeHtml(reason)}</p>`
      })
    ).catch(() => undefined)
  ))
}

export async function notifyEditorsRevisionUploaded(journalId: string) {
  const journal = await db.query.journals.findFirst({
    where: (table, { eq }) => eq(table.id, journalId)
  })

  if (!journal) {
    return
  }

  const editorRoleNames = ['admin', 'editor_in_chief', 'managing_editor']
  const editorRoles = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, editorRoleNames))
  const editorUsers = await db
    .select({ id: users.id, email: users.email, fullname: users.fullname })
    .from(userRoles)
    .innerJoin(users, eq(userRoles.userId, users.id))
    .where(inArray(userRoles.roleId, editorRoles.map(role => role.id)))

  await Promise.all(editorUsers.map(editor =>
    sendIfEmailAllowed(editor.id, 'manuscript_status', () =>
      sendRevisionUploadedEmail(editor.email, editor.fullname, journal.title)
    ).catch(() => undefined)
  ))
}
