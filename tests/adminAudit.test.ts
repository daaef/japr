import assert from 'node:assert/strict'
import test from 'node:test'

const { getAuditRiskLevel, sanitizeAuditValues } = await import('../server/utils/adminAuditCore')

test('getAuditRiskLevel classifies high-risk admin actions', () => {
  assert.equal(getAuditRiskLevel('delete'), 'high')
  assert.equal(getAuditRiskLevel('role_assign'), 'high')
  assert.equal(getAuditRiskLevel('permission_grant'), 'high')
  assert.equal(getAuditRiskLevel('cleanup'), 'high')
})

test('getAuditRiskLevel classifies medium and low-risk admin actions', () => {
  assert.equal(getAuditRiskLevel('create'), 'medium')
  assert.equal(getAuditRiskLevel('update'), 'medium')
  assert.equal(getAuditRiskLevel('email_sent'), 'medium')
  assert.equal(getAuditRiskLevel('view'), 'low')
})

test('sanitizeAuditValues redacts sensitive fields without dropping safe context', () => {
  assert.deepEqual(sanitizeAuditValues({
    email: 'editor@example.com',
    password: 'secret',
    passwordHash: 'hash',
    sessionToken: 'token'
  }), {
    email: 'editor@example.com',
    password: '[redacted]',
    passwordHash: '[redacted]',
    sessionToken: '[redacted]'
  })
})
