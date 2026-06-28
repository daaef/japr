import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/** Load `.env` for local dev; skip when vars are injected (e.g. Docker Compose). */
export function loadEnvFileIfPresent(path = '.env') {
  const envPath = resolve(process.cwd(), path)
  if (existsSync(envPath)) {
    process.loadEnvFile?.(envPath)
  }
}
