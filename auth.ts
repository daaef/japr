import { randomInt, randomUUID } from 'node:crypto'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db } from '#server/db/client'
import { accounts, activations, sessions, userRoles, users, verifications } from '#server/db/schema'

const isProduction = process.env.NODE_ENV === 'production'
const betterAuthSecret = process.env.BETTER_AUTH_SECRET
const betterAuthUrl = process.env.BETTER_AUTH_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

if (!betterAuthSecret) {
  console.warn('BETTER_AUTH_SECRET is not set. Authentication will fail until it is configured.')
}

function buildTrustedOrigins(): string[] {
  const origins = new Set<string>()

  try {
    origins.add(new URL(betterAuthUrl).origin)
  } catch {
    // Invalid BETTER_AUTH_URL; Better Auth will surface config errors on requests.
  }

  const extraOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  if (extraOrigins) {
    for (const origin of extraOrigins.split(',')) {
      const trimmed = origin.trim()
      if (trimmed) {
        origins.add(trimmed)
      }
    }
  }

  if (!isProduction) {
    origins.add('http://localhost:3000')
    origins.add('http://localhost:4000')
    origins.add('http://127.0.0.1:3000')
  }

  return [...origins]
}

function buildBaseURL() {
  if (process.env.VERCEL_URL) {
    // Bare `*.vercel.app` used to be trusted here too, so any attacker-deployed
    // Vercel project could pass as an allowed host for deriving this app's base URL
    // (used to build links like password resets). Preview-deploy support was dropped
    // rather than guessed at — add a scoped pattern (e.g. `japr-*-<team>.vercel.app`)
    // if preview deploys need to hit this app's auth routes.
    return {
      allowedHosts: ['japr.vercel.app'],
      protocol: 'https' as const
    }
  }

  return betterAuthUrl
}

export const auth = betterAuth({
  secret: betterAuthSecret,
  baseURL: buildBaseURL(),
  trustedOrigins: buildTrustedOrigins(),
  advanced: {
    database: {
      // users.id is a strict Postgres `uuid` column with its own gen_random_uuid()
      // default (unlike sessions/accounts/verifications, which migration 0007 already
      // converted to plain text specifically so better-auth's own generated id fits).
      // Better-auth's default id generator produces a nanoid-style string, which fails
      // to insert into a uuid column — confirmed live: every user creation through this
      // adapter (including Google OAuth, not just this task's email/password path)
      // was broken until this was added. Deferring to false lets Postgres's own
      // default assign the id instead.
      generateId: ({ model }) => model === 'user' ? false : randomUUID()
    }
  },
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
    // Registration must not log the user in before they've activated their account —
    // the session.create.before hook below rejects unverified users, and since this
    // adapter runs without a real DB transaction (drizzleAdapter's `transaction` option
    // is off), that rejection would surface as a thrown error on every sign-up instead
    // of silently rolling anything back. Skipping auto-sign-in avoids the codepath entirely.
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      const { sendPasswordResetEmail } = await import('#server/utils/email')
      await sendPasswordResetEmail(user.email, user.name, url)
    }
  },
  user: {
    additionalFields: {
      fullname: { type: 'string', required: true },
      username: { type: 'string', required: true, unique: true },
      country: { type: 'string', required: false },
      institution: { type: 'string', required: false }
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

          // Credential sign-ups start unverified and need an activation code; Google
          // OAuth users arrive with emailVerified already true and skip this entirely.
          if (!user.emailVerified) {
            const code = randomInt(100000, 1000000).toString()
            await db.insert(activations).values({
              email: user.email,
              code,
              userId: user.id,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000)
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
