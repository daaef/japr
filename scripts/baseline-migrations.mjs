/**
 * Mark existing SQL migrations as applied without re-running them.
 * Use when the schema was created with `db:push` and `db:migrate` fails with "already exists".
 */
import crypto from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) process.loadEnvFile?.(envPath)

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is required (no implicit fallback).')
  process.exit(1)
}
const migrationsFolder = resolve(process.cwd(), 'server/db/migrations')
const journal = JSON.parse(readFileSync(`${migrationsFolder}/meta/_journal.json`, 'utf8'))

const pool = new pg.Pool({ connectionString: url })

const { rows: tables } = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
`)
if (tables.length === 0) {
  console.error('No public tables found — run `pnpm db:migrate` on a fresh database instead.')
  process.exit(1)
}

const { rows: applied } = await pool.query(
  'SELECT hash FROM drizzle.__drizzle_migrations'
)
if (applied.length > 0) {
  console.log(`Migration journal already has ${applied.length} row(s); nothing to baseline.`)
  await pool.end()
  process.exit(0)
}

for (const entry of journal.entries) {
  const sqlPath = `${migrationsFolder}/${entry.tag}.sql`
  const query = readFileSync(sqlPath, 'utf8')
  const hash = crypto.createHash('sha256').update(query).digest('hex')
  await pool.query(
    'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
    [hash, entry.when]
  )
  console.log(`Baselined: ${entry.tag}`)
}

await pool.end()
console.log('Done. `pnpm db:migrate` should now be a no-op until new migrations are added.')
