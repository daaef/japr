import { z } from 'zod'

export const versionCompareSchema = z.object({
  leftVersionId: z.string().uuid(),
  rightVersionId: z.string().uuid()
})

export const versionRevertSchema = z.object({
  versionId: z.string().uuid()
})
