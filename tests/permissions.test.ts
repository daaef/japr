import assert from 'node:assert/strict'
import test from 'node:test'
import { systemRoles, permissionDefinitions } from '../shared/constants/permissions'
import { editorRoleKeys, reviewerRoleKeys } from '../shared/constants/roles'
import { derivePermissionActions, type PermissionRow } from '../server/utils/permissionActions'

// Derive from the shared single source (same data server/utils/permissions.ts now uses),
// so this test guards against the role lists drifting apart again.
const isEditorRole = (roleName: string) => (editorRoleKeys as readonly string[]).includes(roleName)
const isReviewerRole = (roleName: string) => (reviewerRoleKeys as readonly string[]).includes(roleName)

test('shared role keys are the single source for editor/reviewer groupings', () => {
  assert.deepEqual([...editorRoleKeys], ['admin', 'editor_in_chief', 'managing_editor'])
  assert.deepEqual([...reviewerRoleKeys], ['associate_editor', 'external_reviewer', 'desk_editor'])
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

test('derivePermissionActions gives admin every known permission regardless of rows', () => {
  const rows: PermissionRow[] = [{ roleName: 'admin', resource: 'journal', action: 'approve', scope: 'any' }]
  const actions = derivePermissionActions(rows)

  assert.equal(actions.length, permissionDefinitions.length)
  assert.equal(actions.includes('user:delete'), true)
})

// Regression test for the actual bug: app/pages/editor/journals/[uuid].vue used to gate every
// action button by role membership alone, so managing_editor saw editor_in_chief-only buttons
// (Send to review/Desk decline) and editor_in_chief saw managing_editor-only ones (Assign
// reviewers, approval/decline notices) — both would 403 on click. useCan() now checks these.
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
