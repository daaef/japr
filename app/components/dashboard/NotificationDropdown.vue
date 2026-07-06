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

const { unreadCount, refreshUnreadCount } = useNotifications()

// Legacy Phosphor icon-font names stored on historical notification rows;
// only these three values are ever written (grepped every notification
// creation call site) — anything else falls back to the default bell.
const legacyIconMap: Record<string, string> = {
  'ph-bell': 'i-lucide-bell',
  'ph-clock': 'i-lucide-clock',
  'ph-file-text': 'i-lucide-file-text'
}

function notificationIcon(icon: string) {
  return legacyIconMap[icon] ?? 'i-lucide-bell'
}

type AvatarColor = 'primary' | 'warning' | 'neutral'

// Only 'primary' (default) and 'warning' are ever written server-side;
// anything unrecognized safely falls back to neutral.
const avatarColorMap: Record<string, AvatarColor> = {
  primary: 'primary',
  warning: 'warning'
}

const avatarClasses: Record<AvatarColor, string> = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  neutral: 'bg-elevated text-muted'
}

function avatarClass(color: string) {
  return avatarClasses[avatarColorMap[color] ?? 'neutral']
}

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

watch(open, (value) => {
  if (value) {
    loadDropdown()
  }
})

async function markRead(id: string, actionUrl?: string) {
  await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
  await Promise.all([loadDropdown(), refreshUnreadCount()])

  if (actionUrl && actionUrl !== '#') {
    open.value = false
    await navigateTo(actionUrl)
  }
}

async function markAllRead() {
  await $fetch('/api/notifications/read-all', { method: 'POST' })
  await Promise.all([loadDropdown(), refreshUnreadCount()])
}
</script>

<template>
  <UPopover v-model:open="open">
    <div class="relative">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-bell"
        size="lg"
        square
        aria-label="Notifications"
      />
      <UBadge
        v-if="unreadCount > 0"
        color="error"
        variant="solid"
        size="xs"
        class="absolute -top-0.5 -right-0.5 pointer-events-none"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </UBadge>
    </div>

    <template #content>
      <div class="w-96 max-w-[90vw]">
        <div class="flex items-center justify-between px-4 py-3 border-b border-default">
          <h3 class="text-sm font-semibold text-highlighted">
            Notifications
          </h3>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="markAllRead"
          >
            Mark all read
          </UButton>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <div
            v-if="loading"
            class="p-4 space-y-3"
          >
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-12 w-full" />
            <USkeleton class="h-12 w-full" />
          </div>

          <div
            v-else-if="errorMessage"
            class="text-center py-8 px-6"
          >
            <UIcon
              name="i-lucide-circle-alert"
              class="text-3xl text-error mb-2"
            />
            <p class="text-muted mb-3">
              {{ errorMessage }}
            </p>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              @click="loadDropdown"
            >
              Retry
            </UButton>
          </div>

          <div
            v-else-if="!items.length"
            class="text-center py-10"
          >
            <UIcon
              name="i-lucide-bell-off"
              class="text-3xl text-dimmed mb-2"
            />
            <p class="text-muted mb-0">
              No notifications
            </p>
          </div>

          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="notification in items"
              :key="notification.id"
            >
              <button
                type="button"
                class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-elevated transition-colors"
                :class="notification.isRead ? 'bg-default' : 'bg-elevated/50'"
                @click="markRead(notification.id, notification.actionUrl)"
              >
                <div
                  class="size-9 rounded-full flex items-center justify-center shrink-0"
                  :class="avatarClass(notification.color)"
                >
                  <UIcon :name="notificationIcon(notification.icon)" />
                </div>
                <div class="grow min-w-0">
                  <h4 class="text-sm font-semibold text-highlighted mb-0.5">
                    {{ notification.title }}
                  </h4>
                  <p class="text-xs text-muted mb-1">
                    {{ notification.message }}
                  </p>
                  <span class="text-xs text-dimmed">{{ notification.createdAt }}</span>
                </div>
                <span
                  v-if="!notification.isRead"
                  class="size-2 rounded-full bg-primary shrink-0 mt-1.5"
                />
              </button>
            </li>
          </ul>
        </div>

        <NuxtLink
          to="/notifications"
          class="block text-center py-3 text-sm font-semibold text-primary border-t border-default hover:underline"
          @click="open = false"
        >
          View All
        </NuxtLink>
      </div>
    </template>
  </UPopover>
</template>
