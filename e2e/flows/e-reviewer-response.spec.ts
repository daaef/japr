import { test, expect, env, navigateTo, expectPath } from '../helpers'

async function expectQueueState(page: Parameters<typeof navigateTo>[0], emptyMessage: string) {
  await expect(
    page.getByRole('link', { name: 'Review', exact: true }).first()
      .or(page.getByText(emptyMessage, { exact: true }))
  ).toBeVisible()
}

test.describe.serial('Flow E: Reviewer Invitation Response', () => {
  test('E1: reviewer A dashboard loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer')

    await expectPath(page, '/reviewer')
    await expect(page.getByRole('heading', { name: /Hello,/ })).toBeVisible()
    await expect(page.getByText('Manage your review assignments and keep deadlines on track.')).toBeVisible()
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
  })

  test('E2: reviewer A pending invitations page loads with list or empty state', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/pending')

    await expectPath(page, '/reviewer/pending')
    await expect(page.getByRole('heading', { name: /Pending Invitations \(\d+\)/ })).toBeVisible()
    await expectQueueState(page, 'No pending invitations.')
  })

  test('E3: reviewer A in-progress page loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/in-progress')

    await expectPath(page, '/reviewer/in-progress')
    await expect(page.getByRole('heading', { name: /In Progress \(\d+\)/ })).toBeVisible()
    await expectQueueState(page, 'No active reviews.')
  })

  test('E4: invalid invitation token displays an error', async ({ page, loginAs }) => {
    test.slow()
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/invitations/respond?action=accept&token=test')

    await expectPath(page, '/reviewer/invitations/respond')
    await expect(page.getByRole('heading', { name: 'Accept this review invitation?' })).toBeVisible()
    await page.getByRole('button', { name: 'Accept invitation', exact: true }).click()
    await expect(page.locator('p.text-error')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/reviewer\/invitations\/respond/)
  })

  test('E5: reviewer B dashboard loads', async ({ page, loginAs }) => {
    expect(env.accounts.reviewerB.email).toBeTruthy()
    await loginAs('reviewerB')
    await navigateTo(page, '/reviewer')

    await expectPath(page, '/reviewer')
    await expect(page.getByRole('heading', { name: /Hello,/ })).toBeVisible()
    await expect(page.getByText('Quick Actions', { exact: true })).toBeVisible()
  })

  test('E6: reviewer B declined invitations page loads', async ({ page, loginAs }) => {
    await loginAs('reviewerB')
    await navigateTo(page, '/reviewer/declined-invitations')

    await expectPath(page, '/reviewer/declined-invitations')
    await expect(page.getByRole('heading', { name: /Declined Invitations \(\d+\)/ })).toBeVisible()
    await expectQueueState(page, 'You have not declined any review invitations.')
  })
})
