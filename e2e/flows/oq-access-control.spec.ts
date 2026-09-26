import { test, expect, navigateTo, expectPath } from '../helpers'

async function expectHealthyPage(page: Parameters<typeof navigateTo>[0], path: string) {
  const response = await page.goto(path)
  await page.waitForLoadState('networkidle')
  expect(response, `No document response was received for ${path}`).not.toBeNull()
  expect(response!.status(), `${path} returned HTTP ${response!.status()}`).toBeLessThan(400)
  await expect(page.locator('body')).not.toContainText(/404|page not found|internal server error|application error/i)
  expect((await page.locator('body').innerText()).trim().length, `${path} rendered no meaningful content`).toBeGreaterThan(20)
}

async function expectDeniedOrRedirected(page: Parameters<typeof navigateTo>[0], restrictedPath: string) {
  await page.goto(restrictedPath)
  await page.waitForLoadState('networkidle')
  const stayed = new URL(page.url()).pathname.startsWith(restrictedPath)
  if (stayed) {
    await expect(page.locator('body')).toContainText(/access denied|forbidden|unauthorized|not authorized/i)
  } else {
    await expect(page).not.toHaveURL(new RegExp(`${restrictedPath}(?:/|$)`))
  }
}

async function expectLoginRedirect(page: Parameters<typeof navigateTo>[0], path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await expectPath(page, '/auth/login')
}

test.describe.serial('Flow O-Q: Visibility, Access Control, Notifications, Edge Cases', () => {
  test('OQ1: author2 sees only the own-submissions view or empty state', async ({ page, loginAs }) => {
    await loginAs('author2')
    await expectHealthyPage(page, '/author/submissions')
    await expect(page.getByRole('heading', { name: 'My Submissions' })).toBeVisible()
    await expect(
      page.getByText('No manuscripts submitted', { exact: true })
        .or(page.getByRole('link', { name: 'View Details' }).first())
    ).toBeVisible()
  })

  test('OQ2: author1 cannot access editor pages', async ({ page, loginAs }) => {
    await loginAs('author1')
    await expectDeniedOrRedirected(page, '/editor')
  })

  test('OQ3: author1 cannot access admin pages', async ({ page, loginAs }) => {
    await loginAs('author1')
    await expectDeniedOrRedirected(page, '/admin')
  })

  test('OQ4: EIC cannot access admin pages', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectDeniedOrRedirected(page, '/admin')
  })

  test('OQ5: logged-out journal archive exposes no workflow-state manuscripts', async ({ page }) => {
    await expectHealthyPage(page, '/journals')
    await expect(page.getByRole('heading', { name: /Browse Journals/i })).toBeVisible()
    await expect(page.locator('body')).not.toContainText(/desk[_ -]review|under[_ -]peer[_ -]review|changes[_ -]requested/i)
  })

  test('OQ6: author notification list loads', async ({ page, loginAs }) => {
    await loginAs('author1')
    await expectHealthyPage(page, '/notifications')
    await expect(page.getByText('Notifications', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Total', { exact: true })).toBeVisible()
    await expect(page.getByText('No notifications.', { exact: true }).or(page.locator('ul li').first())).toBeVisible()
  })

  test('OQ7: notification preference toggles load', async ({ page, loginAs }) => {
    await loginAs('author1')
    await expectHealthyPage(page, '/notifications/preferences')
    await expect(page.getByText('Notification Preferences', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('switch')).toHaveCount(6)
  })

  test('OQ8: logged-out author submission redirects to login', async ({ page }) => {
    await expectLoginRedirect(page, '/author/submit')
  })

  test('OQ9: logged-out reviewer page redirects to login', async ({ page }) => {
    await expectLoginRedirect(page, '/reviewer')
  })

  test('OQ10: logged-out editor page redirects to login', async ({ page }) => {
    await expectLoginRedirect(page, '/editor')
  })
})
