<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'

const route = useRoute()
const searchQuery = ref('')
const { data: currentUser, refresh } = useCurrentUser()

const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

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
  title: 'JAPR Website | Dashboard',
  link: [
    { rel: 'stylesheet', href: '/assets/css/bootstrap.min.css' },
    { rel: 'stylesheet', href: '/assets/css/main.css' },
    { rel: 'stylesheet', href: '/assets/css/journal-dashboard-overrides.css' },
    { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.css' }
  ],
  script: [
    { src: '/assets/js/jquery-3.7.1.min.js', defer: true },
    { src: '/assets/js/boostrap.bundle.min.js', defer: true },
    { src: '/assets/js/phosphor-icon.js', defer: true },
    { src: '/assets/js/main.js', defer: true },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js', defer: true }
  ]
})
</script>

<template>
  <div class="dashboard-layout">
    <div class="preloader">
      <div class="loader" />
    </div>
    <div class="side-overlay" />

    <aside class="sidebar">
      <button
        type="button"
        class="sidebar-close-btn text-gray-500 hover-text-white hover-bg-main-600 text-md w-24 h-24 border border-gray-100 hover-border-main-600 d-xl-none d-flex flex-center rounded-circle position-absolute"
      >
        <i class="ph ph-x" />
      </button>

      <NuxtLink
        to="/author"
        class="sidebar__logo text-center p-20 position-sticky inset-block-start-0 bg-white w-100 z-1 pb-10"
      >
        <img
          class="w-25s"
          src="/images/japr-logo.png"
          alt="Logo"
        >
      </NuxtLink>

      <div class="sidebar-menu-wrapper overflow-y-auto scroll-sm">
        <div class="p-20 pt-10">
          <ul class="sidebar-menu">
            <li class="sidebar-menu__item">
              <NuxtLink
                to="/author"
                class="sidebar-menu__link"
                :class="{ active: isActive('/author') }"
              >
                <span class="icon"><i class="ph ph-squares-four" /></span>
                <span class="text">Dashboard</span>
              </NuxtLink>
            </li>
            <li class="sidebar-menu__item has-dropdown">
              <a
                href="javascript:void(0)"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-book-open" /></span>
                <span class="text">Manage Manuscripts</span>
              </a>
              <ul class="sidebar-submenu">
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/author/submit"
                    class="sidebar-submenu__link"
                  >
                    <span class="d-flex align-items-center">Submit Manuscript</span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/author/submissions"
                    class="sidebar-submenu__link"
                  >
                    <span class="d-flex align-items-center">My Submissions</span>
                  </NuxtLink>
                </li>
              </ul>
            </li>
            <li class="sidebar-menu__item">
              <NuxtLink
                to="/journals"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-graduation-cap" /></span>
                <span class="text">Categories</span>
              </NuxtLink>
            </li>
            <li class="sidebar-menu__item">
              <NuxtLink
                to="/author/collections"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-bookmark-simple" /></span>
                <span class="text">My Collections</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <span class="text-gray-300 text-sm px-20 pt-20 fw-semibold border-top border-gray-100 d-block text-uppercase">Settings</span>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/notifications"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-bell" /></span>
                <span class="text">Notifications</span>
              </NuxtLink>
            </li>
            <li class="sidebar-menu__item">
              <NuxtLink
                to="/notifications/preferences"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-sliders-horizontal" /></span>
                <span class="text">Notification Preferences</span>
              </NuxtLink>
            </li>
            <li class="sidebar-menu__item">
              <NuxtLink
                to="/author/interests"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-target" /></span>
                <span class="text">Research Interests</span>
              </NuxtLink>
            </li>
            <li class="sidebar-menu__item">
              <NuxtLink
                to="/author/settings"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-gear" /></span>
                <span class="text">Account Settings</span>
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </aside>

    <div class="dashboard-main-wrapper">
      <div class="top-navbar flex-between gap-16">
        <div class="flex-align gap-16">
          <button
            type="button"
            class="toggle-btn d-xl-none d-flex text-26 text-gray-500"
          >
            <i class="ph ph-list" />
          </button>

          <form
            class="w-350 d-sm-block d-none"
            @submit.prevent="submitSearch"
          >
            <div class="position-relative">
              <button
                type="submit"
                class="input-icon text-xl d-flex text-gray-100"
                aria-label="Search journals"
              >
                <i class="ph ph-magnifying-glass" />
              </button>
              <input
                v-model="searchQuery"
                type="search"
                class="form-control ps-40 h-40 border-transparent focus-border-main-600 bg-main-50 rounded-pill placeholder-15"
                placeholder="Search journals..."
              >
            </div>
          </form>
        </div>

        <div class="flex-align gap-16">
          <NotificationDropdown />

          <DashboardProfileDropdown
            :display-name="displayName"
            :full-name="currentUser.user?.name"
            settings-path="/author/settings"
            @sign-out="signOut"
          />
        </div>
      </div>

      <div class="dashboard-body">
        <slot />
      </div>

      <div class="dashboard-footer">
        <div class="flex-between justify-center flex-wrap gap-16">
          <p class="text-gray-300 text-13 fw-normal">
            &copy; Copyright {{ new Date().getFullYear() }}, All Right Reserved
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
