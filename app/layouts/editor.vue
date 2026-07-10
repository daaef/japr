<script setup lang="ts">
import type { EditorDashboardSummary } from '#shared/types/dashboard'
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClass, dashboardSubLinkClass, linkClass, useSidebarGroup } = useDashboardNavigation()
const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

const showReadyForNotice = computed(() => {
  const roles = currentUser.value?.roles ?? []
  return roles.includes('managing_editor') || roles.includes('editor_in_chief')
})

const { data: dashboardSummary } = await useFetch<{ summary: EditorDashboardSummary }>('/api/editor/dashboard/summary', {
  default: () => ({
    summary: {
      deskReview: 0,
      legacyPending: 0,
      pendingQueue: 0,
      inProgress: 0,
      underPeerReview: 0,
      reviewed: 0,
      readyForNotice: 0,
      approved: 0,
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
    }
  })
})

const summary = computed(() => dashboardSummary.value.summary)

useHead({
  title: 'JAPR Website | Dashboard'
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

const journalsGroup = useSidebarGroup([
  '/editor/submissions',
  '/editor/under-peer-review',
  '/editor/in-progress',
  '/editor/reviews',
  '/editor/ready-for-notice',
  '/editor/approved',
  '/editor/published',
  '/editor/revision-requested',
  '/editor/declined',
  '/editor/copy-desk'
])
</script>

<template>
  <div class="relative flex min-h-screen">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
      @click="closeSidebar"
    />

    <aside
      class="fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e border-default bg-default transition-transform duration-200 xl:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <button
        type="button"
        class="absolute end-2 top-2 z-20 flex size-8 items-center justify-center rounded-full border border-default text-muted hover:border-primary hover:bg-primary hover:text-white xl:hidden"
        aria-label="Close sidebar"
        @click="closeSidebar"
      >
        <UIcon name="i-lucide-x" />
      </button>

      <NuxtLink
        to="/editor"
        class="sticky top-0 z-10 block bg-default px-5 pb-3 pt-6 text-center"
      >
        <img
          class="mx-auto h-10 w-auto"
          src="/images/japr-logo.png"
          alt="Logo"
        >
      </NuxtLink>

      <nav class="flex-1 overflow-y-auto px-4 pb-6">
        <ul class="flex flex-col gap-3">
          <li>
            <NuxtLink
              to="/editor"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/editor', true)"
            >
              <UIcon
                name="i-lucide-layout-grid"
                class="text-xl"
              />
              <span>Dashboard</span>
            </NuxtLink>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-start capitalize transition-colors"
              :class="linkClass(journalsGroup.isGroupActive)"
              :aria-expanded="journalsGroup.open"
              @click="journalsGroup.toggle"
            >
              <UIcon
                name="i-lucide-graduation-cap"
                class="text-xl"
              />
              <span>Manage Journals</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="ms-auto shrink-0 transition-transform duration-200"
                :class="{ 'rotate-90': journalsGroup.open }"
              />
            </button>
            <ul
              v-show="journalsGroup.open"
              class="ms-6 mt-3 flex flex-col gap-3 border-s border-default ps-4"
            >
              <li>
                <NuxtLink
                  to="/editor/submissions"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/submissions')"
                >
                  <span>Pending Review</span>
                  <UBadge
                    v-if="summary.pendingQueue"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.pendingQueue }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/under-peer-review"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/under-peer-review')"
                >
                  <span>Under Peer Review</span>
                  <UBadge
                    v-if="summary.underPeerReview"
                    color="info"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.underPeerReview }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/in-progress"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/in-progress')"
                >
                  <span>In Progress</span>
                  <UBadge
                    v-if="summary.inProgress"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.inProgress }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/reviews"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/reviews')"
                >
                  <span>Reviewed</span>
                  <UBadge
                    v-if="summary.reviewed"
                    color="success"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.reviewed }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li v-if="showReadyForNotice">
                <NuxtLink
                  to="/editor/ready-for-notice"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/ready-for-notice')"
                >
                  <span>Ready for Notice</span>
                  <UBadge
                    v-if="summary.readyForNotice"
                    color="primary"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.readyForNotice }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/approved"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/approved')"
                >
                  <span>Approved</span>
                  <UBadge
                    v-if="summary.approved"
                    color="success"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.approved }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/published"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/published')"
                >
                  <span>Published</span>
                  <UBadge
                    v-if="summary.published"
                    color="success"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.published }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/revision-requested"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/revision-requested')"
                >
                  <span>Revision Requested</span>
                  <UBadge
                    v-if="summary.changesRequested"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.changesRequested }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/declined"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClass('/editor/declined')"
                >
                  <span>Declined</span>
                  <UBadge
                    v-if="summary.declined"
                    color="error"
                    variant="subtle"
                    size="sm"
                  >
                    {{ summary.declined }}
                  </UBadge>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/editor/copy-desk"
                  class="block text-sm"
                  :class="dashboardSubLinkClass('/editor/copy-desk')"
                >
                  Copy Desk
                </NuxtLink>
              </li>
            </ul>
          </li>

          <li class="border-t border-default pt-5">
            <span class="block px-4 text-xs font-semibold uppercase tracking-wide text-dimmed">Settings</span>
          </li>

          <li>
            <NuxtLink
              to="/editor/notifications"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/editor/notifications')"
            >
              <UIcon
                name="i-lucide-bell"
                class="text-xl"
              />
              <span>Notifications</span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/editor/notifications/preferences"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/editor/notifications/preferences')"
            >
              <UIcon
                name="i-lucide-sliders-horizontal"
                class="text-xl"
              />
              <span>Notification Preferences</span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/editor/settings"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/editor/settings')"
            >
              <UIcon
                name="i-lucide-settings"
                class="text-xl"
              />
              <span>Account Settings</span>
            </NuxtLink>
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
        </div>

        <div class="flex items-center gap-4">
          <NotificationDropdown />

          <DashboardProfileDropdown
            :display-name="displayName"
            :full-name="currentUser.user?.name"
            settings-path="/editor/settings"
            @sign-out="signOut"
          />
        </div>
      </div>

      <main class="flex-1 px-4 py-6 sm:px-6">
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
