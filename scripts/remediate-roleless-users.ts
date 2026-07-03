import { eq, isNull } from 'drizzle-orm'
import { db, pool } from '../server/db/client'
import { userRoles, users } from '../server/db/schema'

/**
 * One-time remediation for users created before the sign-up/hook fix in the
 * auth-identity-hardening task, who ended up with zero roles and no reachable
 * dashboard. Defaults to a dry run that only lists affected accounts — nobody is
 * reassigned a role until an operator has read that list and re-run with --apply.
 *
 * Usage:
 *   pnpm tsx scripts/remediate-roleless-users.ts            # dry run — lists only
 *   pnpm tsx scripts/remediate-roleless-users.ts --apply     # assigns 'author' role
 */
async function main() {
  const apply = process.argv.includes('--apply')

  const roleless = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .where(isNull(userRoles.userId))

  if (roleless.length === 0) {
    console.log('No roleless users found.')
    return
  }

  console.log(`Found ${roleless.length} user(s) with zero roles:`)
  for (const user of roleless) {
    console.log(`  - ${user.email} (${user.username}), created ${user.createdAt.toISOString()}`)
  }

  if (!apply) {
    console.log('\nDry run only — no changes made. Re-run with --apply to assign the "author" role to the users listed above.')
    return
  }

  const authorRole = await db.query.roles.findFirst({
    where: (table, { eq }) => eq(table.name, 'author')
  })

  if (!authorRole) {
    throw new Error('The "author" role does not exist in the roles table — cannot remediate.')
  }

  await db.insert(userRoles).values(
    roleless.map(user => ({ userId: user.id, roleId: authorRole.id }))
  )

  console.log(`\nAssigned the "author" role to ${roleless.length} user(s).`)
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
