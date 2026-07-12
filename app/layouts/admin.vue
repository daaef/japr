<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClassDark, dashboardSubLinkClassDark, linkClassDark, useSidebarGroup } = useDashboardNavigation()

const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

useHead({
  title: 'JAPR Website | Dashboard'
})

async function signOut() {
  await authClient.signOut()
  await refresh()
  await navigateTo('/')
}

// Mail viewer link when NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true (server enforces the same flag).
const config = useRuntimeConfig()
const showDevMail = computed(() => config.public.enableMailViewer === true)

const sidebarOpen = ref(false)
function openSidebar() {
  sidebarOpen.value = true
}
function closeSidebar() {
  sidebarOpen.value = false
}

const categoriesGroup = useSidebarGroup(['/admin/categories'])
const rolesGroup = useSidebarGroup(['/admin/roles', '/admin/permissions'])
const usersGroup = useSidebarGroup(['/admin/users'])
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
        to="/admin"
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
            Admin Workspace
          </p>
        </div>
      </NuxtLink>

      <nav class="flex-1 overflow-y-auto px-4 pb-6">
        <ul class="flex flex-col gap-3">
          <li>
            <NuxtLink
              to="/admin"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin', true)"
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
              :class="linkClassDark(categoriesGroup.isGroupActive)"
              :aria-expanded="categoriesGroup.open"
              @click="categoriesGroup.toggle"
            >
              <UIcon
                name="i-lucide-graduation-cap"
                class="text-xl"
              />
              <span>Manage Categories</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="ms-auto shrink-0 transition-transform duration-200"
                :class="{ 'rotate-90': categoriesGroup.open }"
              />
            </button>
            <ul
              v-show="categoriesGroup.open"
              class="ms-6 mt-3 flex flex-col gap-3 border-s border-white/10 ps-4"
            >
              <li>
                <NuxtLink
                  to="/admin/categories"
                  class="block text-sm"
                  :class="dashboardSubLinkClassDark('/admin/categories')"
                >
                  Categories
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/admin/categories#subcategories"
                  class="block text-sm text-brick-300 hover:text-white"
                >
                  Sub Categories
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/admin/categories#sub-subcategories"
                  class="block text-sm text-brick-300 hover:text-white"
                >
                  Sub Subcategories
                </NuxtLink>
              </li>
            </ul>
          </li>

          <li>
            <NuxtLink
              to="/admin/journals"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/journals')"
            >
              <UIcon
                name="i-lucide-library"
                class="text-xl"
              />
              <span>Manage Journals</span>
            </NuxtLink>
          </li>

          <li>
            <NuxtLink
              to="/admin/audit/dashboard"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/audit')"
            >
              <UIcon
                name="i-lucide-clipboard-list"
                class="text-xl"
              />
              <span>Audit Logs</span>
            </NuxtLink>
          </li>

          <li class="border-t border-white/10 pt-5">
            <span class="block px-4 text-xs font-semibold uppercase tracking-wide text-marigold-300">Settings</span>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-start capitalize transition-colors"
              :class="linkClassDark(rolesGroup.isGroupActive)"
              :aria-expanded="rolesGroup.open"
              @click="rolesGroup.toggle"
            >
              <UIcon
                name="i-lucide-shield-check"
                class="text-xl"
              />
              <span>Roles and Permissions</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="ms-auto shrink-0 transition-transform duration-200"
                :class="{ 'rotate-90': rolesGroup.open }"
              />
            </button>
            <ul
              v-show="rolesGroup.open"
              class="ms-6 mt-3 flex flex-col gap-3 border-s border-white/10 ps-4"
            >
              <li>
                <NuxtLink
                  to="/admin/roles"
                  class="block text-sm"
                  :class="dashboardSubLinkClassDark('/admin/roles')"
                >
                  Manage Roles
                </NuxtLink>
              </li>
              <li>
                <NuxtLink
                  to="/admin/permissions"
                  class="block text-sm"
                  :class="dashboardSubLinkClassDark('/admin/permissions')"
                >
                  Manage Permissions
                </NuxtLink>
              </li>
            </ul>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-start capitalize transition-colors"
              :class="linkClassDark(usersGroup.isGroupActive)"
              :aria-expanded="usersGroup.open"
              @click="usersGroup.toggle"
            >
              <UIcon
                name="i-lucide-users"
                class="text-xl"
              />
              <span>Manage Users</span>
              <UIcon
                name="i-lucide-chevron-right"
                class="ms-auto shrink-0 transition-transform duration-200"
                :class="{ 'rotate-90': usersGroup.open }"
              />
            </button>
            <ul
              v-show="usersGroup.open"
              class="ms-6 mt-3 flex flex-col gap-3 border-s border-white/10 ps-4"
            >
              <li>
                <NuxtLink
                  to="/admin/users"
                  class="block text-sm"
                  :class="dashboardSubLinkClassDark('/admin/users')"
                >
                  Users
                </NuxtLink>
              </li>
            </ul>
          </li>

          <li>
            <NuxtLink
              to="/admin/notifications"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/notifications')"
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
              to="/admin/notifications/preferences"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/notifications/preferences')"
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
              to="/admin/settings"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/admin/settings')"
            >
              <UIcon
                name="i-lucide-settings"
                class="text-xl"
              />
              <span>Account Settings</span>
            </NuxtLink>
          </li>

          <li v-if="showDevMail">
            <NuxtLink
              to="/mail"
              class="flex items-center gap-2 rounded-lg px-4 py-2 capitalize transition-colors"
              :class="dashboardLinkClassDark('/mail')"
            >
              <UIcon
                name="i-lucide-mail"
                class="text-xl"
              />
              <span>Mail Inbox</span>
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
            settings-path="/admin/settings"
            @sign-out="signOut"
          />
        </div>
      </div>

      <main class="flex-1 px-4 py-6 sm:px-6">
        <slot />
      </main>

      <div class="mt-auto flex flex-wrap items-center justify-between gap-4 rounded-t-2xl bg-default px-5 py-5 sm:px-6">
        <p class="text-xs text-dimmed">
          &copy; Copyright {{ new Date().getFullYear() }}, All Right Reserved
        </p>
        <div class="flex flex-wrap items-center gap-4">
          <a
            href="#"
            class="text-xs text-dimmed hover:text-primary hover:underline"
          >Documentation</a>
          <a
            href="#"
            class="text-xs text-dimmed hover:text-primary hover:underline"
          >Support</a>
        </div>
      </div>
    </div>
  </div>
</template>
