export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { statusMessage?: string, message?: string } } | null)?.data
  if (data?.statusMessage) {
    return data.statusMessage
  }
  if (data?.message) {
    return data.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
