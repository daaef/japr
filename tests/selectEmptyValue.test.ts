import assert from 'node:assert/strict'
import test from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Nuxt UI's USelect is built on Reka UI, whose SelectItem throws when an item's value is
// an empty string ('' is reserved for "nothing selected / show the placeholder"). During
// SSR that throw becomes a 500 for the whole page — this took down /admin/audit.
// Use a sentinel ('all', 'custom') or the placeholder prop instead.

const APP_DIR = fileURLToPath(new URL('../app', import.meta.url))
const EMPTY_VALUE = /value:\s*(''|"")/

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return vueFiles(path)
    return name.endsWith('.vue') || name.endsWith('.ts') ? [path] : []
  })
}

test('no select item list uses an empty-string value', () => {
  const offenders = vueFiles(APP_DIR).flatMap(file =>
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line, i) => ({ line: line.trim(), at: `${file.replace(APP_DIR, 'app')}:${i + 1}` }))
      .filter(({ line }) => EMPTY_VALUE.test(line))
      .map(({ line, at }) => `${at}  ${line}`)
  )
  assert.deepEqual(offenders, [], `Empty-string select values found:\n${offenders.join('\n')}`)
})
