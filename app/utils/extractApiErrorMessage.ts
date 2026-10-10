function titleCaseField(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase())
}

// h3's readValidatedBody wraps a thrown ZodError as `{ statusMessage: 'Validation Error',
// message: <the ZodError's own message> }` — statusMessage is always this same generic
// string, while `message` is a JSON-stringified array of the actual per-field issues. Parse
// it into readable "Field: reason" entries instead of showing the generic statusMessage or
// the raw JSON.
function parseZodIssueMessages(message: string): string[] | null {
  try {
    const issues = JSON.parse(message)
    if (!Array.isArray(issues) || !issues.length || !issues.every(issue => issue && typeof issue.message === 'string')) {
      return null
    }
    return issues.map((issue) => {
      const field = Array.isArray(issue.path) && issue.path.length ? titleCaseField(String(issue.path[0])) : null
      return field ? `${field}: ${issue.message}` : issue.message
    })
  } catch {
    return null
  }
}

/** One message per distinct problem — use this when the UI can list them (e.g. a banner). */
export function extractApiErrorMessages(error: unknown, fallback: string): string[] {
  const data = (error as { data?: { statusMessage?: string, message?: string } } | null)?.data

  if (data?.message) {
    return parseZodIssueMessages(data.message) ?? [data.message]
  }
  if (data?.statusMessage) {
    return [data.statusMessage]
  }
  if (error instanceof Error) {
    return [error.message]
  }
  return [fallback]
}

/** Single-string form for simpler callers — same source, just joined. */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  return extractApiErrorMessages(error, fallback).join(' ')
}
