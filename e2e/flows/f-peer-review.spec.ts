import { test, expect, navigateTo, expectPath } from '../helpers'

const reviewPathPattern = /\/reviewer\/journals\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/review(?:[/?#]|$)/i

test.describe.serial('Flow F: Peer Review Process', () => {
  test('F1: reviewer dashboard loads with statistics', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer')

    await expectPath(page, '/reviewer')
    await expect(page.getByRole('heading', { name: /Hello,/ })).toBeVisible()
    await expect(page.getByText('Pending', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Reviewed', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Avg. review time', { exact: true })).toBeVisible()
    await expect(page.getByText('Completion rate', { exact: true })).toBeVisible()
  })

  test('F2: in-progress reviews page loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/in-progress')

    await expectPath(page, '/reviewer/in-progress')
    await expect(page.getByRole('heading', { name: /In Progress \(\d+\)/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Review', exact: true }).first()
        .or(page.getByText('No active reviews.', { exact: true }))
    ).toBeVisible()
  })

  test('F3: an in-progress manuscript opens its review form', async ({ page, loginAs }) => {
    test.slow()
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/in-progress')

    const reviewLink = page.getByRole('link', { name: 'Review', exact: true }).first()
    test.skip(!await reviewLink.isVisible().catch(() => false), 'No in-progress manuscript is available for reviewerA.')

    await reviewLink.click()
    await page.waitForURL(reviewPathPattern)
    const match = page.url().match(reviewPathPattern)
    expect(match?.[1], 'The review URL should contain a manuscript UUID.').toBeTruthy()

    await expect(page.locator('h2').filter({ hasText: /\S/ }).first()).toBeVisible()
    await expect(page.locator('h2').first().locator('..').getByText(/\S/).last()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Submit review', exact: true })).toBeVisible()
    await expect(page.getByLabel('Full review', { exact: false })).toBeVisible()
    await expect(page.getByLabel('Comments to author', { exact: false })).toBeVisible()
    await expect(page.getByText('Overall rating', { exact: true })).toBeVisible()
    await expect(page.getByText('Originality', { exact: true })).toBeVisible()
    await expect(page.getByText('Methodology', { exact: true })).toBeVisible()
    await expect(page.getByText('Recommendation', { exact: true })).toBeVisible()
  })

  test('F4: reviewed page loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/reviewed')

    await expectPath(page, '/reviewer/reviewed')
    await expect(page.getByRole('heading', { name: /Reviewed \(\d+\)/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Review', exact: true }).first()
        .or(page.getByText('No completed reviews.', { exact: true }))
    ).toBeVisible()
  })

  test('F5: approved page loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/approved')

    await expectPath(page, '/reviewer/approved')
    await expect(page.getByRole('heading', { name: /Approved \(\d+\)/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Review', exact: true }).first()
        .or(page.getByText('No approved assignments.', { exact: true }))
    ).toBeVisible()
  })

  test('F6: declined page loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/declined')

    await expectPath(page, '/reviewer/declined')
    await expect(page.getByRole('heading', { name: /Declined \(\d+\)/ })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Review', exact: true }).first()
        .or(page.getByText('No declined assignments.', { exact: true }))
    ).toBeVisible()
  })
})
