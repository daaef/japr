import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db, pool } from '#server/db/client'
import { assertSchema } from '#server/db/check'

/**
 * Boot-time database guard.
 *
 * - In development we run pending migrations automatically so a freshly-cloned
 *   repo (or a drifted dev DB) self-heals — the migration SQL is idempotent.
 *   We skip auto-migrate in production because the .sql files are not guaranteed
 *   to be bundled into the Nitro output; prod deploys should run `pnpm db:migrate`
 *   explicitly before/at release.
 * - In ALL environments we then assert the schema actually contains the objects
 *   the app reads on hot paths. A missing object (the exact "migration drift" that
 *   silently 500s every login) becomes a loud, fatal boot error instead.
 *
 * Disable with DISABLE_BOOT_MIGRATE=true (e.g. for tests or read-only replicas).
 */
export default defineNitroPlugin(async () => {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_BOOT_MIGRATE === 'true') {
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    try {
      await migrate(db, { migrationsFolder: 'server/db/migrations' })
    } catch (error) {
      // Don't crash dev on a drifted journal — the schema assertion below is the
      // real gate. Surface the error so it's visible.
      console.error('[boot-migrate] migrate() reported an error (continuing to schema check):', error)
    }
  }

  const { ok, missing } = await assertSchema(pool)
  if (!ok) {
    const message = `[boot-migrate] Database schema is missing required objects:\n  - ${missing.join('\n  - ')}\nRun \`pnpm db:migrate\` (and \`pnpm db:check\`).`
    console.error(message)
    throw new Error(message)
  }

  console.log('[boot-migrate] database schema OK')
})
