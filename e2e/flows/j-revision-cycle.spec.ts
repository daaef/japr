import { test, expect, navigateTo, expectPath, sharedState } from '../helpers'

const firstSubmissionLink = (page: Parameters<typeof navigateTo>[0]) =>
  page.getByRole('link', { name: /View Details/i }).first()

const changesRequestedCard = (page: Parameters<typeof navigateTo>[0]) =>
  page.locator('div.space-y-6 > div.space-y-6 > div').filter({ hasText: 'Action Required' }).first()

test.describe.serial('Flow J: Revision Cycle', () => {
  test('J1: author submissions list loads', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author/submissions')

    await expectPath(page, '/author/submissions')
    await expect(page.getByText('My Submissions', { exact: true })).toBeVisible()

    const emptyState = page.getByText('No manuscripts submitted', { exact: true })
    const firstDetailLink = firstSubmissionLink(page)
    await expect(emptyState.or(firstDetailLink)).toBeVisible()

    if (await firstDetailLink.isVisible().catch(() => false)) {
      const href = await firstDetailLink.getAttribute('href')
      if (href) sharedState.set('flowJManuscriptPath', href)
    }

    const revisionCard = changesRequestedCard(page)
    if (await revisionCard.isVisible().catch(() => false)) {
      const href = await revisionCard.getByRole('link', { name: /Upload Revision|View Details/i }).first().getAttribute('href')
      if (href) sharedState.set('flowJChangesRequestedPath', href)
    }
  })

  test('J2: manuscript detail shows title, status, dates, and available feedback', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author/submissions')

    const detailLink = firstSubmissionLink(page)
    test.skip(!(await detailLink.isVisible().catch(() => false)), 'Author 1 has no manuscripts to inspect')

    const listCard = detailLink.locator('xpath=ancestor::*[self::div][.//h3][1]')
    const title = (await listCard.locator('h3').first().textContent())?.trim()
    const hasChangesRequested = await listCard.getByText('Action Required', { exact: true }).isVisible().catch(() => false)
    await expect(listCard.getByText(/Submitted:/).first()).toBeVisible()
    await expect(listCard.getByText(/Updated:/).first()).toBeVisible()
    await detailLink.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/author\/submissions\/[^/]+$/)
    if (title) await expect(page.getByText(title, { exact: true }).first()).toBeVisible()
    await expect(page.locator('[class*="badge"]').first()).toBeVisible()
    await expect(page.getByText('Version history', { exact: true })).toBeVisible()
    await expect(page.getByText(/No versions recorded yet|Version \S+/).first()).toBeVisible()

    sharedState.set('flowJManuscriptPath', new URL(page.url()).pathname)

    if (hasChangesRequested) {
      await expect(page.getByText(/Requested changes|Reviewer feedback|Editorial note/i).first()).toBeVisible()
      await expect(page.getByText(/Suggested:|reviewer comments|Editorial note/i).first()).toBeVisible()
      sharedState.set('flowJChangesRequestedPath', new URL(page.url()).pathname)
    }
  })

  test('J3: changes-requested manuscript exposes revision controls', async ({ page, loginAs }) => {
    test.skip(!sharedState.has('flowJChangesRequestedPath'), 'No changes_requested manuscript exists for author1')

    await loginAs('author1')
    const path = sharedState.get('flowJChangesRequestedPath')
    await navigateTo(page, path)

    await expectPath(page, path)
    await expect(
      page.getByRole('heading', { name: /Submit a revision/i })
        .or(page.getByRole('button', { name: /Upload revision file|Submit revision/i }))
    ).toBeVisible()
  })

  test('J4: manuscript detail contains version history', async ({ page, loginAs }) => {
    test.skip(!sharedState.has('flowJManuscriptPath'), 'Author 1 has no manuscript detail available')

    await loginAs('author1')
    const path = sharedState.get('flowJManuscriptPath')
    await navigateTo(page, path)

    await expectPath(page, path)
    await expect(page.getByText('Version history', { exact: true })).toBeVisible()
    await expect(page.getByText(/No versions recorded yet|Version \S+/).first()).toBeVisible()
  })
})
