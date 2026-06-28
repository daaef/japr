import { defineStore } from 'pinia'

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0)
  const notifications = ref<Array<{
    id: string
    type: string
    data: { title?: string, message?: string }
    readAt: string | null
    createdAt: string
  }>>([])

  async function fetchUnreadCount() {
    const result = await $fetch<{ unreadCount: number }>('/api/notifications/unread-count')
    unreadCount.value = result.unreadCount
    return result.unreadCount
  }

  async function fetchRecent() {
    const result = await $fetch<{
      notifications: Array<{
        id: string
        type: string
        data: { title?: string, message?: string }
        readAt: string | null
        createdAt: string
      }>
    }>('/api/notifications', {
      query: { pageSize: 5, read: 'false' }
    })
    notifications.value = result.notifications
    return result.notifications
  }

  async function markAllRead() {
    await $fetch('/api/notifications/read-all', { method: 'POST' })
    unreadCount.value = 0
    notifications.value = []
  }

  return {
    unreadCount,
    notifications,
    fetchUnreadCount,
    fetchRecent,
    markAllRead
  }
})
