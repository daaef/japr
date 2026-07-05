<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClass } = useDashboardNavigation()

const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

useHead({
  title: 'JAPR Website | Dashboard',
  link: [
    { rel: 'stylesheet', href: '/assets/css/bootstrap.min.css' },
    { rel: 'stylesheet', href: '/assets/css/main.css' },
    { rel: 'stylesheet', href: '/assets/css/journal-dashboard-overrides.css' }
  ],
  script: [
    { src: '/assets/js/jquery-3.7.1.min.js', defer: true },
    { src: '/assets/js/boostrap.bundle.min.js', defer: true },
    { src: '/assets/js/phosphor-icon.js', defer: true },
    { src: '/assets/js/main.js', defer: true }
  ]
})

async function signOut() {
  await authClient.signOut()
  await refresh()
  await navigateTo('/')
}

// Mail viewer link when NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true (server enforces the same flag).
const config = useRuntimeConfig()
const showDevMail = computed(() => config.public.enableMailViewer === true)
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
        to="/admin"
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
                to="/admin"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/admin', true)"
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
                <span class="icon"><i class="ph ph-graduation-cap" /></span>
                <span class="text">Manage Categories</span>
              </a>
              <ul class="sidebar-submenu">
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/admin/categories"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/admin/categories')"
                  >
                    Categories
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/admin/categories#subcategories"
                    class="sidebar-submenu__link"
                  >
                    Sub Categories
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/admin/categories#sub-subcategories"
                    class="sidebar-submenu__link"
                  >
                    Sub Subcategories
                  </NuxtLink>
                </li>
              </ul>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/admin/journals"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/admin/journals')"
              >
                <span class="icon"><i class="ph ph-books" /></span>
                <span class="text">Manage Journals</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/admin/audit/dashboard"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/admin/audit')"
              >
                <span class="icon"><i class="ph ph-clipboard-text" /></span>
                <span class="text">Audit Logs</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <span class="text-gray-300 text-sm px-20 pt-20 fw-semibold border-top border-gray-100 d-block text-uppercase">Settings</span>
            </li>

            <li class="sidebar-menu__item has-dropdown">
              <a
                href="javascript:void(0)"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-shield-check" /></span>
                <span class="text">Roles and Permissions</span>
              </a>
              <ul class="sidebar-submenu">
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/admin/roles"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/admin/roles')"
                  >
                    Manage Roles
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/admin/permissions"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/admin/permissions')"
                  >
                    Manage Permissions
                  </NuxtLink>
                </li>
              </ul>
            </li>

            <li class="sidebar-menu__item has-dropdown">
              <a
                href="javascript:void(0)"
                class="sidebar-menu__link"
              >
                <span class="icon"><i class="ph ph-users-three" /></span>
                <span class="text">Manage Users</span>
              </a>
              <ul class="sidebar-submenu">
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/admin/users"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/admin/users')"
                  >
                    Users
                  </NuxtLink>
                </li>
              </ul>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/admin/notifications"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/admin/notifications')"
              >
                <span class="icon"><i class="ph ph-bell" /></span>
                <span class="text">Notifications</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/admin/notifications/preferences"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/admin/notifications/preferences')"
              >
                <span class="icon"><i class="ph ph-sliders-horizontal" /></span>
                <span class="text">Notification Preferences</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/admin/settings"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/admin/settings')"
              >
                <span class="icon"><i class="ph ph-gear" /></span>
                <span class="text">Account Settings</span>
              </NuxtLink>
            </li>

            <li v-if="showDevMail" class="sidebar-menu__item">
              <NuxtLink
                to="/mail"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/mail')"
              >
                <span class="icon"><i class="ph ph-envelope-simple" /></span>
                <span class="text">Mail Inbox</span>
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
        </div>

        <div class="flex-align gap-16">
          <NotificationDropdown />

          <DashboardProfileDropdown
            :display-name="displayName"
            :full-name="currentUser.user?.name"
            settings-path="/admin/settings"
            @sign-out="signOut"
          />
        </div>
      </div>

      <div class="dashboard-body">
        <slot />
      </div>

      <div class="dashboard-footer">
        <div class="flex-between flex-wrap gap-16">
          <p class="text-gray-300 text-13 fw-normal">
            &copy; Copyright {{ new Date().getFullYear() }}, All Right Reserved
          </p>
          <div class="flex-align flex-wrap gap-16">
            <a
              href="#"
              class="text-gray-300 text-13 fw-normal hover-text-main-600 hover-text-decoration-underline"
            >Documentation</a>
            <a
              href="#"
              class="text-gray-300 text-13 fw-normal hover-text-main-600 hover-text-decoration-underline"
            >Support</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
