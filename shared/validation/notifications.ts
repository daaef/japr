import { z } from 'zod'

// NOTE: `frequency` and `weekly_summary` were previously persisted but never read —
// no digest/scheduler exists, so all email fired immediately regardless. They have been
// removed rather than left as controls that promise behavior the system doesn't deliver.
// If a digest is built later, re-introduce them here together with the scheduled job.
export const notificationPreferencesSchema = z.object({
  email: z.object({
    manuscript_status: z.boolean(),
    review_assignment: z.boolean(),
    new_submissions: z.boolean()
  }),
  in_app: z.object({
    realtime: z.boolean(),
    sound: z.boolean(),
    desktop: z.boolean()
  })
})

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>

export const defaultNotificationPreferences: NotificationPreferences = {
  email: {
    manuscript_status: true,
    review_assignment: true,
    new_submissions: true
  },
  in_app: {
    realtime: true,
    sound: false,
    desktop: false
  }
}
