import assert from 'node:assert/strict'
import test from 'node:test'
import { systemRoles, permissionDefinitions } from '../shared/constants/permissions'
import { editorRoleKeys, reviewerRoleKeys } from '../shared/constants/roles'
import { pingTemplates, getPingTemplate } from '../shared/constants/pingTemplates'
import { derivePermissionActions, type PermissionRow } from '../server/utils/permissionActions'
import { resolveRoleLayout } from '../app/utils/workspace'

// Derive from the shared single source (same data server/utils/permissions.ts now uses),
// so this test guards against the role lists drifting apart again.
const isEditorRole = (roleName: string) => (editorRoleKeys as readonly string[]).includes(roleName)
const isReviewerRole = (roleName: string) => (reviewerRoleKeys as readonly string[]).includes(roleName)

test('shared role keys are the single source for editor/reviewer groupings', () => {
  assert.deepEqual([...editorRoleKeys], ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor'])
  assert.deepEqual([...reviewerRoleKeys], ['associate_editor', 'external_reviewer'])
})

test('shared authenticated pages resolve the correct workspace layout', () => {
  assert.equal(resolveRoleLayout(['admin']), 'admin')
  assert.equal(resolveRoleLayout(['editor_in_chief']), 'editor')
  assert.equal(resolveRoleLayout(['managing_editor']), 'editor')
  assert.equal(resolveRoleLayout(['copy_desk_editor']), 'editor')
  assert.equal(resolveRoleLayout(['associate_editor']), 'reviewer')
  assert.equal(resolveRoleLayout(['external_reviewer']), 'reviewer')
  assert.equal(resolveRoleLayout(['author']), 'author')
  assert.equal(resolveRoleLayout([]), 'public')
})

test('isEditorRole recognizes editorial roles', () => {
  assert.equal(isEditorRole('admin'), true)
  assert.equal(isEditorRole('editor_in_chief'), true)
  assert.equal(isEditorRole('author'), false)
})

test('isReviewerRole recognizes reviewer roles', () => {
  assert.equal(isReviewerRole('associate_editor'), true)
  assert.equal(isReviewerRole('external_reviewer'), true)
  assert.equal(isReviewerRole('managing_editor'), false)
})

function permissionsFor(roleName: string) {
  return systemRoles.find(role => role.name === roleName)?.permissions ?? []
}

test('superadmin sentinel permission exists and is granted only to admin', () => {
  const sentinel = permissionDefinitions.find(p => p.resource === '*' && p.action === 'manage')
  assert.ok(sentinel, 'sentinel *:manage permission must exist')
  assert.equal(sentinel.name, 'superadmin')

  for (const role of systemRoles) {
    if (role.name === 'admin') {
      assert.equal(role.permissions.includes('superadmin'), true)
    } else {
      assert.equal(role.permissions.includes('superadmin'), false, `${role.name} must not have superadmin`)
    }
  }
})

test('editor role definitions separate operational and final decision duties', () => {
  const adminPermissions = permissionsFor('admin')
  const editorInChiefPermissions = permissionsFor('editor_in_chief')
  const managingEditorPermissions = permissionsFor('managing_editor')
  const associateEditorPermissions = permissionsFor('associate_editor')

  assert.equal(adminPermissions.includes('assign-reviewers'), true)
  assert.equal(adminPermissions.includes('final-approve-manuscript'), true)
  assert.equal(adminPermissions.includes('publish-manuscript'), true)

  assert.equal(managingEditorPermissions.includes('assign-reviewers'), true)
  assert.equal(managingEditorPermissions.includes('send-approval-notice'), true)
  assert.equal(managingEditorPermissions.includes('send-decline-notice'), true)
  assert.equal(managingEditorPermissions.includes('final-approve-manuscript'), false)
  assert.equal(managingEditorPermissions.includes('publish-manuscript'), false)

  assert.equal(editorInChiefPermissions.includes('assign-reviewers'), false)
  assert.equal(editorInChiefPermissions.includes('final-approve-manuscript'), true)
  assert.equal(editorInChiefPermissions.includes('final-reject-manuscript'), true)
  assert.equal(editorInChiefPermissions.includes('publish-manuscript'), true)

  assert.equal(associateEditorPermissions.includes('assign-reviewers'), false)

  assert.equal(associateEditorPermissions.includes('request-revisions'), true)
  assert.equal(managingEditorPermissions.includes('request-revisions'), true)
  assert.equal(editorInChiefPermissions.includes('request-revisions'), true)
})

function rowsForRole(roleName: string): PermissionRow[] {
  const role = systemRoles.find(candidate => candidate.name === roleName)
  if (!role) {
    return []
  }

  return role.permissions.map((permissionName) => {
    const definition = permissionDefinitions.find(candidate => candidate.name === permissionName)!
    return { roleName, resource: definition.resource, action: definition.action, scope: definition.scope }
  })
}

test('derivePermissionActions excludes own/assigned-scoped permissions', () => {
  const rows: PermissionRow[] = [
    { roleName: 'author', resource: 'journal', action: 'create', scope: 'own' },
    { roleName: 'author', resource: 'journal', action: 'read', scope: 'public' },
    { roleName: 'associate_editor', resource: 'review', action: 'submit', scope: 'assigned' }
  ]

  assert.deepEqual(derivePermissionActions(rows), ['journal:read'])
})

test('derivePermissionActions gives every known permission when the sentinel *:manage is present', () => {
  const rows: PermissionRow[] = [{ roleName: 'admin', resource: '*', action: 'manage', scope: 'any' }]
  const actions = derivePermissionActions(rows)

  assert.equal(actions.length, permissionDefinitions.length)
  assert.equal(actions.includes('user:delete'), true)
  assert.equal(actions.includes('*:manage'), true)
})

test('derivePermissionActions does not bypass for a non-sentinel admin row', () => {
  // Without the sentinel, admin rows are treated like any other role.
  const rows: PermissionRow[] = [{ roleName: 'admin', resource: 'journal', action: 'approve', scope: 'any' }]
  const actions = derivePermissionActions(rows)

  assert.equal(actions.includes('journal:approve'), true)
  assert.equal(actions.length, 1)
})

// Regression test for the actual bug: app/pages/editor/journals/[uuid].vue used to gate every
// action button by role membership alone, so managing_editor saw editor_in_chief-only buttons
// (Approve/Decline) and editor_in_chief saw managing_editor-only ones (Assign reviewers,
// approval/decline notices) — both would 403 on click. useCan() now checks these.
test('derivePermissionActions gives managing_editor and editor_in_chief disjoint action sets', () => {
  const managingEditorActions = derivePermissionActions(rowsForRole('managing_editor'))
  const editorInChiefActions = derivePermissionActions(rowsForRole('editor_in_chief'))

  assert.equal(managingEditorActions.includes('journal:approve'), false)
  assert.equal(managingEditorActions.includes('journal:reject'), false)
  assert.equal(managingEditorActions.includes('journal:publish'), false)
  assert.equal(managingEditorActions.includes('reviewer:assign'), true)
  assert.equal(managingEditorActions.includes('journal:send_approval_notice'), true)
  assert.equal(managingEditorActions.includes('journal:send_decline_notice'), true)

  assert.equal(editorInChiefActions.includes('journal:approve'), true)
  assert.equal(editorInChiefActions.includes('journal:reject'), true)
  assert.equal(editorInChiefActions.includes('journal:publish'), true)
  assert.equal(editorInChiefActions.includes('reviewer:assign'), false)
  assert.equal(editorInChiefActions.includes('journal:send_approval_notice'), false)
  assert.equal(editorInChiefActions.includes('journal:send_decline_notice'), false)

  assert.equal(managingEditorActions.includes('journal:request_revisions'), true)
  assert.equal(editorInChiefActions.includes('journal:request_revisions'), true)
})

test('dashboard alerts rely on expected disjoint permissions', () => {
  const managingEditorActions = derivePermissionActions(rowsForRole('managing_editor'))
  const editorInChiefActions = derivePermissionActions(rowsForRole('editor_in_chief'))

  // The "documents pending review" alert is EIC-only (journal:approve).
  assert.equal(editorInChiefActions.includes('journal:approve'), true)
  assert.equal(managingEditorActions.includes('journal:approve'), false)

  // The "waiting for assignment" and "under peer review" alerts are ME-only because
  // reviewer assignment is the ME's operational duty (reviewer:assign).
  assert.equal(managingEditorActions.includes('reviewer:assign'), true)
  assert.equal(editorInChiefActions.includes('reviewer:assign'), false)
})

test('copy_desk_editor has the union of EIC + managing editor editorial permissions', () => {
  const copyDeskActions = derivePermissionActions(rowsForRole('copy_desk_editor'))

  // From EIC
  assert.equal(copyDeskActions.includes('journal:approve'), true)
  assert.equal(copyDeskActions.includes('journal:reject'), true)
  assert.equal(copyDeskActions.includes('journal:publish'), true)
  // From managing editor
  assert.equal(copyDeskActions.includes('reviewer:assign'), true)
  assert.equal(copyDeskActions.includes('journal:send_approval_notice'), true)
  assert.equal(copyDeskActions.includes('journal:send_decline_notice'), true)
  // Shared
  assert.equal(copyDeskActions.includes('journal:request_revisions'), true)
  // Original copy desk
  assert.equal(copyDeskActions.includes('journal:copy_edit'), true)
  assert.equal(copyDeskActions.includes('journal:final_edit'), true)
  assert.equal(copyDeskActions.includes('journal:prepare_publication'), true)
  // Ping
  assert.equal(copyDeskActions.includes('ping:send'), true)
})

test('send-ping permission is granted to editor roles but not reviewer/author roles', () => {
  const eicPerms = permissionsFor('editor_in_chief')
  const mePerms = permissionsFor('managing_editor')
  const copyDeskPerms = permissionsFor('copy_desk_editor')
  const adminPerms = permissionsFor('admin')
  const reviewerPerms = permissionsFor('associate_editor')
  const authorPerms = permissionsFor('author')

  assert.equal(eicPerms.includes('send-ping'), true)
  assert.equal(mePerms.includes('send-ping'), true)
  assert.equal(copyDeskPerms.includes('send-ping'), true)
  assert.equal(adminPerms.includes('send-ping'), true)
  assert.equal(reviewerPerms.includes('send-ping'), false)
  assert.equal(authorPerms.includes('send-ping'), false)
})

test('ping templates have unique ids and valid target roles', () => {
  const ids = pingTemplates.map(t => t.id)
  assert.equal(ids.length, new Set(ids).size, 'ping template ids must be unique')

  const allRoles = new Set(editorRoleKeys as readonly string[])
  for (const role of reviewerRoleKeys) allRoles.add(role)
  allRoles.add('author')

  for (const template of pingTemplates) {
    assert.ok(template.targetRoles.length > 0, `template '${template.id}' must target at least one role`)
    for (const role of template.targetRoles) {
      assert.ok(allRoles.has(role), `template '${template.id}' targets unknown role '${role}'`)
    }
  }
})

test('getPingTemplate returns the correct template or undefined', () => {
  const found = getPingTemplate('remind-reviewer-deadline')
  assert.ok(found)
  assert.equal(found.id, 'remind-reviewer-deadline')
  assert.equal(found.label, 'Review deadline reminder')

  assert.equal(getPingTemplate('nonexistent'), undefined)
})

test('ping template render produces title and message', () => {
  const template = getPingTemplate('revision-overdue')!
  const result = template.render({
    senderName: 'Jane Editor',
    targetName: 'Bob Author',
    manuscriptTitle: 'Quantum Effects',
    manuscriptId: 'uuid-123',
    manuscriptStatus: 'changes_requested'
  })

  assert.equal(result.title, 'Revision overdue')
  assert.ok(result.message.includes('Jane Editor'))
  assert.ok(result.message.includes('Quantum Effects'))
})
