import { test, expect, navigateTo, expectPath, sharedState } from '../helpers'

const detailPathPattern = /\/editor\/journals\/([0-9a-f-]{36})(?:[/?#]|$)/i

async function resolveInProgressJournal(page: Parameters<typeof navigateTo>[0]) {
  if (sharedState.has('inProgressJournalId')) return sharedState.get('inProgressJournalId')

  await navigateTo(page, '/editor/in-progress')
  const viewLink = page.getByRole('link', { name: 'View', exact: true }).first()
  if (!await viewLink.isVisible().catch(() => false)) return null

  await viewLink.click()
  await page.waitForURL(detailPathPattern)
  const journalId = page.url().match(detailPathPattern)?.[1] ?? null
  if (journalId) sharedState.set('inProgressJournalId', journalId)
  return journalId
}

test.describe.serial('Flow D: Reviewer Assignment', () => {
  test('D1: ME opens an in-progress manuscript', async ({ page, loginAs }) => {
    await loginAs('me')
    const journalId = await resolveInProgressJournal(page)
    test.skip(!journalId, 'No in-progress manuscript is available for reviewer assignment.')

    if (page.url().includes('/editor/in-progress')) {
      await navigateTo(page, `/editor/journals/${journalId}`)
    }
    await expectPath(page, `/editor/journals/${journalId}`)
    await expect(page.getByText('Reviewer suggestions', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Assign (selected )?reviewers/i })).toBeVisible()
  })

  test('D2: ME selects and assigns a suggested reviewer', async ({ page, loginAs }) => {
    test.slow()
    test.skip(!sharedState.has('inProgressJournalId'), 'D1 did not find an in-progress manuscript.')

    await loginAs('me')
    await navigateTo(page, `/editor/journals/${sharedState.get('inProgressJournalId')}`)

    const suggestionSection = page.getByText('Reviewer suggestions', { exact: true }).locator('..').locator('..')
    const reviewerCheckbox = suggestionSection.getByRole('checkbox').first()
    test.skip(!await reviewerCheckbox.isVisible().catch(() => false), 'No reviewer suggestions are available for this manuscript.')

    await reviewerCheckbox.check()
    await page.getByRole('button', { name: /Assign (selected )?reviewers/i }).click()
    await expect(page.getByText('Reviewer assignments updated.', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Current reviewer records', { exact: true })).toBeVisible()
  })

  test('D3: EIC cannot assign reviewers', async ({ page, loginAs }) => {
    test.skip(!sharedState.has('inProgressJournalId'), 'D1 did not find an in-progress manuscript.')

    await loginAs('eic')
    await navigateTo(page, `/editor/journals/${sharedState.get('inProgressJournalId')}`)

    await expect(page.getByRole('button', { name: /Assign (selected )?reviewers/i })).toHaveCount(0)
    await expect(page.getByText('Reviewer suggestions', { exact: true })).toHaveCount(0)
  })
})
