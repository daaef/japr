import { z } from 'zod'

export const reviewAssignmentSchema = z.object({
  journalId: z.string().uuid(),
  reviewerUserIds: z.array(z.string().uuid()).min(1).max(4)
})

export const reviewSubmitSchema = z.object({
  reviewerId: z.string().uuid(),
  review: z.string().trim().min(20).max(5000),
  comment: z.string().trim().min(20).max(5000),
  confidentialComments: z.string().trim().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  criteriaRatings: z.object({
    originality: z.number().int().min(0).max(5),
    methodology: z.number().int().min(0).max(5),
    significance: z.number().int().min(0).max(5),
    clarity: z.number().int().min(0).max(5),
    literatureReview: z.number().int().min(0).max(5),
    dataAnalysis: z.number().int().min(0).max(5)
  }),
  recommendation: z.enum(['accept', 'minor_revision', 'major_revision', 'reject'])
})

export const reviewInvitationTokenSchema = z.object({
  token: z.string().trim().min(1).max(255).optional(),
  journalId: z.string().uuid().optional()
}).refine(body => Boolean(body.token || body.journalId), {
  message: 'Invitation token or journal id is required.'
})
