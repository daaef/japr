import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AUDIT_RESOURCE_LABELS,
  auditActionLabel,
  humanize,
  versionStatusLabel
} from '../app/utils/displayLabels'

// Project rule: academics never see raw stored values. If the server starts logging a new
// audit resourceType, it must get a friendly label in app/utils/displayLabels.ts.

const SERVER_DIR = fileURLToPath(new URL('../server', import.meta.url))

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return tsFiles(path)
    return name.endsWith('.ts') ? [path] : []
  })
}

test('every audit resourceType the server logs has a friendly label', () => {
  const logged = new Set<string>()
  for (const file of tsFiles(SERVER_DIR)) {
    for (const match of readFileSync(file, 'utf8').matchAll(/resourceType:\s*['"]([a-z_]+)['"]/g)) {
      logged.add(match[1]!)
    }
  }
  assert.ok(logged.size > 0, 'expected to find resourceType values in server/')
  const missing = [...logged].filter(type => !(type in AUDIT_RESOURCE_LABELS))
  assert.deepEqual(missing, [], `Add labels for: ${missing.join(', ')}`)
})

test('labels never show underscores or code-style values', () => {
  assert.equal(versionStatusLabel('under_review'), 'Under review')
  assert.equal(auditActionLabel('role_assign'), 'Role assigned')
  assert.equal(auditActionLabel('manuscript_approved_for_publication'), 'Manuscript approved for publication')
  assert.equal(humanize('in-progress'), 'In progress')
})
