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
</script>

<template>
  <div class="row gy-4">
    <div class="col-lg-12">
      <div class="row g-20 mb-24">
        <div class="col-xxl-2 col-sm-6">
          <div class="card border-0 p-20">
            <div class="card-body p-0">
              <span class="text-gray-600 text-sm mb-4 d-block">Total</span>
              <h4 class="text-gray-800 mb-0">
                {{ stats?.total ?? 0 }}
              </h4>
            </div>
          </div>
        </div>
        <div class="col-xxl-2 col-sm-6">
          <div class="card border-0 p-20">
            <div class="card-body p-0">
              <span class="text-gray-600 text-sm mb-4 d-block">Unread</span>
              <h4 class="text-gray-800 mb-0">
                {{ stats?.unread ?? 0 }}
              </h4>
            </div>
          </div>
        </div>
        <div class="col-xxl-2 col-sm-6">
          <div class="card border-0 p-20">
            <div class="card-body p-0">
              <span class="text-gray-600 text-sm mb-4 d-block">Today</span>
              <h4 class="text-gray-800 mb-0">
                {{ stats?.today ?? 0 }}
              </h4>
            </div>
          </div>
        </div>
        <div class="col-xxl-2 col-sm-6">
          <div class="card border-0 p-20">
            <div class="card-body p-0">
              <span class="text-gray-600 text-sm mb-4 d-block">This week</span>
              <h4 class="text-gray-800 mb-0">
                {{ stats?.thisWeek ?? 0 }}
              </h4>
            </div>
          </div>
        </div>
        <div class="col-xxl-2 col-sm-6">
          <div class="card border-0 p-20">
            <div class="card-body p-0">
              <span class="text-gray-600 text-sm mb-4 d-block">High priority</span>
              <h4 class="text-gray-800 mb-0">
                {{ stats?.highPriority ?? 0 }}
              </h4>
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-24">
        <div class="card-header flex-between flex-wrap gap-8">
          <h4 class="mb-0">
            Notifications
          </h4>
          <div class="flex-align gap-8 flex-wrap">
            <NuxtLink
              to="/notifications/preferences"
              class="btn btn-outline-secondary btn-sm"
            >
              Preferences
            </NuxtLink>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              @click="exportCsv"
            >
              Export CSV
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              @click="markAllRead"
            >
              Mark all read
            </button>
          </div>
        </div>
        <div class="card-body border-bottom border-gray-100">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label
                for="notification-type-filter"
                class="form-label text-13 fw-semibold mb-8"
              >Type</label>
              <select
                id="notification-type-filter"
                v-model="typeFilter"
                class="form-select py-9 text-15 fw-medium"
              >
                <option value="all">
                  All types
                </option>
                <option
                  v-for="option in typeOptions"
                  :key="option.type"
                  :value="option.type"
                >
                  {{ formatTypeLabel(option.type) }} ({{ option.count }})
                </option>
              </select>
            </div>
            <div class="col-md-4">
              <label
                for="notification-status-filter"
                class="form-label text-13 fw-semibold mb-8"
              >Status</label>
              <select
                id="notification-status-filter"
                v-model="statusFilter"
                class="form-select py-9 text-15 fw-medium"
              >
                <option value="all">
                  All
                </option>
                <option value="unread">
                  Unread
                </option>
                <option value="read">
                  Read
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div
            v-if="!data?.notifications.length"
            class="p-24 text-13 text-gray-500"
          >
            No notifications.
          </div>
          <ul
            v-else
            class="list-group list-group-flush"
          >
            <li
              v-for="notification in data.notifications"
              :key="notification.id"
              class="list-group-item flex-between flex-wrap gap-8"
              :class="{ 'bg-gray-50': !notification.readAt }"
            >
              <div>
                <div class="d-flex align-items-start gap-12">
                  <div
                    class="w-40 h-40 rounded-circle flex-center"
                    :class="`bg-${notification.data.color ?? 'primary'}-100 text-${notification.data.color ?? 'primary'}-600`"
                  >
                    <i :class="`ph ${notification.data.icon ?? 'ph-bell'}`" />
                  </div>
                  <div>
                    <div class="d-flex flex-wrap align-items-center gap-2">
                      <p class="fw-semibold mb-0">
                        {{ notification.data.title || notification.type }}
                      </p>
                      <span v-if="!notification.readAt" class="badge bg-primary">New</span>
                      <span v-if="notification.data.priority === 'high'" class="badge bg-danger">High priority</span>
                    </div>
                    <p class="text-13 text-gray-600 mb-0 mt-1">
                      {{ notification.data.message || '—' }}
                    </p>
                    <p v-if="notification.data.journalTitle" class="text-13 text-gray-500 mt-1 mb-0">
                      Journal: {{ notification.data.journalTitle }}
                    </p>
                    <p class="text-13 text-gray-400 mt-2 mb-0">
                      {{ new Date(notification.createdAt).toLocaleString() }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex-align gap-8">
                <NuxtLink
                  v-if="notificationActionUrl(notification)"
                  :to="notificationActionUrl(notification)"
                  class="btn btn-outline-secondary btn-sm"
                >
                  View Details
                </NuxtLink>
                <button
                  v-if="!notification.readAt"
                  type="button"
                  class="btn btn-outline-primary btn-sm"
                  :disabled="loadingId === notification.id"
                  aria-label="Mark notification as read"
                  @click="markRead(notification.id)"
                >
                  Mark read
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm"
                  aria-label="Delete notification"
                  @click="deleteNotification(notification.id)"
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div
          v-if="data?.meta && data.meta.pageCount > 1"
          class="card-footer flex-between flex-wrap gap-12"
        >
          <span class="text-13 text-gray-600">
            {{ data.meta.total }} notifications · Page {{ data.meta.page }} of {{ data.meta.pageCount }}
          </span>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="page <= 1"
              @click="page -= 1"
            >
              Previous
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="page >= data.meta.pageCount"
              @click="page += 1"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
