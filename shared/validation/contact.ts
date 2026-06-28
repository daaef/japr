import { z } from 'zod'

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.'),
  lastName: z.string().trim().min(1, 'Last name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phoneCountry: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.'),
  privacyAccepted: z.literal(true, { message: 'You must accept the privacy policy.' })
})
