import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { convertDocxBufferToHtml } from '../server/services/docPreview'

const FIXTURE_PATH = fileURLToPath(new URL('./fixtures/sample.docx', import.meta.url))

test('convertDocxBufferToHtml converts a real .docx fixture to non-empty HTML', async (t) => {
  if (!existsSync(FIXTURE_PATH)) {
    t.skip(`Place a real .docx file at ${FIXTURE_PATH} to run this test.`)
    return
  }

  const buffer = readFileSync(FIXTURE_PATH)
  const html = await convertDocxBufferToHtml(buffer)

  assert.equal(typeof html, 'string')
  assert.ok(html.length > 0, 'conversion produced empty output')
  assert.match(html, /<p[ >]/i, 'expected at least one <p> tag in the converted HTML')
})

test('convertDocxBufferToHtml rejects a buffer that is not a valid docx', async () => {
  const bogus = Buffer.from('this is not a docx file')

  await assert.rejects(() => convertDocxBufferToHtml(bogus))
})
