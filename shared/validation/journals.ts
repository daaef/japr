import { z } from 'zod'

function queryStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }
  return undefined
}

export const journalCreateSchema = z.object({
  title: z.string().trim().min(5).max(255),
  author: z.string().trim().min(3).max(255),
  description: z.string().trim().min(20).max(4000),
  abstract: z.string().trim().min(50).max(12000),
  country: z.string().trim().min(2).max(120),
  institution: z.string().trim().max(255).optional().nullable(),
  journalLanguage: z.enum(['American English', 'British English', 'French']),
  categoryId: z.string().uuid().optional().nullable(),
  subCategoryId: z.string().uuid().optional().nullable(),
  subSubCategoryId: z.string().uuid().optional().nullable(),
  metaTitle: z.string().trim().max(255).optional().nullable(),
  metaKeywords: z.string().trim().max(255).optional().nullable(),
  metaDescription: z.string().trim().max(255).optional().nullable(),
  journalUrl: z.string().trim().max(2000).optional().nullable(),
  journalFormat: z.string().trim().max(24).optional().nullable(),
  license: z.string().trim().max(120).optional().nullable(),
  agree: z.boolean().default(true),
  accept: z.boolean().default(true)
})

export const journalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  searchType: z.enum(['title', 'keyword']).optional(),
  category: z.preprocess(queryStringArray, z.array(z.string().uuid()).optional()),
  categoryId: z.string().uuid().optional(),
  subcategory: z.preprocess(queryStringArray, z.array(z.string().uuid()).optional()),
  subsubcategory: z.preprocess(queryStringArray, z.array(z.string().uuid()).optional()),
  country: z.preprocess(queryStringArray, z.array(z.string().trim()).optional()),
  journalLanguage: z.preprocess(queryStringArray, z.array(z.string().trim()).optional()),
  license: z.preprocess(queryStringArray, z.array(z.string().trim()).optional()),
  approvalStatus: z.string().trim().optional()
})
