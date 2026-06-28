import { createEventStream, getQuery } from 'h3'
import { subscribeToNotifications } from '#server/utils/notificationStream'
import { requireSession } from '#server/utils/session'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const query = getQuery(event)
  const stream = createEventStream(event)

  const heartbeatMs = 15000
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const unsubscribe = subscribeToNotifications(session.user.id, (payload) => {
    stream.push(JSON.stringify(payload))
  })

  heartbeat = setInterval(() => {
    stream.push(JSON.stringify({ event: 'heartbeat', at: new Date().toISOString() }))
  }, heartbeatMs)

  stream.onClosed(async () => {
    if (heartbeat) {
      clearInterval(heartbeat)
    }
    unsubscribe()
    await stream.close()
  })

  if (query.poll === '1') {
    stream.push(JSON.stringify({ event: 'connected', mode: 'poll-compatible' }))
  }

  return stream.send()
})
