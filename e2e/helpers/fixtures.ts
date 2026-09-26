/**
 * Shared Playwright fixtures that extend the base test with:
 * - Pre-authenticated page contexts for each role
 * - Mailtrap helpers
 * - Common navigation utilities
 */

import { test as base, type Page } from '@playwright/test'
import { env } from './env'
import { login, hasSavedState, savedStatePath } from './auth'

type Account = { email: string, password: string }

/** Create a page that is logged in as the given account. */
async function authenticatedPage(
  browser: ReturnType<typeof base['step']> extends never ? never : never,
  contextFactory: () => Promise<{ page: Page, context: any }>,
  account: Account,
  label: string
): Promise<Page> {
  // This is handled per-test via the login helper; the fixture just provides
  // a convenience wrapper.
  const { page } = await contextFactory()
  await login(page, account.email, account.password, label)
  return page
}

/**
 * Shared test state that persists across tests within a single spec file.
 * Used to pass manuscript IDs, reviewer IDs, etc. between sequential tests.
 */
export class SharedState {
  private data = new Map<string, string>()

  set(key: string, value: string) { this.data.set(key, value) }
  get(key: string): string {
    const value = this.data.get(key)
    if (!value) throw new Error(`SharedState: key "${key}" not set. Was a prerequisite test skipped?`)
    return value
  }
  has(key: string): boolean { return this.data.has(key) }
}

/** Global shared state — persists across all test files in the same worker. */
export const sharedState = new SharedState()

/**
 * Extended test fixture with role-based login helpers.
 */
export const test = base.extend<{
  loginAs: (role: keyof typeof env.accounts) => Promise<void>
}>({
  loginAs: async ({ page }, use) => {
    const fn = async (role: keyof typeof env.accounts) => {
      const account = env.accounts[role]
      await login(page, account.email, account.password, role)
    }
    await use(fn)
  }
})

export { expect } from '@playwright/test'
