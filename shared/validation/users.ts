import { z } from 'zod'

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
  fullname: z.string().trim().min(2).max(120).optional(),
  username: z.string().trim().min(3).max(60).optional(),
  email: z.email().optional(),
  country: z.string().trim().max(120).optional().nullable(),
  institution: z.string().trim().max(160).optional().nullable(),
  biography: z.string().trim().max(5000).optional().nullable(),
  specialization: z.string().trim().max(255).optional().nullable(),
  publications: z.string().trim().max(5000).optional().nullable(),
  academicDegree: z.string().trim().max(120).optional().nullable(),
  regionalExpertise: z.array(z.string()).optional().nullable(),
  researchInterests: z.array(z.string()).optional().nullable(),
  preferredReviewTypes: z.array(z.string()).optional().nullable(),
  availableForReview: z.boolean().optional(),
  maxReviewsPerMonth: z.number().int().min(0).max(50).optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().trim().max(500).optional().nullable()
})

export const userSettingsSchema = userUpdateSchema
