/**
 * Format a date as DD/MM/YYYY using UTC parts.
 *
 * This avoids hydration mismatches that occur when `toLocaleDateString()` is used,
 * because the server and browser can produce different locale-dependent strings.
 */
export function formatDate(input: string | Date | number | null | undefined): string {
  if (!input) {
    return ''
  }

  const d = new Date(input)
  if (Number.isNaN(d.getTime())) {
    return ''
  }

  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()

  return `${day}/${month}/${year}`
}
