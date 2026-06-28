import { z } from 'zod'

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol.')

export const signUpSchema = z.object({
  fullname: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60),
  email: z.email(),
  country: z.string().trim().min(2).max(120),
  institution: z.string().trim().min(2).max(160),
  password: passwordSchema,
  confirmPassword: passwordSchema
}).refine(value => value.password === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword']
})

export const activationSchema = z.object({
  email: z.email(),
  code: z.string().trim().length(6)
})

export const reviewPolicySchema = z.object({
  accepted: z.literal(true)
})
