/**
 * Standalone schema drift check — `pnpm db:check`.
 * Exits non-zero (for CI) if the live DB is missing required migration objects.
 */
import { loadEnvFileIfPresent } from '#server/utils/load-env'

loadEnvFileIfPresent()

const { pool } = await import('#server/db/client')
const { assertSchema } = await import('#server/db/check')

const { ok, missing } = await assertSchema(pool)

if (!ok) {
  console.error('Schema check FAILED. Missing:')
  for (const item of missing) {
    console.error(`  - ${item}`)
  }
  console.error('\nRun `pnpm db:migrate` to apply pending migrations.')
  await pool.end()
  process.exit(1)
}

console.log('Schema check OK — all required migration objects are present.')
await pool.end()
process.exit(0)
