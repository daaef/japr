import { assertCronRequest } from '#server/utils/cronAuth'
import { sendReviewerDeadlineReminders } from '#server/utils/reviewerReminders'

export default defineEventHandler(async (event) => {
  assertCronRequest(event)
  return sendReviewerDeadlineReminders()
})
