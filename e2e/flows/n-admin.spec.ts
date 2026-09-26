import { test, expect, env, login, expectPath } from '../helpers'

async function openAdminPage(page: Parameters<typeof login>[0], path: string) {
  const response = await page.goto(path)
  await page.waitForLoadState('networkidle')
  expect(response, `No document response was received for ${path}`).not.toBeNull()
  expect(response!.status(), `${path} returned HTTP ${response!.status()}`).toBeLessThan(400)
  await expectPath(page, path)
  await expect(page.locator('body')).not.toContainText(/404|page not found|internal server error|application error/i)
  expect((await page.locator('body').innerText()).trim().length, `${path} rendered no meaningful content`).toBeGreaterThan(20)
}

async function loginAdmin(page: Parameters<typeof login>[0]) {
  await login(page, env.accounts.admin.email, env.accounts.admin.password, 'admin')
}

test.describe.serial('Flow N: Admin Panel', () => {
  test('N1: admin dashboard loads with statistics', async ({ page }) => {
    await loginAdmin(page)
    await openAdminPage(page, '/admin')
    await expect(page.getByRole('heading', { name: /Hello,/ })).toBeVisible()
    await expect(page.getByText('Total Journals', { exact: true })).toBeVisible()
    await expect(page.getByText('Total Users', { exact: true })).toBeVisible()
  })

  test('N2: user list loads', async ({ page }) => {
    await loginAdmin(page)
    await openAdminPage(page, '/admin/users')
    await expect(page.locator('body')).toContainText(/users/i)
  })

  test('N3: role list loads with core roles', async ({ page }) => {
    await loginAdmin(page)
    await openAdminPage(page, '/admin/roles')
    await expect(page.getByText('Roles', { exact: true })).toBeVisible()
    await expect(page.locator('body')).toContainText(/admin/i)
    await expect(page.locator('body')).toContainText(/editor.in.chief/i)
    await expect(page.locator('body')).toContainText(/managing.editor/i)
  })

  const listPages = [
    ['N4: permissions list loads', '/admin/permissions', /permissions/i],
    ['N5: categories list loads', '/admin/categories', /categories/i],
    ['N6: all manuscripts list loads', '/admin/journals', /journals|manuscripts/i],
    ['N7: audit log loads or shows its empty state', '/admin/audit', /audit/i],
    ['N8: audit statistics dashboard loads', '/admin/audit/dashboard', /audit/i]
  ] as const

  for (const [name, path, content] of listPages) {
    test(name, async ({ page }) => {
      await loginAdmin(page)
      await openAdminPage(page, path)
      await expect(page.locator('body')).toContainText(content)
    })
  }

  test('N9: admin settings form loads', async ({ page }) => {
    await loginAdmin(page)
    await openAdminPage(page, '/admin/settings')
    await expect(page.locator('form').first()).toBeVisible()
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('N10: admin notification preferences load', async ({ page }) => {
    await loginAdmin(page)
    await openAdminPage(page, '/admin/notifications/preferences')
    await expect(page.getByText('Notification Preferences', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Email notifications', { exact: true })).toBeVisible()
    await expect(page.getByRole('switch').first()).toBeVisible()
  })
})
