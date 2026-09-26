import { test, expect, navigateTo, expectPath } from '../helpers'

const editorDetailPathPattern = /\/editor\/journals\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)/i

type Page = Parameters<typeof navigateTo>[0]

async function expectEditorQueue(page: Page, path: string, title: RegExp, emptyMessage: string) {
  await navigateTo(page, path)
  await expectPath(page, path)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'View', exact: true }).first()
      .or(page.getByText(emptyMessage, { exact: true }))
  ).toBeVisible()
}

async function openFirstEditorManuscript(page: Page) {
  const viewLink = page.getByRole('link', { name: 'View', exact: true }).first()
  if (!await viewLink.isVisible().catch(() => false)) return null

  await viewLink.click()
  await page.waitForURL(editorDetailPathPattern)
  return page.url().match(editorDetailPathPattern)?.[1] ?? null
}

test.describe.serial('Flow G-I: Editor Decisions (Approve, Decline, Revisions)', () => {
  test('G1: EIC approved manuscripts page loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/approved', /Approved Manuscripts \(\d+\)/, 'No approved manuscripts.')
  })

  test('G2: EIC declined manuscripts page loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/declined', /Declined \(\d+\)/, 'No declined manuscripts.')
  })

  test('G3: EIC ready-for-notice page loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/ready-for-notice', /Ready for Notice \(\d+\)/, 'No manuscripts ready for notice.')
  })

  test('G4: EIC published manuscripts page loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/published', /Published Manuscripts \(\d+\)/, 'No manuscripts have been published yet.')
  })

  test('G5: ME sees notice action but not direct approval', async ({ page, loginAs }) => {
    test.slow()
    await loginAs('me')
    await expectEditorQueue(page, '/editor/ready-for-notice', /Ready for Notice \(\d+\)/, 'No manuscripts ready for notice.')

    const manuscriptId = await openFirstEditorManuscript(page)
    test.skip(!manuscriptId, 'No manuscript is ready for notice, so detail permissions cannot be checked.')

    expect(manuscriptId, 'The editor detail URL should contain a manuscript UUID.').toMatch(/^[0-9a-f-]{36}$/i)
    await expect(page.getByRole('button', { name: /Send approval notice/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Approve(?: manuscript)?$/i })).toHaveCount(0)
  })

  test('G6: EIC sees direct approval but not notice action', async ({ page, loginAs }) => {
    test.slow()
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/ready-for-notice', /Ready for Notice \(\d+\)/, 'No manuscripts ready for notice.')

    const manuscriptId = await openFirstEditorManuscript(page)
    test.skip(!manuscriptId, 'No manuscript is ready for notice, so detail permissions cannot be checked.')

    expect(manuscriptId, 'The editor detail URL should contain a manuscript UUID.').toMatch(/^[0-9a-f-]{36}$/i)
    await expect(page.getByRole('button', { name: /^Approve(?: manuscript)?$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Send approval notice/i })).toHaveCount(0)
  })

  test('G7: revision-requested page loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/revision-requested', /Revision Requested \(\d+\)/, 'No manuscripts awaiting revision.')
  })

  test('G8: EIC copy-desk page loads', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectEditorQueue(page, '/editor/copy-desk', /Copy Desk Queue \(\d+\)/, 'No manuscripts are currently in the copy desk queue.')
  })

  test('G9: copy desk can mark ready manuscripts published', async ({ page, loginAs }) => {
    await loginAs('copyDesk')
    await expectEditorQueue(page, '/editor/copy-desk', /Copy Desk Queue \(\d+\)/, 'No manuscripts are currently in the copy desk queue.')

    const viewLink = page.getByRole('link', { name: 'View', exact: true }).first()
    test.skip(!await viewLink.isVisible().catch(() => false), 'No ready-for-publication manuscript is in the copy desk queue.')

    await expect(page.getByRole('button', { name: 'Mark Published', exact: true }).first()).toBeVisible()
  })
})
