import { z } from 'zod'

export const editorialBoardMemberCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(120),
  section: z.string().trim().min(2).max(120),
  email: z.email().optional().nullable(),
  institution: z.string().trim().max(255).optional().nullable(),
  region: z.string().trim().max(160).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true)
})

export const editorialBoardMemberUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  role: z.string().trim().min(2).max(120).optional(),
  section: z.string().trim().min(2).max(120).optional(),
  email: z.email().optional().nullable(),
  institution: z.string().trim().max(255).optional().nullable(),
  region: z.string().trim().max(160).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional()
})
