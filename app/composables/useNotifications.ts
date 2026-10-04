export async function useNotifications() {
  const connected = ref(false)
  const unreadCount = ref(0)
  const { data: currentUser } = useCurrentUser()

  const pollIntervalMs = 30000
  let eventSource: EventSource | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const preferences = computed(() => currentUser.value?.user?.notificationPreferences)

  function playNotificationSound() {
    if (!import.meta.client || !preferences.value?.in_app.sound) {
      return
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      return
    }
    const audioContext = new AudioContextCtor()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.frequency.value = 880
    gain.gain.value = 0.04
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.12)
  }

  function showDesktopNotification(payload: unknown) {
    if (!import.meta.client || !preferences.value?.in_app.desktop || !('Notification' in window)) {
      return
    }

    const notification = payload as {
      notification?: {
        data?: { title?: string, message?: string }
      }
    }
    const title = notification.notification?.data?.title ?? 'JAPR notification'
    const body = notification.notification?.data?.message ?? 'You have a new notification.'

    if (Notification.permission === 'granted') {
      new Notification(title, { body })
      return
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body })
        }
      })
    }
  }

  async function refreshUnreadCount() {
    try {
      const result = await $fetch<{ unreadCount: number }>('/api/notifications/unread-count')
      unreadCount.value = result.unreadCount
    } catch {
      // ignore when logged out
    }
  }

  function startPolling() {
    if (pollTimer) {
      return
    }

    pollTimer = setInterval(() => {
      refreshUnreadCount()
    }, pollIntervalMs)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function connectStream() {
    if (!import.meta.client || eventSource) {
      return
    }

    eventSource = new EventSource('/api/notifications/stream')

    eventSource.onopen = () => {
      connected.value = true
    }

    eventSource.onmessage = (message) => {
      refreshUnreadCount()
      try {
        const payload = JSON.parse(message.data) as unknown
        playNotificationSound()
        showDesktopNotification(payload)
      } catch {
        // Ignore non-JSON SSE heartbeats; the unread-count refresh above is still safe.
      }
    }

    eventSource.onerror = () => {
      connected.value = false
      eventSource?.close()
      eventSource = null
      startPolling()
    }
  }

  function disconnectStream() {
    eventSource?.close()
    eventSource = null
    connected.value = false
    stopPolling()
  }

  // Register lifecycle hooks before the first await so Vue keeps the active component instance.
  onMounted(() => {
    refreshUnreadCount()
    connectStream()
  })

  onBeforeUnmount(() => {
    disconnectStream()
  })

  // Fetch the initial unread count so the badge is rendered consistently during SSR hydration.
  // Await happens after hook registration to avoid the "onMounted called with no active instance"
  // warning from an async setup composable.
  const { data: initialUnread } = await useFetch<{ unreadCount: number }>('/api/notifications/unread-count', {
    key: 'notifications-unread-count',
    default: () => ({ unreadCount: 0 })
  })

  unreadCount.value = initialUnread.value?.unreadCount ?? 0

  watch(
    () => initialUnread.value?.unreadCount,
    (count) => {
      if (count !== undefined) {
        unreadCount.value = count
      }
    }
  )

  return {
    unreadCount: readonly(unreadCount),
    connected: readonly(connected),
    refreshUnreadCount,
    connectStream,
    disconnectStream
  }
}
