import assert from 'node:assert/strict'
import test from 'node:test'

const { escapeHtml } = await import('../server/utils/email')

test('escapeHtml neutralizes HTML-significant characters', () => {
  assert.equal(
    escapeHtml('<script>alert(1)</script>'),
    '&lt;script&gt;alert(1)&lt;/script&gt;'
  )
})

test('escapeHtml escapes quotes so it is safe inside a double-quoted attribute', () => {
  assert.equal(escapeHtml('"><img src=x onerror=alert(1)>'), '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;')
})

test('escapeHtml escapes ampersands and single quotes', () => {
  assert.equal(escapeHtml(`Tom & Jerry's "show"`), 'Tom &amp; Jerry&#39;s &quot;show&quot;')
})

test('escapeHtml leaves plain text untouched', () => {
  assert.equal(escapeHtml('Dr. Jane Doe'), 'Dr. Jane Doe')
})
