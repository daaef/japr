import assert from 'node:assert/strict'
import test from 'node:test'
import { systemRoles } from '../shared/constants/permissions'

function isEditorRole(roleName: string) {
  return ['admin', 'editor_in_chief', 'managing_editor'].includes(roleName)
}

function isReviewerRole(roleName: string) {
  return ['associate_editor', 'external_reviewer', 'desk_editor'].includes(roleName)
}

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

  // Requesting revisions is an editorial decision, available to the handling/associate
  // editor (who held the permission already) and to both editor roles via requirePermission.
  assert.equal(associateEditorPermissions.includes('request-revisions'), true)
  assert.equal(managingEditorPermissions.includes('request-revisions'), true)
  assert.equal(editorInChiefPermissions.includes('request-revisions'), true)
})
