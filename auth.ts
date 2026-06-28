import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { accounts, sessions, userRoles, users, verifications } from '#server/db/schema'

const betterAuthSecret = process.env.BETTER_AUTH_SECRET
const betterAuthUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

if (!betterAuthSecret) {
  console.warn('BETTER_AUTH_SECRET is not set. Authentication will fail until it is configured.')
}

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: betterAuthUrl,
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:4000',
    process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  ].filter(Boolean),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications
    }
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const { sendPasswordResetEmail } = await import('#server/utils/email')
      await sendPasswordResetEmail(user.email, user.name, url)
    }
  },
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET
        }
      }
    : undefined,
  session: {
    expiresIn: 60 * 60 * 24 * 7
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const authorRole = await db.query.roles.findFirst({
            where: (table, { eq }) => eq(table.name, 'author')
          })

          if (!authorRole) {
            return
          }

          const existing = await db.query.userRoles.findFirst({
            where: (table, { and, eq }) => and(eq(table.userId, user.id), eq(table.roleId, authorRole.id))
          })

          if (!existing) {
            await db.insert(userRoles).values({
              userId: user.id,
              roleId: authorRole.id
            })
          }
        }
      }
    },
    session: {
      create: {
        before: async (session) => {
          const user = await db.query.users.findFirst({
            where: (table, { eq }) => eq(table.id, session.userId)
          })

          if (!user?.isActive) {
            throw new APIError('FORBIDDEN', {
              message: 'This account is inactive.'
            })
          }

          if (!user.emailVerified) {
            throw new APIError('FORBIDDEN', {
              message: 'Please activate your account before signing in.'
            })
          }

          await db
            .update(users)
            .set({
              lastLoginAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(users.id, session.userId))

          return { data: session }
        },
        after: async (session) => {
          const user = await db.query.users.findFirst({
            where: (table, { eq }) => eq(table.id, session.userId)
          })

          if (!user) {
            return
          }

          try {
            const { sendLoginNotificationEmail } = await import('#server/utils/email')
            await sendLoginNotificationEmail(
              user.email,
              user.fullname,
              session.ipAddress,
              session.userAgent
            )
          } catch (error) {
            console.error('Failed to send login notification:', error)
          }
        }
      }
    }
  }
})
