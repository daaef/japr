import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { loadEnvFileIfPresent } from '../utils/load-env'
import * as schema from './schema'

loadEnvFileIfPresent()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required. Set it in .env or the environment (no implicit fallback).')
}

export const pool = new Pool({
  connectionString
})

export const db = drizzle(pool, { schema })
