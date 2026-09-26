import { test, expect, navigateTo, expectPath, uniqueId } from '../helpers'

let publishedJournalPath: string | undefined

async function expectHealthyPage(page: Parameters<typeof navigateTo>[0], path: string) {
  const response = await page.goto(path)
  await page.waitForLoadState('networkidle')
  expect(response, `No document response was received for ${path}`).not.toBeNull()
  expect(response!.status(), `${path} returned HTTP ${response!.status()}`).toBeLessThan(400)
  await expect(page.locator('body')).not.toContainText(/404|page not found|internal server error|application error/i)
  const text = (await page.locator('body').innerText()).trim()
  expect(text.length, `${path} rendered an empty or near-empty page`).toBeGreaterThan(20)
}

async function discoverPublishedJournal(page: Parameters<typeof navigateTo>[0]) {
  await expectHealthyPage(page, '/journals')
  const link = page.locator('a[href^="/journals/"]').filter({ hasNotText: /version/i }).first()
  if (!await link.isVisible().catch(() => false)) return undefined
  const href = await link.getAttribute('href')
  if (href && /^\/journals\/[^/]+$/.test(href)) publishedJournalPath = href
  return publishedJournalPath
}

test.describe.serial('Flow M: Public Features', () => {
  test('M1: public journal listing loads', async ({ page }) => {
    await expectHealthyPage(page, '/journals')
    await expect(page.getByRole('heading', { name: /Browse Journals/i })).toBeVisible()
    await expect(page.getByPlaceholder('Search title or keyword')).toBeVisible()
    await expect(page.getByText('Filter Results', { exact: true })).toBeVisible()
  })

  test('M2: journal search accepts a query', async ({ page }) => {
    await expectHealthyPage(page, '/journals')
    const search = page.getByPlaceholder('Search title or keyword')
    await search.fill('a')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.waitForLoadState('networkidle')
    await expect(search).toHaveValue('a')
    await expect(page).toHaveURL(/\/journals\?.*search=a/)
  })

  test('M3: category filter exists', async ({ page }) => {
    await expectHealthyPage(page, '/journals')
    await expect(page.getByText('Filter Results', { exact: true })).toBeVisible()
    await expect(page.locator('#filter')).toContainText(/categor/i)
  })

  test('M4: published journal detail shows title, abstract, and author', async ({ page }) => {
    const path = await discoverPublishedJournal(page)
    test.skip(!path, 'No published journal is currently listed.')
    await expectHealthyPage(page, path!)
    await expectPath(page, path!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Abstract', exact: true })).toBeVisible()
    await expect(page.getByText('Author', { exact: true })).toBeVisible()
  })

  test('M5: published journal version history loads', async ({ page }) => {
    const path = publishedJournalPath ?? await discoverPublishedJournal(page)
    test.skip(!path, 'No published journal is currently listed.')
    await expectHealthyPage(page, `${path}/versions`)
    await expect(page.getByText('Version History', { exact: true })).toBeVisible()
  })

  test('M6: contact form loads', async ({ page }) => {
    await expectHealthyPage(page, '/contact')
    await expect(page.getByRole('heading', { name: 'Contact us' })).toBeVisible()
    await expect(page.getByLabel('First name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Message')).toBeVisible()
  })

  test('M7: authenticated author sees journal reactions', async ({ page, loginAs }) => {
    await loginAs('author1')
    const path = publishedJournalPath ?? await discoverPublishedJournal(page)
    test.skip(!path, 'No published journal is currently listed.')
    await expectHealthyPage(page, path!)
    await expect(page.getByRole('button', { name: 'Like', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Dislike', exact: true })).toBeVisible()
  })

  test('M8: authenticated author posts a comment', async ({ page, loginAs }) => {
    await loginAs('author1')
    const path = publishedJournalPath ?? await discoverPublishedJournal(page)
    test.skip(!path, 'No published journal is currently listed.')
    await expectHealthyPage(page, path!)
    const comment = uniqueId('e2e-comment')
    const input = page.getByPlaceholder('Add a comment')
    test.skip(!await input.isVisible().catch(() => false), 'Comment form is not available for this journal.')
    await input.fill(comment)
    await page.getByRole('button', { name: 'Post comment', exact: true }).click()
    await expect(page.getByText(comment, { exact: true })).toBeVisible({ timeout: 10_000 })
  })
})
