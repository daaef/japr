import type { Page } from '@playwright/test'
import {
  test,
  expect,
  env,
  login,
  logout,
  navigateTo,
  expectPath,
  expectVisible,
  fillByLabel,
  clickButton,
  selectOption,
  uniqueId,
  waitForEmail,
  extractActivationCode,
  extractLink,
  sharedState
} from '../helpers'

async function clearSession(page: Page) {
  // Best-effort logout via the UI, then wipe any session cookies so the next
  // assertion starts from an unauthenticated state.
  await logout(page).catch(() => undefined)
  await page.context().clearCookies()
}

test.describe.serial('Flow A: Registration, Activation, and Authentication', () => {
  const timestamp = Date.now()
  const username = uniqueId('e2euser')
  const testEmail = `japr-e2e-${timestamp}@inbox.mailtrap.io`
  const password = 'TestPass123!'

  test('A1: Register new account', async ({ page }) => {
    await navigateTo(page, '/auth/register')

    await fillByLabel(page, 'Full Name', `E2E Tester ${timestamp}`)
    await fillByLabel(page, 'Username', username)
    await fillByLabel(page, 'Institution', 'JAPR E2E University')
    await fillByLabel(page, 'Email address', testEmail)
    await selectOption(page, 'Country', 'Nigeria')
    await fillByLabel(page, 'Password', password)
    await fillByLabel(page, 'Confirm Password', password)

    await clickButton(page, 'Sign up')

    await expectPath(page, '/auth/success-activation')
    await expectVisible(page, 'Check your email')

    sharedState.set('registeredEmail', testEmail)
    sharedState.set('registeredPassword', password)
  })

  test('A2: Activate account with code from Mailtrap email', async ({ page }) => {
    test.slow()

    const after = new Date(Date.now() - 120_000)
    const email = await waitForEmail({
      to: testEmail,
      subjectContains: 'activation',
      after,
      timeoutMs: 60_000
    })
    const code = extractActivationCode(email.html)
    expect(code).toMatch(/^\d{6}$/)

    await navigateTo(page, `/auth/activate?email=${encodeURIComponent(testEmail)}`)
    await page.locator('input[placeholder="000000"], input[maxlength="6"]').fill(code)
    await clickButton(page, 'Activate account')

    await expectPath(page, '/auth/login')
    await expectVisible(page, 'Account activated')
  })

  test('A3: Activation edge cases — wrong code shows error', async ({ page }) => {
    await navigateTo(page, `/auth/activate?email=${encodeURIComponent(testEmail)}`)
    await page.locator('input[placeholder="000000"], input[maxlength="6"]').fill('000000')
    await clickButton(page, 'Activate account')

    await expectVisible(page, 'Invalid activation code')
  })

  test('A4: Login with correct credentials', async ({ page }) => {
    await login(page, testEmail, password, 'flowA-newUser')

    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 })
    // New accounts are authors with no interests yet, so they land on the
    // interests onboarding page. Accounts that already saved interests go to /author.
    await expect(page).toHaveURL(/\/author(\/interests)?$/, { timeout: 15_000 })
  })

  test('A5: Login with wrong password shows error', async ({ page }) => {
    await clearSession(page)
    await navigateTo(page, '/auth/login')

    await fillByLabel(page, 'Email address', testEmail)
    await fillByLabel(page, 'Password', 'WrongPassword123!')
    await clickButton(page, 'Sign in')

    await expectVisible(page, 'Invalid')
  })

  test('A6: Forgot password flow — request reset, verify email sent', async ({ page }) => {
    test.slow()
    await clearSession(page)

    await navigateTo(page, '/auth/forgot-password')
    await expectVisible(page, 'Reset your password')

    await fillByLabel(page, 'Email', testEmail)
    await clickButton(page, 'Send reset link')

    await expectPath(page, '/auth/success-reset-request')

    const after = new Date(Date.now() - 120_000)
    const email = await waitForEmail({
      to: testEmail,
      subjectContains: 'reset',
      after,
      timeoutMs: 60_000
    })
    const resetLink = extractLink(email.html, 'reset-password')
    expect(resetLink).toMatch(/\/auth\/reset-password/)
  })

  test('A7: Guest middleware — redirects for logged-in and logged-out users', async ({ page }) => {
    await login(page, testEmail, password, 'flowA-newUser')

    await navigateTo(page, '/auth/login')
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/author(\/interests)?$/)

    await clearSession(page)

    await navigateTo(page, '/author')
    await expectPath(page, '/auth/login')
    await expectVisible(page, 'Sign in')
  })
})
