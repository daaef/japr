import { defineConfig, devices } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const configDir = dirname(fileURLToPath(import.meta.url))

// Load test-specific env, falling back to the project root .env
config({ path: resolve(configDir, '.env.test') })
config({ path: resolve(configDir, '.env') })

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://japr.vercel.app'

export default defineConfig({
  testDir: './e2e/flows',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ['list']
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  outputDir: 'e2e-results'
})
