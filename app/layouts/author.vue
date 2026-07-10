<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const route = useRoute()
const searchQuery = ref('')
const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClass, dashboardSubLinkClass, linkClass, useSidebarGroup } = useDashboardNavigation()

const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

// Kept alongside useDashboardNavigation()'s isExactPath: this is the one
// nav item (Dashboard) that predates the shared composable and already
// behaves identically, so it's left as-is rather than churned for its own sake.
function isActive(path: string) {
  if (path === '/author') {
    return route.path === '/author' || route.path === '/author/'
  }

  return route.path === path || route.path.startsWith(`${path}/`)
}

async function submitSearch() {
  const search = searchQuery.value.trim()

  await navigateTo({
    path: '/journals',
    query: search
      ? { search, searchType: 'title' }
      : undefined
  })
}

async function signOut() {
  await authClient.signOut()
  await refresh()
  await navigateTo('/')
}

useHead({
  title: 'JAPR Website | Dashboard'
})

const sidebarOpen = ref(false)
function openSidebar() {
  sidebarOpen.value = true
}
function closeSidebar() {
  sidebarOpen.value = false
}

const manuscriptsGroup = useSidebarGroup(['/author/submit', '/author/submissions'])
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
        to="/author"
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
              to="/author"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="linkClass(isActive('/author'))"
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
              :class="linkClass(manuscriptsGroup.isGroupActive)"
              :aria-expanded="manuscriptsGroup.open"
              @click="manuscriptsGroup.toggle"
            >
              <UIcon
                name="i-lucide-book-open"
                class="text-xl"
              />
              <span>Manage Manuscripts</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="ms-auto shrink-0 transition-transform duration-200"
                :class="{ 'rotate-90': manuscriptsGroup.open }"
              />
            </button>
            <ul
              v-show="manuscriptsGroup.open"
              class="ms-6 mt-3 flex flex-col gap-3 border-s border-default ps-4"
            >
              <li>
                <NuxtLink
                  to="/author/submit"
                  class="block text-sm"
                  :class="dashboardSubLinkClass('/author/submit')"
                >
                  Submit Manuscript
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/author/submissions"
                  class="block text-sm"
                  :class="dashboardSubLinkClass('/author/submissions')"
                >
                  My Submissions
                </NuxtLink>
              </li>
            </ul>
          </li>

          <li>
            <NuxtLink
              to="/journals"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/journals')"
            >
              <UIcon
                name="i-lucide-graduation-cap"
                class="text-xl"
              />
              <span>Categories</span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/author/collections"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/author/collections')"
            >
              <UIcon
                name="i-lucide-bookmark"
                class="text-xl"
              />
              <span>My Collections</span>
            </NuxtLink>
          </li>

          <li class="border-t border-default pt-5">
            <span class="block px-4 text-xs font-semibold uppercase tracking-wide text-dimmed">Settings</span>
          </li>

          <li>
            <NuxtLink
              to="/notifications"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/notifications')"
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
              to="/notifications/preferences"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/notifications/preferences')"
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
              to="/author/interests"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/author/interests')"
            >
              <UIcon
                name="i-lucide-target"
                class="text-xl"
              />
              <span>Research Interests</span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/author/settings"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClass('/author/settings')"
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

          <form
            class="hidden w-80 sm:block"
            @submit.prevent="submitSearch"
          >
            <UInput
              v-model="searchQuery"
              type="search"
              placeholder="Search journals..."
              size="md"
              class="w-full"
            >
              <template #leading>
                <button
                  type="submit"
                  aria-label="Search journals"
                  class="flex text-dimmed"
                >
                  <UIcon name="i-lucide-search" />
                </button>
              </template>
            </UInput>
          </form>
        </div>

        <div class="flex items-center gap-4">
          <NotificationDropdown />

          <DashboardProfileDropdown
            :display-name="displayName"
            :full-name="currentUser.user?.name"
            settings-path="/author/settings"
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
