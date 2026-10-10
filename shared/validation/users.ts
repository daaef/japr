import { z } from 'zod'

export function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

export const userCreateSchema = z.object({
  fullname: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60),
  email: z.email(),
  country: z.string().trim().optional().nullable(),
  institution: z.string().trim().optional().nullable(),
  password: z.string().min(8).max(128),
  roleIds: z.array(z.string().uuid()).default([])
})

export const userUpdateSchema = z.object({
  fullname: z.string().trim()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(120, { message: 'Full name must be 120 characters or fewer' })
    .optional(),
  username: z.string().trim()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(60, { message: 'Username must be 60 characters or fewer' })
    .optional(),
  email: z.email().optional(),
  country: z.string().trim().max(120, { message: 'Country must be 120 characters or fewer' }).optional().nullable(),
  institution: z.string().trim().max(160, { message: 'Institution must be 160 characters or fewer' }).optional().nullable(),
  biography: z.string().trim().max(5000, { message: 'Biography must be 5000 characters or fewer' })
    .refine(value => wordCount(value) <= 500, { message: 'Biography must be 500 words or fewer' })
    .optional()
    .nullable(),
  specialization: z.string().trim().max(255, { message: 'Specialization must be 255 characters or fewer' })
    .refine(value => wordCount(value) <= 10, { message: 'Specialization must be 10 words or fewer' })
    .optional()
    .nullable(),
  publications: z.string().trim().max(5000, { message: 'Publications must be 5000 characters or fewer' })
    .refine(value => wordCount(value) <= 500, { message: 'Publications must be 500 words or fewer' })
    .optional()
    .nullable(),
  academicDegree: z.string().trim().max(120, { message: 'Academic degree must be 120 characters or fewer' }).optional().nullable(),
  regionalExpertise: z.array(z.string()).optional().nullable(),
  researchInterests: z.array(z.string()).optional().nullable(),
  preferredReviewTypes: z.array(z.string()).optional().nullable(),
  availableForReview: z.boolean().optional(),
  maxReviewsPerMonth: z.number().int().min(0).max(50).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().trim().max(500).optional().nullable()
})

export const userSettingsSchema = userUpdateSchema
