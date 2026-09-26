/**
 * Authentication helpers for E2E tests.
 * Logs in via the UI and caches browser storage state so subsequent tests
 * in the same flow don't repeat the login dance.
 */

import { type Page, expect } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync } from 'node:fs'

const helperDir = dirname(fileURLToPath(import.meta.url))
const AUTH_STATE_DIR = resolve(helperDir, '../../e2e-results/.auth')

function stateFile(label: string) {
  return resolve(AUTH_STATE_DIR, `${label}.json`)
}

/**
 * Log in through the UI login form. After success the session cookies are
 * stored so `reuseLogin` can restore them without hitting the login page.
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  label: string
): Promise<void> {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"], input[name="email"]').fill(email)
  await page.locator('input[type="password"], input[name="password"]').fill(password)
  await page.locator('button[type="submit"]').click()

  // Wait for navigation away from the login page
  await page.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 15_000 })

  // Save state for reuse
  mkdirSync(AUTH_STATE_DIR, { recursive: true })
  await page.context().storageState({ path: stateFile(label) })
}

/**
 * Check whether a saved auth state exists for the given label.
 */
export function hasSavedState(label: string): boolean {
  return existsSync(stateFile(label))
}

/**
 * Return the path to a saved storage state file, or undefined if none exists.
 * Pass this to `browser.newContext({ storageState })` to skip login.
 */
export function savedStatePath(label: string): string | undefined {
  const path = stateFile(label)
  return existsSync(path) ? path : undefined
}

/**
 * Ensure the page is logged in as the given account. Uses cached state when
 * available, falls back to a full UI login.
 */
export async function ensureLoggedIn(
  page: Page,
  email: string,
  password: string,
  label: string
): Promise<void> {
  // If we already have a saved state, check if the current page is still
  // authenticated (the session might have expired).
  if (hasSavedState(label)) {
    // Navigate to a lightweight endpoint to test the session
    const res = await page.request.get('/api/me')
    if (res.ok()) return
  }

  await login(page, email, password, label)
}

/**
 * Log out via the UI. Clears the saved state for the label.
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to a page that has a logout mechanism, or call the auth API
  await page.goto('/')
  // Try clicking a user menu / logout button if visible
  const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout"), button:has-text("Sign out")')
  if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
    await userMenu.click()
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")')
    if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn.click()
    }
  }
}
