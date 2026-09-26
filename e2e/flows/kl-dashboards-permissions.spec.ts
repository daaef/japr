import { test, expect, navigateTo, expectPath, sharedState } from '../helpers'

const reviewerPages = [
  ['/reviewer/pending', 'Pending Invitations'],
  ['/reviewer/in-progress', 'In Progress'],
  ['/reviewer/reviewed', 'Reviewed'],
  ['/reviewer/approved', 'Approved'],
  ['/reviewer/declined', 'Declined'],
  ['/reviewer/declined-invitations', 'Declined Invitations']
] as const

const editorPages = [
  ['/editor/submissions', 'Pending Approval'],
  ['/editor/in-progress', 'In Progress'],
  ['/editor/under-peer-review', 'Under Peer Review'],
  ['/editor/ready-for-notice', 'Ready for Notice'],
  ['/editor/reviews', 'Reviewed Manuscripts'],
  ['/editor/revision-requested', 'Revision Requested'],
  ['/editor/approved', 'Approved Manuscripts'],
  ['/editor/copy-desk', 'Copy Desk Queue'],
  ['/editor/published', 'Published Manuscripts'],
  ['/editor/declined', 'Declined']
] as const

async function isActionVisible(page: Parameters<typeof navigateTo>[0], name: RegExp) {
  return page.getByRole('button', { name }).or(page.getByRole('link', { name })).first()
    .isVisible().catch(() => false)
}

async function expectQueuePage(page: Parameters<typeof navigateTo>[0], path: string, title: string) {
  await navigateTo(page, path)
  await expectPath(page, path)
  await expect(page.getByText(new RegExp(`${title} \\(`)).first()).toBeVisible()
  await expect(page.locator('main').or(page.locator('[role="main"]')).first()).toBeVisible()
}

async function findEditorManuscript(page: Parameters<typeof navigateTo>[0]) {
  for (const path of ['/editor/submissions', '/editor/in-progress', '/editor/reviews']) {
    await navigateTo(page, path)
    const viewLink = page.getByRole('link', { name: /^View$/i }).first()
    if (await viewLink.isVisible().catch(() => false)) {
      await viewLink.click()
      await page.waitForLoadState('networkidle')
      return new URL(page.url()).pathname
    }
  }
  return null
}

test.describe.serial('Flow K-L: Reviewer/Editor Dashboards and Permission Button Visibility', () => {
  test('KL1: reviewer dashboard loads with stats', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer')

    await expectPath(page, '/reviewer')
    await expect(page.getByText(/Hello,/).first()).toBeVisible()
    await expect(page.getByText('Pending', { exact: true })).toBeVisible()
    await expect(page.getByText('Reviewed', { exact: true })).toBeVisible()
    await expect(page.getByText('In Progress', { exact: true })).toBeVisible()
  })

  test('KL2: all reviewer status pages load', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    for (const [path, title] of reviewerPages) await expectQueuePage(page, path, title)
  })

  test('KL3: reviewer settings form loads', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/settings')

    await expectPath(page, '/reviewer/settings')
    await expect(page.getByText('Account Information', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Full name', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible()
  })

  test('KL4: reviewer notification preference toggles load', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await navigateTo(page, '/reviewer/notifications/preferences')

    await expectPath(page, '/notifications/preferences')
    await expect(page.getByText('Notification Preferences', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Review assignments' })).toBeVisible()
    await expect(page.getByRole('switch', { name: 'Realtime updates' })).toBeVisible()
  })

  test('KL5: editor dashboard loads with stats', async ({ page, loginAs }) => {
    await loginAs('eic')
    await navigateTo(page, '/editor')

    await expectPath(page, '/editor')
    await expect(page.getByText(/Hello,/).first()).toBeVisible()
    await expect(page.getByText('Desk Review', { exact: true })).toBeVisible()
    await expect(page.getByText('Under Review', { exact: true })).toBeVisible()
    await expect(page.getByText('Approved', { exact: true })).toBeVisible()
  })

  test('KL6: all editor status pages load', async ({ page, loginAs }) => {
    await loginAs('eic')
    for (const [path, title] of editorPages) await expectQueuePage(page, path, title)
  })

  test('KL7: editor settings form loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await navigateTo(page, '/editor/settings')

    await expectPath(page, '/editor/settings')
    await expect(page.getByText('Account Information', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Full name', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save settings' })).toBeVisible()
  })

  test('KL8: editor notification preferences load', async ({ page, loginAs }) => {
    await loginAs('eic')
    await navigateTo(page, '/editor/notifications/preferences')

    await expectPath(page, '/notifications/preferences')
    await expect(page.getByText('Notification Preferences', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('switch', { name: 'New submissions (editors)' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible()
  })

  test('KL9: EIC sees only EIC manuscript actions', async ({ page, loginAs }) => {
    await loginAs('eic')
    const manuscriptPath = await findEditorManuscript(page)
    test.skip(!manuscriptPath, 'No manuscript exists in an actionable editor queue')

    sharedState.set('flowKLManuscriptPath', manuscriptPath!)
    await expect(page).toHaveURL(/\/editor\/journals\/[^/]+$/)
    await expect(page.getByText('Document preview', { exact: true })).toBeVisible()

    const eicActions = [
      /Send to review/i,
      /Decline/i,
      /Approve manuscript/i,
      /Request revisions/i
    ]
    const visibleEicActions = await Promise.all(eicActions.map(name => isActionVisible(page, name)))
    expect(visibleEicActions.some(Boolean), 'At least one status-appropriate EIC action should be visible').toBe(true)

    expect(await isActionVisible(page, /Assign.*reviewers/i)).toBe(false)
    expect(await isActionVisible(page, /Send approval notice/i)).toBe(false)
    expect(await isActionVisible(page, /Send decline notice/i)).toBe(false)
  })

  test('KL10: ME sees only managing-editor manuscript actions', async ({ page, loginAs }) => {
    test.skip(!sharedState.has('flowKLManuscriptPath'), 'KL9 found no manuscript to reuse')

    await loginAs('me')
    const manuscriptPath = sharedState.get('flowKLManuscriptPath')
    await navigateTo(page, manuscriptPath)

    await expectPath(page, manuscriptPath)
    await expect(page.getByText('Document preview', { exact: true })).toBeVisible()
    expect(await isActionVisible(page, /Assign.*reviewers/i)).toBe(true)

    const readyForNotice = await page.getByText('Managing editor notice', { exact: true }).isVisible().catch(() => false)
    if (readyForNotice) {
      expect(await isActionVisible(page, /Send approval notice/i)).toBe(true)
      expect(await isActionVisible(page, /Send decline notice/i)).toBe(true)
    }

    const reviewedActions = await page.getByLabel('Revision request', { exact: false }).isVisible().catch(() => false)
    if (reviewedActions) expect(await isActionVisible(page, /Request revisions/i)).toBe(true)

    expect(await isActionVisible(page, /Send to review/i)).toBe(false)
    expect(await isActionVisible(page, /^Approve manuscript$/i)).toBe(false)
    expect(await isActionVisible(page, /Approve for publication/i)).toBe(false)
  })
})
