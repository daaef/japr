/**
 * Page navigation and common interaction helpers.
 * Keeps test files focused on assertions rather than DOM wrangling.
 */

import { type Page, expect } from '@playwright/test'

/** Navigate and wait for the Nuxt app to be hydrated / network idle. */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

/** Assert the current URL path matches (or starts with) the expected value. */
export async function expectPath(page: Page, expected: string) {
  await expect(page).toHaveURL(url => url.pathname.startsWith(expected))
}

/** Assert the page contains visible text. */
export async function expectVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
}

/** Assert the page does NOT contain the given text (visible). */
export async function expectNotVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).not.toBeVisible({ timeout: 5_000 })
}

/** Fill a form field by label text. */
export async function fillByLabel(page: Page, label: string, value: string) {
  await page.getByLabel(label, { exact: true }).fill(value)
}

/** Click a button by its text content. */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text }).click()
}

/** Wait for a toast / notification message to appear. */
export async function expectToast(page: Page, text: string) {
  await expect(
    page.locator('[role="alert"], [data-sonner-toast], .toast, [class*="notification"]')
      .filter({ hasText: text })
      .first()
  ).toBeVisible({ timeout: 10_000 })
}

/** Select an option from a Nuxt UI select / dropdown by visible text. */
export async function selectOption(page: Page, triggerLabel: string, optionText: string) {
  const placeholder = triggerLabel.toLowerCase() === 'country'
    ? /Select (your )?country/i
    : new RegExp(`Select ${triggerLabel}`, 'i')
  const trigger = page.getByLabel(triggerLabel, { exact: false })
    .or(page.locator(`[placeholder*="${triggerLabel}" i]`))
    .or(page.getByRole('button').filter({ hasText: placeholder }))
    .first()
  await trigger.click()
  await page.getByRole('option', { name: optionText }).or(
    page.locator(`[role="listbox"] >> text="${optionText}"`)
  ).first().click()
}

/** Generate a unique string for test data to avoid collisions. */
export function uniqueId(prefix = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
