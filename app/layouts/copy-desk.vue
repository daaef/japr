<script setup lang="ts">
import type { EditorDashboardSummary } from '#shared/types/dashboard'
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'
import { usePageHeading } from '~/composables/usePageHeading'

const pageHeading = usePageHeading()
const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClassDark } = useDashboardNavigation()

const canManageEditorialBoard = computed(() =>
  currentUser.value?.permissions?.includes('editorial_board:manage')
)
const canManageUsers = computed(() =>
  currentUser.value?.permissions?.includes('user:create')
    || currentUser.value?.permissions?.includes('user:edit')
    || currentUser.value?.permissions?.includes('user:delete')
)
const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

const defaultEditorSummary = (): EditorDashboardSummary => ({
  deskReview: 0,
  legacyPending: 0,
  pendingQueue: 0,
  inProgress: 0,
  underPeerReview: 0,
  reviewed: 0,
  readyForNotice: 0,
  approved: 0,
  copyDesk: 0,
  published: 0,
  changesRequested: 0,
  declined: 0,
  byStatus: {
    desk_review: 0,
    pending: 0,
    'in-progress': 0,
    under_peer_review: 0,
    ready_for_managing_editor_notice: 0,
    approved: 0,
    approved_with_comment: 0,
    published: 0,
    declined: 0,
    changes_requested: 0,
    reviewed: 0
  }
})

const { data: dashboardSummary } = await useFetch<{ summary: EditorDashboardSummary }>('/api/editor/dashboard/summary', {
  key: 'editor-dashboard-summary',
  default: () => ({ summary: defaultEditorSummary() })
})

const summary = computed(() => dashboardSummary.value?.summary ?? defaultEditorSummary())

useHead({
  title: 'JAPR Website | Copy Desk'
})

async function signOut() {
  await authClient.signOut()
  await refresh()
  await navigateTo('/')
}

const sidebarOpen = ref(false)
function openSidebar() {
  sidebarOpen.value = true
}
function closeSidebar() {
  sidebarOpen.value = false
}
</script>

<template>
  <div class="relative flex min-h-screen">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
      @click="closeSidebar"
    />

    <aside
      class="fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-brick-950 transition-transform duration-200 xl:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <button
        type="button"
        class="absolute end-2 top-2 z-20 flex size-8 items-center justify-center rounded-full border border-white/20 text-brick-300 hover:border-primary hover:bg-primary hover:text-white xl:hidden"
        aria-label="Close sidebar"
        @click="closeSidebar"
      >
        <UIcon name="i-lucide-x" />
      </button>

      <NuxtLink
        to="/"
        class="sticky top-0 z-10 flex items-center gap-2.5 bg-brick-950 px-6 pb-5 pt-7"
      >
        <img
          class="h-11 w-auto shrink-0 rounded-full bg-taupe-50 p-1.5"
          src="/images/japr-logo.png"
          alt="Logo"
        >
        <div>
          <p class="text-sm font-bold tracking-wide text-white">
            JAPR
          </p>
          <p class="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-brick-400">
            Copy Desk
          </p>
        </div>
      </NuxtLink>

      <nav class="flex-1 overflow-y-auto px-4 pb-6">
        <ul class="flex flex-col gap-3">
          <li>
            <NuxtLink
              to="/copy-desk"
              class="flex items-center justify-between gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/copy-desk', true)"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-book-open"
                  class="text-xl"
                />
                <span>Copy Desk</span>
              </div>
              <span
                v-if="summary.copyDesk"
                class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
              >
                {{ summary.copyDesk }}
              </span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/copy-desk/users"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/copy-desk/users')"
            >
              <UIcon
                name="i-lucide-users"
                class="text-xl"
              />
              <span>Ping Users</span>
            </NuxtLink>
          </li>

          <li v-if="canManageEditorialBoard">
            <NuxtLink
              to="/admin/editorial-board"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/editorial-board')"
            >
              <UIcon
                name="i-lucide-users"
                class="text-xl"
              />
              <span>Editorial Board</span>
            </NuxtLink>
          </li>

          <li v-if="canManageUsers">
            <NuxtLink
              to="/admin/users"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/users')"
            >
              <UIcon
                name="i-lucide-user-plus"
                class="text-xl"
              />
              <span>Manage Users</span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/copy-desk/settings"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/copy-desk/settings')"
            >
              <UIcon
                name="i-lucide-settings"
                class="text-xl"
              />
              <span>Settings</span>
            </NuxtLink>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-start capitalize transition-colors text-brick-300 hover:bg-white/10 hover:text-white"
              @click="signOut"
            >
              <UIcon
                name="i-lucide-log-out"
                class="text-xl"
              />
              <span>Logout</span>
            </button>
          </li>
        </ul>
      </nav>
    </aside>

    <div class="flex min-h-screen flex-1 flex-col bg-primary-50 xl:ms-64">
      <div class="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-default bg-default px-4 py-4 sm:px-6">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            class="xl:hidden"
            aria-label="Open sidebar"
            @click="openSidebar"
          />
          <div v-if="pageHeading" class="hidden sm:block">
            <p class="text-[11px] font-bold uppercase tracking-wide text-dimmed">
              Copy Desk
            </p>
            <h1 class="font-serif text-lg font-semibold text-highlighted">
              {{ pageHeading }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <DashboardProfileDropdown
            :display-name="displayName"
            :full-name="currentUser.user?.name"
            settings-path="/copy-desk/settings"
            @sign-out="signOut"
          />
        </div>
      </div>

      <main class="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <slot />
      </main>

      <div class="mt-auto flex justify-center rounded-t-2xl bg-default px-5 py-5">
        <p class="text-xs text-dimmed">
          &copy; Copyright {{ new Date().getFullYear() }}, All Right Reserved
        </p>
      </div>
    </div>
  </div>
</template>
