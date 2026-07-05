import { readValidatedBody } from 'h3'
import { db } from '#server/db/client'
import { journals, manuscriptVersions, userInterests, userRoles, roles, users } from '#server/db/schema'
import { checkUserPermission } from '#server/utils/permissions'
import { markFileAttached, verifyPendingUpload } from '#server/utils/fileOwnership'
import { requireSession } from '#server/utils/session'
import { slugify } from '#server/utils/slug'
import { journalCreateSchema } from '#shared/validation/journals'
import { sendSubmissionReceivedEmail, sendManuscriptSubmissionEmail } from '#server/utils/email'
import { sendIfEmailAllowed } from '#server/utils/notificationPreferences'
import { createNotifications } from '#server/utils/notifications'
import { MANUSCRIPT_STATUS } from '#shared/constants/manuscriptStatus'
import { eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const allowed = await checkUserPermission(session.user.id, 'journal', 'create', {
    ownerId: session.user.id
  })
  const body = await readValidatedBody(event, payload => journalCreateSchema.parse(payload))

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to create journals.'
    })
  }

  // The client-side onboarding gate (author-onboarding.ts) only guards the SPA route;
  // this re-verifies it server-side so the check can't be bypassed by calling the API directly.
  const hasInterests = await db.query.userInterests.findFirst({
    where: eq(userInterests.userId, session.user.id)
  })

  if (!hasInterests) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Select your research interests before submitting a manuscript.'
    })
  }

  if (!session.appUser.reviewPolicyAccepted && !body.accept) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You must accept the review policy before submitting.'
    })
  }

  if (!session.appUser.reviewPolicyAccepted && body.accept) {
    await db.update(users)
      .set({
        reviewPolicyAccepted: true,
        reviewPolicyAcceptedAt: new Date()
      })
      .where(eq(users.id, session.user.id))
  }

  // A journalUrl the caller never had a token for (arbitrary or guessed) is rejected
  // before the journal row is ever created.
  if (body.journalUrl) {
    await verifyPendingUpload(body.journalUrl, session.user.id)
  }

  const slugBase = slugify(body.title)

  // Insert, file-attach, and initial-version-insert commit together (B7) — a crash
  // mid-sequence must not leave a journal row with no version history, or a file marked
  // attached to a journal that doesn't exist.
  const journal = await db.transaction(async (tx) => {
    const inserted = await tx.insert(journals).values({
      title: body.title,
      author: body.author,
      slug: `${slugBase}-${Date.now().toString().slice(-6)}`,
      description: body.description,
      abstract: body.abstract,
      institution: body.institution ?? null,
      country: body.country,
      journalLanguage: body.journalLanguage,
      journalUrl: body.journalUrl ?? null,
      journalFormat: body.journalFormat ?? null,
      license: body.license ?? null,
      userId: session.user.id,
      categoryId: body.categoryId ?? null,
      subCategoryId: body.subCategoryId ?? null,
      subSubCategoryId: body.subSubCategoryId ?? null,
      metaTitle: body.metaTitle ?? null,
      metaKeywords: body.metaKeywords ?? null,
      metaDescription: body.metaDescription ?? null,
      agree: body.agree,
      accept: body.accept,
      approvalStatus: MANUSCRIPT_STATUS.DESK_REVIEW,
      isDraft: false,
      createdBy: { userId: session.user.id, email: session.user.email }
    }).returning()

    const createdJournal = inserted[0]!

    if (body.journalUrl) {
      await markFileAttached(body.journalUrl, createdJournal.id, tx)
    }

    await tx.insert(manuscriptVersions).values({
      journalId: createdJournal.id,
      versionNumber: '1.0',
      title: createdJournal.title,
      abstract: createdJournal.abstract ?? '',
      content: createdJournal.description,
      createdBy: session.user.id,
      status: 'submitted'
    })

    return createdJournal
  })

  // Send confirmation email to author
  try {
    await sendIfEmailAllowed(session.user.id, 'manuscript_status', () =>
      sendSubmissionReceivedEmail(
        session.user.email,
        session.appUser.fullname,
        journal.title
      )
    )
  } catch (error) {
    console.error('Failed to send submission confirmation email:', error)
  }

  // Notify editors about new submission
  try {
    // Get all editor role IDs
    const editorRoleNames = ['admin', 'editor_in_chief', 'managing_editor']
    const editorRoles = await db.select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.name, editorRoleNames))

    const editorRoleIds = editorRoles.map(r => r.id)

    if (editorRoleIds.length > 0) {
      // Get all users with editor roles
      const editorUsers = await db.select({
        id: users.id,
        email: users.email,
        fullname: users.fullname
      })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .where(inArray(userRoles.roleId, editorRoleIds))

      await createNotifications(editorUsers.map(editor => ({
        userId: editor.id,
        type: 'new-submission',
        data: {
          title: 'New manuscript submitted',
          message: `${journal.title} is ready for desk review.`,
          journalId: journal.id,
          journalTitle: journal.title,
          priority: 'high',
          action_url: `/editor/journals/${journal.id}`,
          icon: 'ph-file-text',
          color: 'warning'
        }
      })))

      for (const editor of editorUsers) {
        await sendIfEmailAllowed(editor.id, 'new_submissions', () =>
          sendManuscriptSubmissionEmail(
            editor.email,
            editor.fullname,
            journal.title,
            'editor'
          )
        )
      }
    }
  } catch (error) {
    console.error('Failed to notify editors:', error)
  }

  return { journal }
})
