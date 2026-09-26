import { test, expect, navigateTo, expectPath } from '../helpers'

async function expectHealthyPage(page: Parameters<typeof navigateTo>[0], path: string) {
  const response = await page.goto(path)
  await page.waitForLoadState('networkidle')
  expect(response, `No document response was received for ${path}`).not.toBeNull()
  expect(response!.status(), `${path} returned HTTP ${response!.status()}`).toBeLessThan(400)
  await expectPath(page, path)
  await expect(page.locator('body')).not.toContainText(/404|page not found|internal server error|application error/i)
  const text = (await page.locator('body').innerText()).trim()
  expect(text.length, `${path} rendered an empty or near-empty page`).toBeGreaterThan(20)
  await expect(page.locator('h1, h2, h3, h4, form, main').first()).toBeVisible()
}

async function expectSettingsForm(page: Parameters<typeof navigateTo>[0], path: string) {
  await expectHealthyPage(page, path)
  const form = page.locator('form').first()
  await expect(form).toBeVisible()
  const fields = form.locator('input')
  expect(await fields.count(), `${path} has no settings fields`).toBeGreaterThan(0)
  await expect(fields.first()).toBeVisible()
  const populatedValues = await fields.evaluateAll(inputs =>
    inputs.map(input => (input as HTMLInputElement).value).filter(value => value.trim().length > 0)
  )
  expect(populatedValues.length, `${path} did not populate any settings field`).toBeGreaterThan(0)
}

test.describe.serial('Flow R-S: Static Pages and Settings', () => {
  const staticPages = [
    ['RS1: home page loads', '/', /JAPR|journal|peer review/i],
    ['RS2: journals page loads', '/journals', /Browse Journals/i],
    ['RS3: review policy page loads', '/review-policy', /review policy|peer review/i],
    ['RS4: privacy page loads', '/privacy', /privacy/i],
    ['RS5: terms page loads', '/terms', /terms/i],
    ['RS6: contact page loads', '/contact', /contact/i],
    ['RS7: editorial page loads', '/editorial', /editorial/i]
  ] as const

  for (const [name, path, content] of staticPages) {
    test(name, async ({ page }) => {
      await expectHealthyPage(page, path)
      await expect(page.locator('body')).toContainText(content)
    })
  }

  test('RS8: author settings load with populated fields', async ({ page, loginAs }) => {
    await loginAs('author1')
    await expectSettingsForm(page, '/author/settings')
  })

  test('RS9: EIC settings load', async ({ page, loginAs }) => {
    await loginAs('eic')
    await expectSettingsForm(page, '/editor/settings')
  })

  test('RS10: reviewer settings load', async ({ page, loginAs }) => {
    await loginAs('reviewerA')
    await expectSettingsForm(page, '/reviewer/settings')
  })

  test('RS11: admin settings load', async ({ page, loginAs }) => {
    await loginAs('admin')
    await expectSettingsForm(page, '/admin/settings')
  })
})
