import { defineConfig } from 'drizzle-kit'
import { loadEnvFileIfPresent } from './server/utils/load-env'

loadEnvFileIfPresent()

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is required for drizzle-kit. Set it in .env or the environment (no implicit fallback).')
}

export default defineConfig({
  schema: './server/db/schema/index.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url }
})
