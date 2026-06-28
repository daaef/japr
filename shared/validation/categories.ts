import { z } from 'zod'

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true)
})

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().optional()
})

export const subCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120)
})

export const subCategoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  categoryId: z.string().uuid().optional()
})

export const subSubCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120)
})

export const subSubCategoryUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  subCategoryId: z.string().uuid().optional()
})

export const commentCreateSchema = z.object({
  comment: z.string().trim().min(1).max(2000)
})
