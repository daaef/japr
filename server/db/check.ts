import type { Pool } from 'pg'

/**
 * Assert that the live database actually contains the objects our migrations are
 * supposed to add. This is the guard against "migration drift" — a DB whose
 * __drizzle_migrations journal claims a migration is applied while the column /
 * enum value it adds is in fact missing (which silently 500s every login).
 *
 * Add a row here whenever a migration introduces an object that the app reads on
 * a hot path. Keep it cheap: it runs at boot and in CI.
 */
const REQUIRED_COLUMNS: Array<{ table: string, column: string, migration: string }> = [
  // 0002_notification_preferences — better-auth selects every users column on login
  { table: 'users', column: 'notification_preferences', migration: '0002_notification_preferences' },
  // 0008_good_madrox — admin_audit_logs.sql existed on disk but was never registered in
  // _journal.json, so db:migrate never created the table; every /api/admin/audit/* route 500'd.
  { table: 'admin_audit_logs', column: 'id', migration: '0008_good_madrox' },
  // 0009_demonic_human_robot — activate.post.ts reads these on every activation attempt
  { table: 'activations', column: 'expires_at', migration: '0009_demonic_human_robot' },
  { table: 'activations', column: 'attempts', migration: '0009_demonic_human_robot' }
]

const REQUIRED_ENUM_VALUES: Array<{ enumName: string, value: string, migration: string }> = [
  // 0001_workflow_statuses
  { enumName: 'approval_status', value: 'under_peer_review', migration: '0001_workflow_statuses' },
  { enumName: 'approval_status', value: 'ready_for_managing_editor_notice', migration: '0001_workflow_statuses' },
  // 0003_desk_publication_statuses — journals/search.get.ts filters on 'published' on a hot path
  { enumName: 'approval_status', value: 'desk_review', migration: '0003_desk_publication_statuses' },
  { enumName: 'approval_status', value: 'published', migration: '0003_desk_publication_statuses' }
]

export interface SchemaCheckResult {
  ok: boolean
  missing: string[]
}

/** Query the live schema; return any required objects that are absent. Does NOT close the pool. */
export async function assertSchema(pool: Pool): Promise<SchemaCheckResult> {
  const missing: string[] = []

  for (const req of REQUIRED_COLUMNS) {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [req.table, req.column]
    )
    if (rows.length === 0) {
      missing.push(`column ${req.table}.${req.column} (from migration ${req.migration})`)
    }
  }

  for (const req of REQUIRED_ENUM_VALUES) {
    const { rows } = await pool.query(
      `SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = $1 AND e.enumlabel = $2`,
      [req.enumName, req.value]
    )
    if (rows.length === 0) {
      missing.push(`enum value ${req.enumName}='${req.value}' (from migration ${req.migration})`)
    }
  }

  return { ok: missing.length === 0, missing }
}
