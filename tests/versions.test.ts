import assert from 'node:assert/strict'
import test from 'node:test'
import { getNextVersionNumber } from '../server/utils/versionNumbering'

test('getNextVersionNumber starts a fresh journal at 1.1', () => {
  assert.equal(getNextVersionNumber([]), '1.1')
})

test('getNextVersionNumber increments from the highest existing minor number, not a row count (B17)', () => {
  assert.equal(getNextVersionNumber([{ versionNumber: '1.0' }]), '1.1')
  assert.equal(getNextVersionNumber([{ versionNumber: '1.0' }, { versionNumber: '1.1' }]), '1.2')
})

test('getNextVersionNumber does not wrap at the 10th version (previous floor(n/10) formula reset to 1.0)', () => {
  const nineVersions = Array.from({ length: 9 }, (_, index) => ({ versionNumber: `1.${index}` }))
  assert.equal(getNextVersionNumber(nineVersions), '1.9')
})

test('getNextVersionNumber is unaffected by array order, only the highest minor number', () => {
  const outOfOrder = [{ versionNumber: '1.3' }, { versionNumber: '1.1' }, { versionNumber: '1.0' }]
  assert.equal(getNextVersionNumber(outOfOrder), '1.4')
})

test('getNextVersionNumber ignores a gap instead of colliding with an already-issued number', () => {
  // revision.post.ts's old `1.${count}` scheme and versions.ts's old
  // `floor(n/10).${n%10}` scheme could disagree on the same input — deriving from the
  // max minor number instead of a count keeps both call sites consistent even if a
  // version was deleted (a gap), rather than reissuing a number that already exists.
  const withGap = [{ versionNumber: '1.0' }, { versionNumber: '1.2' }]
  assert.equal(getNextVersionNumber(withGap), '1.3')
})
