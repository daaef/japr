import assert from 'node:assert/strict'
import test from 'node:test'
import { preferencesAllowRealtime } from '../server/utils/notificationPreferences'
import { defaultNotificationPreferences } from '../shared/validation/notifications'

test('preferencesAllowRealtime defaults missing preferences to enabled', () => {
  assert.equal(preferencesAllowRealtime(null), true)
  assert.equal(preferencesAllowRealtime(undefined), true)
})

test('preferencesAllowRealtime follows the in-app realtime preference', () => {
  assert.equal(preferencesAllowRealtime(defaultNotificationPreferences), true)
  assert.equal(preferencesAllowRealtime({
    ...defaultNotificationPreferences,
    in_app: {
      ...defaultNotificationPreferences.in_app,
      realtime: false
    }
  }), false)
})
