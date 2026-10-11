import { count, eq } from 'drizzle-orm'
import { db, pool } from '../server/db/client'
import {
  accounts,
  activations,
  adminAuditLogs,
  files,
  journalComments,
  journalDislikes,
  journalLikes,
  journals,
  manuscriptVersions,
  notifications,
  reviewers,
  sessions,
  userInterests,
  userRoles,
  users
} from '../server/db/schema'

/**
 * Deletes one or more user accounts by email, after reporting exactly what will
 * cascade-delete with them. Every FK to users.id in this schema is ON DELETE CASCADE
 * except admin_audit_logs.user_id (ON DELETE SET NULL — that audit history survives,
 * just with its actor reference nulled).
 *
 * Defaults to a dry run that only reports the impact. Nobody is deleted until an
 * operator has read that report and re-run with --apply.
 *
 * Usage:
 *   pnpm tsx scripts/delete-users.ts admin@example.com                     # dry run
 *   pnpm tsx scripts/delete-users.ts admin@example.com other@x.com --apply # actually deletes
 */

const CASCADE_CHECKS = [
  { label: 'journalsAsAuthor', table: journals, column: journals.userId },
  { label: 'reviewerAssignments', table: reviewers, column: reviewers.userId },
  { label: 'comments', table: journalComments, column: journalComments.userId },
  { label: 'likes', table: journalLikes, column: journalLikes.userId },
  { label: 'dislikes', table: journalDislikes, column: journalDislikes.userId },
  { label: 'interests', table: userInterests, column: userInterests.userId },
  { label: 'notifications', table: notifications, column: notifications.userId },
  { label: 'filesOwned', table: files, column: files.ownerId },
  { label: 'manuscriptVersionsCreated', table: manuscriptVersions, column: manuscriptVersions.createdBy },
  { label: 'roleAssignments', table: userRoles, column: userRoles.userId },
  { label: 'sessions', table: sessions, column: sessions.userId },
  { label: 'activations', table: activations, column: activations.userId },
  { label: 'credentialAccounts', table: accounts, column: accounts.userId }
] as const

async function reportImpact(userId: string) {
  const counts = await Promise.all(
    CASCADE_CHECKS.map(async (check) => {
      const rows = await db.select({ value: count() }).from(check.table).where(eq(check.column, userId))
      return { label: check.label, value: rows[0]?.value ?? 0 }
    })
  )

  const auditRows = await db.select({ value: count() }).from(adminAuditLogs).where(eq(adminAuditLogs.userId, userId))

  return {
    cascaded: counts.filter(c => c.value > 0),
    totalCascaded: counts.reduce((sum, c) => sum + c.value, 0),
    auditLogRowsToDeactor: auditRows[0]?.value ?? 0
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const emails = args.filter(arg => arg !== '--apply')

  if (emails.length === 0) {
    console.log('Usage: tsx scripts/delete-users.ts <email> [email2 ...] [--apply]')
    return
  }

  for (const email of emails) {
    const user = await db.query.users.findFirst({ where: (table, { eq: eqFn }) => eqFn(table.email, email) })

    if (!user) {
      console.log(`- ${email}: not found, skipping.`)
      continue
    }

    const impact = await reportImpact(user.id)
    console.log(`\n${email} (${user.id}):`)

    if (impact.cascaded.length === 0) {
      console.log('  No attached data — safe to delete.')
    } else {
      console.log('  WILL CASCADE-DELETE:')
      for (const item of impact.cascaded) {
        console.log(`    ${item.label}: ${item.value}`)
      }
    }

    if (impact.auditLogRowsToDeactor > 0) {
      console.log(`  ${impact.auditLogRowsToDeactor} admin_audit_logs row(s) will keep their entry but lose the actor reference (set to null).`)
    }

    if (apply) {
      await db.delete(users).where(eq(users.id, user.id))
      console.log('  DELETED.')
    }
  }

  if (!apply) {
    console.log('\nDry run only — no changes made. Re-run with --apply to actually delete the account(s) listed above.')
  }
}

main()
  .then(async () => {
    await pool.end()
  })
  .catch(async (error) => {
    console.error(error)
    await pool.end()
    process.exit(1)
  })
