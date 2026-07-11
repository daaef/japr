<script setup lang="ts">
import type { ReviewerDashboardSummary } from '#shared/types/dashboard'
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClassDark, dashboardSubLinkClassDark, linkClassDark, useSidebarGroup } = useDashboardNavigation()

const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

const { data: dashboardSummary } = await useFetch<{ summary: ReviewerDashboardSummary }>('/api/reviewer/dashboard/summary', {
  default: () => ({
    summary: {
      pending: 0,
      inProgress: 0,
      reviewed: 0,
      approved: 0,
      declinedInvitations: 0,
      declinedManuscripts: 0,
      averageReviewTimeDays: 0,
      completionRate: 0,
      completedThisMonth: 0,
      overdueReviews: 0,
      urgentAssignments: 0,
      assignments: []
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
  '/reviewer/pending',
  '/reviewer/in-progress',
  '/reviewer/reviewed',
  '/reviewer/approved',
  '/reviewer/declined',
  '/reviewer/declined-invitations'
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
        to="/reviewer"
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
            Reviewer Workspace
          </p>
        </div>
      </NuxtLink>

      <nav class="flex-1 overflow-y-auto px-4 pb-6">
        <ul class="flex flex-col gap-3">
          <li>
            <NuxtLink
              to="/reviewer"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/reviewer', true)"
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
              :class="linkClassDark(journalsGroup.isGroupActive)"
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
              class="ms-6 mt-3 flex flex-col gap-3 border-s border-white/10 ps-4"
            >
              <li>
                <NuxtLink
                  to="/reviewer/pending"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClassDark('/reviewer/pending')"
                >
                  <span>Pending</span>
                  <span
                    v-if="summary.pending"
                    class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
                  >
                    {{ summary.pending }}
                  </span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/reviewer/in-progress"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClassDark('/reviewer/in-progress')"
                >
                  <span>In Progress</span>
                  <span
                    v-if="summary.inProgress"
                    class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
                  >
                    {{ summary.inProgress }}
                  </span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/reviewer/reviewed"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClassDark('/reviewer/reviewed')"
                >
                  <span>Reviewed</span>
                  <span
                    v-if="summary.reviewed"
                    class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
                  >
                    {{ summary.reviewed }}
                  </span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/reviewer/approved"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClassDark('/reviewer/approved')"
                >
                  <span>Approved</span>
                  <span
                    v-if="summary.approved"
                    class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
                  >
                    {{ summary.approved }}
                  </span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/reviewer/declined"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClassDark('/reviewer/declined')"
                >
                  <span>Declined Manuscripts</span>
                  <span
                    v-if="summary.declinedManuscripts"
                    class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
                  >
                    {{ summary.declinedManuscripts }}
                  </span>
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/reviewer/declined-invitations"
                  class="flex items-center justify-between gap-2 text-sm"
                  :class="dashboardSubLinkClassDark('/reviewer/declined-invitations')"
                >
                  <span>Declined Invitations</span>
                  <span
                    v-if="summary.declinedInvitations"
                    class="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-brick-200"
                  >
                    {{ summary.declinedInvitations }}
                  </span>
                </NuxtLink>
              </li>
            </ul>
          </li>

          <li class="border-t border-white/10 pt-5">
            <span class="block px-4 text-xs font-semibold uppercase tracking-wide text-marigold-300">Settings</span>
          </li>

          <li>
            <NuxtLink
              to="/reviewer/notifications"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/reviewer/notifications')"
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
              to="/reviewer/notifications/preferences"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/reviewer/notifications/preferences')"
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
              to="/reviewer/settings"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/reviewer/settings')"
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
            settings-path="/reviewer/settings"
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
