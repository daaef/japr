<script setup lang="ts">
import type { EditorDashboardSummary } from '#shared/types/dashboard'
import { authClient } from '~~/lib/auth-client'
import { useDashboardNavigation } from '~/composables/useDashboardNavigation'

const { data: currentUser, refresh } = useCurrentUser()
const { dashboardLinkClass } = useDashboardNavigation()
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
        to="/editor"
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
                to="/editor"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/editor', true)"
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
                <span class="text">Manage Journals</span>
              </a>
              <ul class="sidebar-submenu">
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/submissions"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/submissions')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Pending Review
                      <span
                        v-if="summary.pendingQueue"
                        class="badge bg-warning ms-2"
                      >{{ summary.pendingQueue }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/under-peer-review"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/under-peer-review')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Under Peer Review
                      <span
                        v-if="summary.underPeerReview"
                        class="badge bg-info ms-2"
                      >{{ summary.underPeerReview }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/in-progress"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/in-progress')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      In Progress
                      <span
                        v-if="summary.inProgress"
                        class="badge bg-primary ms-2"
                      >{{ summary.inProgress }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/reviews"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/reviews')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Reviewed
                      <span
                        v-if="summary.reviewed"
                        class="badge bg-success ms-2"
                      >{{ summary.reviewed }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li
                  v-if="showReadyForNotice"
                  class="sidebar-submenu__item"
                >
                  <NuxtLink
                    to="/editor/ready-for-notice"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/ready-for-notice')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Ready for Notice
                      <span
                        v-if="summary.readyForNotice"
                        class="badge bg-main ms-2"
                      >{{ summary.readyForNotice }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/approved"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/approved')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Approved
                      <span
                        v-if="summary.approved"
                        class="badge bg-success ms-2"
                      >{{ summary.approved }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/published"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/published')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Published
                      <span
                        v-if="summary.published"
                        class="badge bg-success ms-2"
                      >{{ summary.published }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/revision-requested"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/revision-requested')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Revision Requested
                      <span
                        v-if="summary.changesRequested"
                        class="badge bg-warning ms-2"
                      >{{ summary.changesRequested }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/declined"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/declined')"
                  >
                    <span class="d-flex align-items-center justify-content-between w-100">
                      Declined
                      <span
                        v-if="summary.declined"
                        class="badge bg-danger ms-2"
                      >{{ summary.declined }}</span>
                    </span>
                  </NuxtLink>
                </li>
                <li class="sidebar-submenu__item">
                  <NuxtLink
                    to="/editor/copy-desk"
                    class="sidebar-submenu__link"
                    :class="dashboardLinkClass('/editor/copy-desk')"
                  >
                    <span class="d-flex align-items-center">Copy Desk</span>
                  </NuxtLink>
                </li>
              </ul>
            </li>

            <li class="sidebar-menu__item">
              <span class="text-gray-300 text-sm px-20 pt-20 fw-semibold border-top border-gray-100 d-block text-uppercase">Settings</span>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/editor/notifications"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/editor/notifications')"
              >
                <span class="icon"><i class="ph ph-bell" /></span>
                <span class="text">Notifications</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/editor/notifications/preferences"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/editor/notifications/preferences')"
              >
                <span class="icon"><i class="ph ph-sliders-horizontal" /></span>
                <span class="text">Notification Preferences</span>
              </NuxtLink>
            </li>

            <li class="sidebar-menu__item">
              <NuxtLink
                to="/editor/settings"
                class="sidebar-menu__link"
                :class="dashboardLinkClass('/editor/settings')"
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
      <div class="top-navbar flex-between gap-16 z-700">
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
            settings-path="/editor/settings"
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
