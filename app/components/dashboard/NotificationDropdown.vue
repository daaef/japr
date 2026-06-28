<script setup lang="ts">
interface DropdownNotification {
  id: string
  type: string
  title: string
  message: string
  actionUrl: string
  icon: string
  color: string
  createdAt: string
  isRead: boolean
}

const open = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const items = ref<DropdownNotification[]>([])
const root = ref<HTMLElement | null>(null)

const { unreadCount, refreshUnreadCount } = useNotifications()

async function loadDropdown() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch<{
      notifications: DropdownNotification[]
      unreadCount: number
    }>('/api/notifications/dropdown')

    items.value = result.notifications
    await refreshUnreadCount()
  } catch {
    items.value = []
    errorMessage.value = 'Unable to load notifications.'
  } finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value

  if (open.value) {
    loadDropdown()
  }
}

function close() {
  open.value = false
}

async function markRead(id: string, actionUrl?: string) {
  await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
  await Promise.all([loadDropdown(), refreshUnreadCount()])

  if (actionUrl && actionUrl !== '#') {
    await navigateTo(actionUrl)
    close()
  }
}

async function markAllRead() {
  await $fetch('/api/notifications/read-all', { method: 'POST' })
  await Promise.all([loadDropdown(), refreshUnreadCount()])
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) {
    return
  }

  const target = event.target as Node | null
  if (root.value && target && !root.value.contains(target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <div
    ref="root"
    class="dropdown"
  >
    <button
      type="button"
      class="dropdown-btn text-gray-500 w-40 h-40 bg-main-50 hover-bg-main-100 transition-2 rounded-circle text-xl flex-center position-relative"
      aria-label="Notifications"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      <span class="position-relative">
        <i class="ph ph-bell" />
        <span
          v-if="unreadCount > 0"
          class="alarm-notify position-absolute inset-e-0 notification-badge"
        >
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </span>
    </button>

    <div
      class="dropdown-menu dropdown-menu--lg border-0 bg-transparent p-0"
      :class="{ show: open }"
      style="position: absolute; inset: 0px auto auto 0px; margin: 0px; transform: translate(0px, 42px);"
    >
      <div class="card border border-gray-100 rounded-12 box-shadow-custom p-0 overflow-hidden">
        <div class="card-body p-0">
          <div class="py-8 px-24 bg-main-600">
            <div class="flex-between">
              <h5 class="text-xl fw-semibold text-white mb-0">
                Notifications
              </h5>
              <div class="flex-align gap-12">
                <button
                  type="button"
                  class="bg-white rounded-6 text-sm px-8 py-2 hover-text-primary-600"
                  @click.stop="markAllRead"
                >
                  Mark All Read
                </button>
                <button
                  type="button"
                  class="close-dropdown hover-scale-1 text-xl text-white"
                  aria-label="Close notifications"
                  @click.stop="close"
                >
                  <i class="ph ph-x" />
                </button>
              </div>
            </div>
          </div>

          <div class="notifications-container max-h-400 overflow-y-auto">
            <div
              v-if="loading"
              class="text-center py-20"
            >
              <div
                class="spinner-border text-primary"
                role="status"
              >
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>

            <div
              v-else-if="errorMessage"
              class="text-center py-20 px-24"
            >
              <i class="ph ph-warning-circle text-4xl text-danger mb-2" />
              <p class="text-gray-600 mb-3">
                {{ errorMessage }}
              </p>
              <button
                type="button"
                class="btn btn-outline-primary btn-sm"
                @click.stop="loadDropdown"
              >
                Retry
              </button>
            </div>

            <div
              v-else-if="!items.length"
              class="text-center py-20"
            >
              <i class="ph ph-bell-slash text-4xl text-gray-300 mb-2" />
              <p class="text-gray-400 mb-0">
                No notifications
              </p>
            </div>

            <div v-else>
              <button
                v-for="notification in items"
                :key="notification.id"
                type="button"
                class="notification-item w-100 border-0 text-start px-24 py-16 border-bottom border-gray-100"
                :class="notification.isRead ? 'bg-gray-50' : 'bg-white'"
                @click="markRead(notification.id, notification.actionUrl)"
              >
                <div class="flex-between gap-8">
                  <div class="flex-align gap-12">
                    <div
                      class="w-40 h-40 rounded-circle flex-center"
                      :class="`bg-${notification.color}-100 text-${notification.color}-600`"
                    >
                      <i :class="`ph ${notification.icon}`" />
                    </div>
                    <div class="grow">
                      <h6 class="text-sm fw-semibold mb-4">
                        {{ notification.title }}
                      </h6>
                      <p class="text-xs text-gray-600 mb-0">
                        {{ notification.message }}
                      </p>
                      <span class="text-xs text-gray-400">{{ notification.createdAt }}</span>
                    </div>
                  </div>
                  <span
                    v-if="!notification.isRead"
                    class="w-8 h-8 bg-primary-600 rounded-circle shrink-0"
                  />
                </div>
              </button>
            </div>
          </div>

          <NuxtLink
            to="/notifications"
            class="py-13 px-24 fw-bold text-center d-block text-primary-600 border-top border-gray-100 hover-text-decoration-underline"
            @click="close"
          >
            View All
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-badge {
  background-color: #dc3545;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  top: -4px;
  right: -4px;
}

.max-h-400 {
  max-height: 400px;
}

.notification-item {
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: #f8f9fa !important;
}
</style>
