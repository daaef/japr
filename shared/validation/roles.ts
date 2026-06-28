import { z } from 'zod'

export const roleCreateSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(255).optional().nullable()
})

export const roleUpdateSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  description: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().optional()
})

export const rolePermissionAssignSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1)
})
