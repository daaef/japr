import { getRequestURL } from 'h3'
import { getAuthSession } from '#server/utils/session'

const publicAuthPrefixes = ['/api/auth/']

const publicGetPrefixes = [
  '/api/categories',
  '/api/countries',
  '/api/regions',
  '/api/stats'
]

function isPublicJournalGet(path: string) {
  if (!path.startsWith('/api/journals')) {
    return false
  }

  if (path.endsWith('/download') || path.includes('/download/')) {
    return false
  }

  return true
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) {
    return
  }

  if (publicAuthPrefixes.some(prefix => path.startsWith(prefix))) {
    return
  }

  if (event.method === 'GET' && publicGetPrefixes.some(prefix => path.startsWith(prefix))) {
    return
  }

  if (event.method === 'GET' && isPublicJournalGet(path)) {
    return
  }

  if (event.method === 'GET' && /^\/api\/journals\/[^/]+\/comments\/?$/.test(path)) {
    return
  }

  if (path === '/api/me') {
    return
  }

  const session = await getAuthSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthenticated'
    })
  }

  event.context.session = session
})
