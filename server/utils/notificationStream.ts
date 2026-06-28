type StreamListener = (payload: Record<string, unknown>) => void

const listeners = new Map<string, Set<StreamListener>>()

export function subscribeToNotifications(userId: string, listener: StreamListener) {
  if (!listeners.has(userId)) {
    listeners.set(userId, new Set())
  }

  listeners.get(userId)!.add(listener)

  return () => {
    listeners.get(userId)?.delete(listener)
  }
}

export function publishNotification(userId: string, payload: Record<string, unknown>) {
  const userListeners = listeners.get(userId)
  if (!userListeners) {
    return
  }

  for (const listener of userListeners) {
    listener(payload)
  }
}
