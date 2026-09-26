import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import {
  test,
  expect,
  env,
  loginAs,
  navigateTo,
  expectPath,
  expectVisible,
  fillByLabel,
  clickButton,
  selectOption,
  uniqueId,
  sharedState
} from '../helpers'

function createMinimalPdf(): string {
  const dir = mkdtempSync(join(tmpdir(), 'japr-e2e-'))
  const path = join(dir, `manuscript-${Date.now()}.pdf`)
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [] /Count 0 >>
endobj
xref
0 3
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
trailer
<< /Size 3 /Root 1 0 R >>
startxref
95
%%EOF`
  writeFileSync(path, pdf)
  return path
}

async function pickDropdownOption(page: Page, triggerLabel: string, optionText: string) {
  // Prefer the shared helper, but fall back to a trigger/option text strategy
  // in case a particular Nuxt UI select variant changes its ARIA mapping.
  try {
    await selectOption(page, triggerLabel, optionText)
  } catch {
    const trigger = page.getByLabel(triggerLabel, { exact: false })
      .or(page.locator(`[placeholder*="${triggerLabel}" i]`))
      .first()
    await trigger.click()
    await page.getByText(optionText, { exact: false }).first().click()
  }
}

test.describe.serial('Flow B: Author Onboarding and Manuscript Submission', () => {
  const manuscriptTitle = `E2E Manuscript ${uniqueId('title')}`

  test('B1: Login as author1', async ({ page, loginAs }) => {
    await loginAs('author1')
    await expect(page).toHaveURL(/\/author(\/interests)?$/, { timeout: 15_000 })
  })

  test('B2: Author interests page loads at /author/interests', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author/interests')
    await expectPath(page, '/author/interests')
    await expectVisible(page, 'Research Interests')
  })

  test('B3: Review policy acceptance gate redirects /author/submissions when not accepted', async ({ page, loginAs }) => {
    await loginAs('author1')

    const me = await page.request.get('/api/me')
    const user = (await me.json()) as { user?: { reviewPolicyAccepted?: boolean } }

    if (user.user?.reviewPolicyAccepted) {
      test.skip('author1 has already accepted the review policy')
      return
    }

    await navigateTo(page, '/author/submissions')
    await expectPath(page, '/review-policy')
    await expectVisible(page, 'JAPR Review Policy')
  })

  test('B4: Submit a manuscript', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author/submit')
    await expectVisible(page, 'Submit a Manuscript')

    // Use real API data so the test does not break when categories/countries change.
    const [categoriesRes, countriesRes] = await Promise.all([
      page.request.get('/api/categories'),
      page.request.get('/api/countries')
    ])
    const categoriesData = await categoriesRes.json() as {
      categories: Array<{
        categoryName?: string
        name: string
        subCategories?: Array<{
          name: string
          subSubCategories?: Array<{ name: string }>
        }>
      }>
    }
    const countriesData = await countriesRes.json() as {
      regions?: Array<{ countries: Array<{ name: string }> }>
    }

    const category = categoriesData.categories[0]
    const categoryLabel = category?.categoryName || category?.name
    const countryName = countriesData.regions?.[0]?.countries?.[0]?.name ?? 'Nigeria'

    if (!categoryLabel) {
      throw new Error('No manuscript categories available; cannot complete submission test.')
    }

    await fillByLabel(page, 'Manuscript title', manuscriptTitle)
    await fillByLabel(page, 'Authors (separate with commas)', 'E2E Author')
    await fillByLabel(
      page,
      'Abstract',
      'This is an end-to-end test abstract that is definitely longer than fifty characters so the validation passes cleanly.'
    )
    await fillByLabel(page, 'Institution/Affiliation', 'JAPR E2E University')
    await fillByLabel(page, 'Keywords (3-6 keywords, comma separated)', 'e2e, testing, playwright')

    await pickDropdownOption(page, 'Country', countryName)
    await pickDropdownOption(page, 'Language', 'American English')
    await pickDropdownOption(page, 'Category', categoryLabel)

    // Some categories require a sub-category (or sub-sub-category). Fill them in
    // when the form exposes the extra dropdowns.
    const subCategory = category.subCategories?.[0]
    if (subCategory) {
      await pickDropdownOption(page, 'Sub-Category', subCategory.name)
      const subSubCategory = subCategory.subSubCategories?.[0]
      if (subSubCategory) {
        await pickDropdownOption(page, 'Sub-Subcategory', subSubCategory.name)
      }
    }

    // Upload a minimal real PDF so the manuscript can be created.
    const pdfPath = createMinimalPdf()
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles(pdfPath)
    await expect(page.locator('text=/Selected:/').first()).toBeVisible({ timeout: 10_000 })

    await page
      .getByLabel("I agree that I haven't published this article anywhere else", { exact: false })
      .check()

    // If the account has not accepted the review policy yet, accept it in the modal.
    const policyButton = page.locator('button:has-text("JAPR Review Policy")').first()
    if (await policyButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await policyButton.click()
      await clickButton(page, 'Accept')
    }

    await clickButton(page, 'Submit')

    await expect(page).toHaveURL(/\/author\/submissions\/.+/, { timeout: 30_000 })
    await expectVisible(page, manuscriptTitle)

    sharedState.set('manuscriptTitle', manuscriptTitle)
  })

  test('B5: Submission appears in /author/submissions with status "Desk Review"', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author/submissions')
    await expectVisible(page, manuscriptTitle)
    await expectVisible(page, 'Desk Review')
  })

  test('B6: Submission edge cases — empty required fields show validation errors', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author/submit')

    const titleInput = page
      .locator('input[placeholder*="manuscript title" i], input[name="title"]')
      .first()
    await expect(titleInput).toBeVisible({ timeout: 10_000 })
    await titleInput.fill('')
    await titleInput.press('Enter')

    await expect(
      page.locator('text=/Required|must contain|Please select|is required|Invalid/').first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('B7: Author dashboard at /author shows stats', async ({ page, loginAs }) => {
    await loginAs('author1')
    await navigateTo(page, '/author')

    await expectVisible(page, 'Hello,')
    await expect(page.locator('text=/\\d+ submission(s)?/')).toBeVisible({ timeout: 10_000 })
  })
})
