<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const searchQuery = ref('')
const { data: currentUser, refresh } = useCurrentUser()
const { isExactPath, isActivePath } = useDashboardNavigation()

const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

// Flat top-nav (JAPR Author Dashboard.dc.html) has no sub-menus, so these link
// classes are simpler than useDashboardNavigation()'s rounded-pill/dark-sidebar
// shapes — kept local rather than adding a third one-off variant to the composable.
function navLinkClass(path: string, exact = false) {
  const active = exact ? isExactPath(path) : isActivePath(path)
  return active
    ? 'text-brick-500 font-bold'
    : 'text-taupe-600 font-semibold hover:text-brick-500'
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

const mobileNavOpen = ref(false)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-taupe-50">
    <header class="sticky top-0 z-30 border-b border-taupe-200 bg-white">
      <div class="mx-auto flex max-w-285 items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-8">
          <NuxtLink to="/author">
            <img
              class="h-10 w-auto"
              src="/images/japr-logo.png"
              alt="JAPR"
            >
          </NuxtLink>

          <nav class="hidden items-center gap-6 lg:flex">
            <NuxtLink
              to="/author"
              class="text-sm transition-colors"
              :class="navLinkClass('/author', true)"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/author/submissions"
              class="text-sm transition-colors"
              :class="navLinkClass('/author/submissions')"
            >
              My Manuscripts
            </NuxtLink>
            <NuxtLink
              to="/author/collections"
              class="text-sm transition-colors"
              :class="navLinkClass('/author/collections')"
            >
              Collections
            </NuxtLink>
            <NuxtLink
              to="/author/settings"
              class="text-sm transition-colors"
              :class="navLinkClass('/author/settings')"
            >
              Settings
            </NuxtLink>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <form
            class="hidden w-56 xl:block"
            @submit.prevent="submitSearch"
          >
            <UInput
              v-model="searchQuery"
              type="search"
              placeholder="Search journals..."
              size="sm"
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

          <NotificationDropdown />

          <UButton
            to="/author/submit"
            color="primary"
            class="hidden rounded-full sm:inline-flex"
          >
            Submit Manuscript
          </UButton>

          <DashboardProfileDropdown
            :display-name="displayName"
            :full-name="currentUser.user?.name"
            settings-path="/author/settings"
            @sign-out="signOut"
          />

          <UButton
            icon="i-lucide-menu"
            color="neutral"
            variant="ghost"
            class="lg:hidden"
            aria-label="Open navigation"
            @click="mobileNavOpen = !mobileNavOpen"
          />
        </div>
      </div>

      <nav
        v-if="mobileNavOpen"
        class="flex flex-col gap-1 border-t border-taupe-200 px-4 py-3 lg:hidden"
      >
        <NuxtLink
          to="/author"
          class="rounded-lg px-3 py-2 text-sm transition-colors"
          :class="navLinkClass('/author', true)"
          @click="mobileNavOpen = false"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink
          to="/author/submissions"
          class="rounded-lg px-3 py-2 text-sm transition-colors"
          :class="navLinkClass('/author/submissions')"
          @click="mobileNavOpen = false"
        >
          My Manuscripts
        </NuxtLink>
        <NuxtLink
          to="/author/collections"
          class="rounded-lg px-3 py-2 text-sm transition-colors"
          :class="navLinkClass('/author/collections')"
          @click="mobileNavOpen = false"
        >
          Collections
        </NuxtLink>
        <NuxtLink
          to="/author/settings"
          class="rounded-lg px-3 py-2 text-sm transition-colors"
          :class="navLinkClass('/author/settings')"
          @click="mobileNavOpen = false"
        >
          Settings
        </NuxtLink>
        <NuxtLink
          to="/author/submit"
          class="mt-2 rounded-lg bg-brick-500 px-3 py-2 text-center text-sm font-semibold text-white"
          @click="mobileNavOpen = false"
        >
          Submit Manuscript
        </NuxtLink>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-285 flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>

    <div class="mt-auto flex justify-center bg-white px-5 py-5">
      <p class="text-xs text-taupe-400">
        &copy; Copyright {{ new Date().getFullYear() }}, All Right Reserved
      </p>
    </div>
  </div>
</template>
