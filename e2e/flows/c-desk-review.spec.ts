import { test, expect, navigateTo, expectPath, sharedState } from '../helpers'

const detailPathPattern = /\/editor\/journals\/([0-9a-f-]{36})(?:[/?#]|$)/i

async function openFirstManuscript(page: Parameters<typeof navigateTo>[0]) {
  await navigateTo(page, '/editor/submissions')
  const viewLink = page.getByRole('link', { name: 'View', exact: true }).first()

  if (!await viewLink.isVisible().catch(() => false)) return null

  await viewLink.click()
  await page.waitForURL(detailPathPattern)
  return page.url().match(detailPathPattern)?.[1] ?? null
}

test.describe.serial('Flow C: Editor Desk Review Phase', () => {
  test('C1: EIC dashboard loads with statistics', async ({ page, loginAs }) => {
    await loginAs('eic')
    await navigateTo(page, '/editor')

    await expectPath(page, '/editor')
    await expect(page.getByRole('heading', { name: /Hello,/ })).toBeVisible()
    await expect(page.getByText('Desk Review', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Under Review', { exact: true })).toBeVisible()
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
  })

  test('C2: submissions queue lists manuscripts or its empty state', async ({ page, loginAs }) => {
    await loginAs('eic')
    await navigateTo(page, '/editor/submissions')

    await expectPath(page, '/editor/submissions')
    await expect(page.getByRole('heading', { name: /Pending Approval \(\d+\)/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'View', exact: true }).first()
        .or(page.getByText('No pending manuscripts.', { exact: true }))
    ).toBeVisible()
  })

  test('C3: EIC sees desk-review actions but not reviewer assignment', async ({ page, loginAs }) => {
    await loginAs('eic')
    const journalId = await openFirstManuscript(page)
    test.skip(!journalId, 'No manuscript is available in the desk-review queue.')

    sharedState.set('deskReviewJournalId', journalId!)
    await expect(page.locator('h3').filter({ hasText: /\S/ })).toBeVisible()
    await expect(page.locator('p').filter({ hasText: /\S/ }).first()).toBeVisible()
    await expect(page.getByText('Author', { exact: true })).toBeVisible()
    await expect(page.getByText('Institution', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send to review', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Assign (selected )?reviewers/i })).toHaveCount(0)
  })

  test('C4: EIC sends a desk-review manuscript to review', async ({ page, loginAs }) => {
    test.slow()
    test.skip(!sharedState.has('deskReviewJournalId'), 'C3 did not find a desk-review manuscript.')

    const journalId = sharedState.get('deskReviewJournalId')
    await loginAs('eic')
    await navigateTo(page, `/editor/journals/${journalId}`)

    const sendButton = page.getByRole('button', { name: 'Send to review', exact: true })
    test.skip(!await sendButton.isVisible().catch(() => false), 'The selected manuscript is no longer in desk review.')

    await sendButton.click()
    await expect(page.getByText('Manuscript sent to peer review.', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
    sharedState.set('inProgressJournalId', journalId)
  })

  test('C5: ME sees reviewer assignment but not EIC desk actions', async ({ page, loginAs }) => {
    test.skip(!sharedState.has('inProgressJournalId'), 'C4 did not create an in-progress manuscript.')

    await loginAs('me')
    await navigateTo(page, `/editor/journals/${sharedState.get('inProgressJournalId')}`)

    await expect(page.getByRole('button', { name: 'Send to review', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Desk decline', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Assign (selected )?reviewers/i })).toBeVisible()
  })
})
