<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const { applyRoleLayout } = useRoleLayout()
await applyRoleLayout()

const statusFilter = ref<'all' | 'unread' | 'read'>('all')
const typeFilter = ref('all')
const page = ref(1)
const loadingId = ref('')

const { data: stats, refresh: refreshStats } = await useFetch<{
  total: number
  unread: number
  today: number
  thisWeek: number
  highPriority: number
  byType: Record<string, number>
}>('/api/notifications/stats', {
  default: () => ({
    total: 0,
    unread: 0,
    today: 0,
    thisWeek: 0,
    highPriority: 0,
    byType: {}
  })
})

const typeOptions = computed(() =>
  Object.entries(stats.value?.byType ?? {})
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => a.type.localeCompare(b.type))
)

function formatTypeLabel(type: string) {
  return type.replaceAll('-', ' ').replaceAll('_', ' ')
}

const { data, refresh } = await useFetch<{
  notifications: Array<{
    id: string
    type: string
    data: {
      title?: string
      message?: string
      icon?: string
      color?: string
      action_url?: string
      actionUrl?: string
      priority?: string
      journalTitle?: string
    }
    readAt: string | null
    createdAt: string
  }>
  meta: { total: number, page: number, pageSize: number, pageCount: number }
}>('/api/notifications', {
  query: computed(() => ({
    page: page.value,
    pageSize: 20,
    read: statusFilter.value === 'all'
      ? undefined
      : statusFilter.value === 'read'
        ? 'true'
        : 'false',
    type: typeFilter.value === 'all' ? undefined : typeFilter.value
  })),
  default: () => ({
    notifications: [],
    meta: { total: 0, page: 1, pageSize: 20, pageCount: 1 }
  })
})

watch([statusFilter, typeFilter], () => {
  page.value = 1
})

async function refreshAll() {
  await Promise.all([refresh(), refreshStats()])
}

async function markRead(id: string) {
  loadingId.value = id

  try {
    await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    await refreshAll()
  } finally {
    loadingId.value = ''
  }
}

async function deleteNotification(id: string) {
  await $fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  await refreshAll()
}

async function markAllRead() {
  await $fetch('/api/notifications/read-all', { method: 'POST' })
  await refreshAll()
}

function exportCsv() {
  const params = new URLSearchParams()
  if (statusFilter.value === 'unread') {
    params.set('status', 'unread')
  } else if (statusFilter.value === 'read') {
    params.set('status', 'read')
  }
  if (typeFilter.value !== 'all') {
    params.set('type', typeFilter.value)
  }
  const query = params.toString()
  window.location.href = `/api/notifications/export${query ? `?${query}` : ''}`
}

function notificationActionUrl(notification: { data: { action_url?: string, actionUrl?: string } }) {
  return notification.data.action_url ?? notification.data.actionUrl ?? ''
}

// Server-set notification icons are a small, known set of Phosphor classes (see
// server/utils/editorNotifications.ts, server/api/journals/index.post.ts) — map each to its
// verified lucide equivalent (icon-map.md) and fall back to the bell default for anything else.
const PH_TO_LUCIDE_ICON: Record<string, string> = {
  'ph-bell': 'i-lucide-bell',
  'ph-clock': 'i-lucide-clock',
  'ph-file-text': 'i-lucide-file-text'
}

function notificationIcon(notification: { data: { icon?: string } }) {
  return PH_TO_LUCIDE_ICON[notification.data.icon ?? 'ph-bell'] ?? 'i-lucide-bell'
}

const typeFilterItems = computed(() => [
  { label: 'All types', value: 'all' },
  ...typeOptions.value.map(option => ({
    label: `${formatTypeLabel(option.type)} (${option.count})`,
    value: option.type
  }))
])

const statusFilterItems = [
  { label: 'All', value: 'all' as const },
  { label: 'Unread', value: 'unread' as const },
  { label: 'Read', value: 'read' as const }
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
      <UCard>
        <p class="mb-1 text-sm text-muted">Total</p>
        <h4 class="mb-0 text-2xl font-semibold text-highlighted">{{ stats?.total ?? 0 }}</h4>
      </UCard>
      <UCard>
        <p class="mb-1 text-sm text-muted">Unread</p>
        <h4 class="mb-0 text-2xl font-semibold text-highlighted">{{ stats?.unread ?? 0 }}</h4>
      </UCard>
      <UCard>
        <p class="mb-1 text-sm text-muted">Today</p>
        <h4 class="mb-0 text-2xl font-semibold text-highlighted">{{ stats?.today ?? 0 }}</h4>
      </UCard>
      <UCard>
        <p class="mb-1 text-sm text-muted">This week</p>
        <h4 class="mb-0 text-2xl font-semibold text-highlighted">{{ stats?.thisWeek ?? 0 }}</h4>
      </UCard>
      <UCard>
        <p class="mb-1 text-sm text-muted">High priority</p>
        <h4 class="mb-0 text-2xl font-semibold text-highlighted">{{ stats?.highPriority ?? 0 }}</h4>
      </UCard>
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h4 class="text-base font-semibold text-highlighted">
            Notifications
          </h4>
          <div class="flex flex-wrap items-center gap-2">
            <UButton to="/notifications/preferences" color="neutral" variant="outline" size="sm">
              Preferences
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="exportCsv">
              Export CSV
            </UButton>
            <UButton color="primary" size="sm" @click="markAllRead">
              Mark all read
            </UButton>
          </div>
        </div>
      </template>

      <div class="border-b border-default p-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <UFormField label="Type">
            <USelect id="notification-type-filter" v-model="typeFilter" :items="typeFilterItems" class="w-full" />
          </UFormField>
          <UFormField label="Status">
            <USelect id="notification-status-filter" v-model="statusFilter" :items="statusFilterItems" class="w-full" />
          </UFormField>
        </div>
      </div>

      <p v-if="!data?.notifications.length" class="p-6 text-sm text-muted">
        No notifications.
      </p>
      <ul v-else class="divide-y divide-default">
        <li
          v-for="notification in data.notifications"
          :key="notification.id"
          class="flex flex-wrap items-center justify-between gap-2 p-4"
          :class="{ 'bg-muted': !notification.readAt }"
        >
          <div>
            <div class="flex items-start gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-full"
                :class="`bg-${notification.data.color ?? 'primary'}-100 text-${notification.data.color ?? 'primary'}-600`"
              >
                <UIcon :name="notificationIcon(notification)" />
              </div>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="mb-0 font-semibold text-highlighted">
                    {{ notification.data.title || notification.type }}
                  </p>
                  <UBadge v-if="!notification.readAt" color="primary" variant="subtle">New</UBadge>
                  <UBadge v-if="notification.data.priority === 'high'" color="error" variant="subtle">High priority</UBadge>
                </div>
                <p class="mb-0 mt-1 text-sm text-muted">
                  {{ notification.data.message || '—' }}
                </p>
                <p v-if="notification.data.journalTitle" class="mb-0 mt-1 text-sm text-muted">
                  Journal: {{ notification.data.journalTitle }}
                </p>
                <p class="mb-0 mt-2 text-sm text-dimmed">
                  {{ new Date(notification.createdAt).toLocaleString() }}
                </p>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              v-if="notificationActionUrl(notification)"
              :to="notificationActionUrl(notification)"
              color="neutral"
              variant="outline"
              size="sm"
            >
              View Details
            </UButton>
            <UButton
              v-if="!notification.readAt"
              color="primary"
              variant="outline"
              size="sm"
              :disabled="loadingId === notification.id"
              aria-label="Mark notification as read"
              @click="markRead(notification.id)"
            >
              Mark read
            </UButton>
            <UButton
              color="error"
              variant="outline"
              size="sm"
              aria-label="Delete notification"
              @click="deleteNotification(notification.id)"
            >
              Delete
            </UButton>
          </div>
        </li>
      </ul>

      <template v-if="data?.meta && data.meta.pageCount > 1" #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm text-muted">
            {{ data.meta.total }} notifications · Page {{ data.meta.page }} of {{ data.meta.pageCount }}
          </span>
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" size="sm" :disabled="page <= 1" @click="page -= 1">
              Previous
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" :disabled="page >= data.meta.pageCount" @click="page += 1">
              Next
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
