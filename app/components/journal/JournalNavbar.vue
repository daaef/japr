<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { resolveWorkspacePath } from '~/utils/workspace'

const route = useRoute()
const config = useRuntimeConfig()
const { data: currentUser, refresh } = useCurrentUser()

const showMailViewer = computed(() => config.public.enableMailViewer === true)

const roles = computed(() => currentUser.value?.roles ?? [])
const authenticated = computed(() => currentUser.value?.authenticated ?? false)
const workspacePath = computed(() =>
  resolveWorkspacePath(roles.value, { hasInterests: currentUser.value?.hasInterests })
)
const displayName = computed(() => {
  const name = currentUser.value?.user?.name?.trim() ?? ''
  return name.split(/\s+/)[0] ?? ''
})

function hasRole(role: string) {
  return roles.value.includes(role)
}

function hasAnyRole(checks: string[]) {
  return checks.some(role => roles.value.includes(role))
}

function navClass(active: boolean, base = 'text-gray-900 font-medium') {
  return active ? 'text-primary-500 font-bold' : base
}

async function signOut() {
  await authClient.signOut()
  await refresh()
  await refreshNuxtData('current-user')
  await navigateTo('/')
}

const mobileMenuOpen = ref(false)
</script>

<template>
  <header class="flex flex-wrap sm:justify-start h-[80px] sm:flex-nowrap w-full fixed z-[2000] bg-white text-sm py-3">
    <nav class="container w-full mx-auto px-4 flex flex-wrap basis-full items-center justify-between relative">
      <div class="flex gap-5 items-center">
        <NuxtLink
          class="flex-none text-xl lg:static lg:translate-y-0 absolute top-[30px] left-[20px] translate-y-[-50%] font-semibold focus:outline-none focus:opacity-80"
          to="/"
        >
          <img
            class="h-14"
            src="/images/japr-logo.png"
            alt="japr logo"
          >
        </NuxtLink>
        <div
          id="navbar-alignment"
          class="overflow-hidden top-[80px] transition-all duration-300 basis-full grow lg:grow-0 lg:basis-auto lg:static lg:px-0 px-[20px] max-[1023px]:container max-[1023px]:translate-x-[-50%] max-[1023px]:left-[50%] py-[20px] fixed left-0 bg-white w-full lg:block"
          :class="mobileMenuOpen ? 'block' : 'hidden'"
          aria-labelledby="navbar-alignment-toggle"
        >
          <div class="flex flex-col gap-5 mt-5 lg:flex-row lg:items-center lg:mt-0 lg:ps-5">
            <NuxtLink
              class="focus:outline-none"
              :class="navClass(route.path === '/')"
              to="/"
              aria-current="page"
            >
              Home
            </NuxtLink>

            <NuxtLink
              class="hover:text-gray-400 focus:outline-none focus:text-gray-400"
              :class="navClass(route.path.startsWith('/editorial'))"
              to="/editorial"
            >
              Editorial Board
            </NuxtLink>
            <NuxtLink
              class="hover:text-gray-400 focus:outline-none focus:text-gray-400"
              :class="navClass(route.path === '/journals' || route.path.startsWith('/journals/'))"
              to="/journals"
            >
              Journals
            </NuxtLink>

            <NuxtLink
              v-if="showMailViewer"
              class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
              :class="navClass(route.path.startsWith('/mail'))"
              to="/mail"
            >
              Mail
            </NuxtLink>

            <template v-if="authenticated">
              <NuxtLink
                class="font-bold lg:hidden text-gray-100 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/author/submit"
              >
                Submit Manuscript
              </NuxtLink>
              <NuxtLink
                v-if="hasRole('admin')"
                class="font-bold lg:hidden text-gray-100 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/admin"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                v-if="hasAnyRole(['editor_in_chief', 'managing_editor'])"
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/editor"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                v-if="hasRole('copy_desk_editor')"
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/editor/copy-desk"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                v-if="hasAnyRole(['associate_editor', 'desk_editor', 'external_reviewer'])"
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/reviewer"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                v-if="hasRole('author')"
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                :to="workspacePath"
              >
                Dashboard
              </NuxtLink>
              <NuxtLink
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/author/settings"
              >
                Settings
              </NuxtLink>
            </template>
            <template v-else>
              <NuxtLink
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/auth/login"
              >
                Submit Manuscript
              </NuxtLink>
              <NuxtLink
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/auth/login"
              >
                Login
              </NuxtLink>
              <NuxtLink
                class="font-bold lg:hidden text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
                to="/auth/register"
              >
                Register
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-x-2">
        <NuxtLink
          v-if="showMailViewer"
          class="py-2 hidden px-5 lg:inline-flex items-center gap-x-2 text-sm font-medium rounded-[15px] border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          to="/mail"
        >
          <svg
            class="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          Mail
        </NuxtLink>
        <template v-if="authenticated">
          <NuxtLink
            class="py-2 hidden px-6 lg:inline-flex items-center gap-x-2 text-sm font-medium rounded-[15px] border border-transparent bg-secondary-800 text-white hover:bg-primary-900 focus:outline-none mr-4 focus:bg-secondary-950 disabled:opacity-50 disabled:pointer-events-none"
            to="/author/submit"
          >
            Submit Manuscript
          </NuxtLink>
          <UPopover class="pr-[40px]">
            <template #default="{ open }">
              <button
                type="button"
                class="flex items-center w-full text-gray-600 hover:text-gray-400 focus:outline-none focus:text-gray-400 font-medium"
                aria-label="Account menu"
              >
                {{ displayName }}
                <UIcon
                  name="i-lucide-chevron-down"
                  class="duration-300 ms-1 shrink-0 size-4 transition-transform"
                  :class="{ 'rotate-180': open }"
                />
              </button>
            </template>

            <template #content="{ close }">
              <div
                class="w-48 rounded-lg border border-gray-100 bg-white p-1 shadow-md"
                role="menu"
                aria-orientation="vertical"
              >
                <NuxtLink
                  v-if="hasRole('admin')"
                  class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :class="navClass(route.path.startsWith('/admin'), 'text-gray-800 font-medium')"
                  to="/admin"
                  @click="close"
                >
                  Dashboard
                </NuxtLink>
                <NuxtLink
                  v-if="hasAnyRole(['editor_in_chief', 'managing_editor'])"
                  class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :class="navClass(route.path.startsWith('/editor'), 'text-gray-800 font-medium')"
                  to="/editor"
                  @click="close"
                >
                  Dashboard
                </NuxtLink>
                <NuxtLink
                  v-if="hasRole('copy_desk_editor')"
                  class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :class="navClass(route.path.startsWith('/editor/copy-desk'), 'text-gray-800 font-medium')"
                  to="/editor/copy-desk"
                  @click="close"
                >
                  Copy Desk
                </NuxtLink>
                <NuxtLink
                  v-if="hasRole('author')"
                  class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :class="navClass(route.path.startsWith('/author') && route.path !== '/author/settings', 'text-gray-800 font-medium')"
                  :to="workspacePath"
                  @click="close"
                >
                  Dashboard
                </NuxtLink>
                <NuxtLink
                  v-if="hasRole('author')"
                  class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :class="navClass(route.path === '/author/settings', 'font-medium')"
                  to="/author/settings"
                  @click="close"
                >
                  Profile
                </NuxtLink>
                <NuxtLink
                  v-if="hasAnyRole(['associate_editor', 'desk_editor', 'external_reviewer'])"
                  class="flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :class="navClass(route.path.startsWith('/reviewer'), 'text-gray-800 font-medium')"
                  to="/reviewer"
                  @click="close"
                >
                  Dashboard
                </NuxtLink>
              </div>
            </template>
          </UPopover>
          <button
            type="button"
            class="py-2 hidden px-6 lg:inline-flex items-center gap-x-2 text-sm font-medium text-gray-900 hover:text-gray-400 focus:outline-none focus:text-gray-400"
            @click="signOut"
          >
            Logout
          </button>
        </template>
        <template v-else>
          <NuxtLink
            class="py-2 hidden px-6 lg:inline-flex items-center gap-x-2 text-sm font-medium rounded-[15px] border border-transparent bg-secondary-800 text-white hover:bg-primary-900 focus:outline-none focus:bg-secondary-950 disabled:opacity-50 disabled:pointer-events-none"
            to="/auth/login"
          >
            Submit Manuscript
          </NuxtLink>
          <NuxtLink
            to="/auth/login"
            class="py-2 px-6 hidden lg:inline-flex items-center gap-x-2 text-sm font-medium rounded-[15px] border border-primary-500 text-primary-500 hover:border-primary-600 hover:text-primary-600 focus:outline-none focus:border-primary-600 focus:text-primary-600 disabled:opacity-50 disabled:pointer-events-none"
          >
            Login
          </NuxtLink>
          <NuxtLink
            to="/auth/register"
            class="py-2 hidden px-6 lg:inline-flex items-center gap-x-2 text-sm font-medium rounded-[15px] border border-transparent bg-primary-500 text-white hover:bg-primary-600 focus:outline-none focus:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            Register
          </NuxtLink>
        </template>
        <button
          id="navbar-alignment-toggle"
          type="button"
          class="lg:hidden absolute top-[30px] right-[20px] translate-y-[-50%] size-7 flex justify-center items-center gap-x-2 rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
          :aria-expanded="mobileMenuOpen"
          aria-controls="navbar-alignment"
          aria-label="Toggle navigation"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <UIcon
            :name="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            class="shrink-0 size-4"
          />
          <span class="sr-only">Toggle</span>
        </button>
      </div>
    </nav>
  </header>
</template>
