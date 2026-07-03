<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'
import { resolveWorkspacePath } from '~/utils/workspace'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const route = useRoute()
const { data: currentUser, refresh } = useCurrentUser()

const form = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)

const activated = computed(() => route.query.activated === '1')

async function redirectToActivation(email: string) {
  try {
    await $fetch('/api/auth/resend-activation', {
      method: 'POST',
      body: { email }
    })
  } catch {
    // Activation page still works if resend fails.
  }

  await navigateTo({
    path: '/auth/activate',
    query: { email, resent: '1' }
  })
}

async function signInWithGoogle() {
  errorMessage.value = ''
  loading.value = true

  // With no explicit redirect target, land back on this page: the `guest` middleware
  // (already applied to this page) sends an authenticated user to resolveWorkspacePath(...)
  // itself, so a brand-new Google author with no interests correctly lands on
  // /author/interests instead of a hardcoded /author.
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : '/auth/login'

  try {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirect
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google sign-in is unavailable.'
    if (message.toLowerCase().includes('activate')) {
      await redirectToActivation(form.email)
      return
    }
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

async function submit() {
  errorMessage.value = ''
  loading.value = true

  try {
    const { error } = await authClient.signIn.email({
      email: form.email,
      password: form.password
    })

    if (error) {
      const message = error.message || 'Unable to sign in.'
      if (message.toLowerCase().includes('activate')) {
        await redirectToActivation(form.email)
        return
      }
      errorMessage.value = message
      return
    }

    await refresh()
    await refreshNuxtData('current-user')

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (redirect?.startsWith('/api/')) {
      await navigateTo(redirect, { external: true })
      return
    }
    if (redirect?.startsWith('/')) {
      await navigateTo(redirect)
      return
    }

    await navigateTo(resolveWorkspacePath(currentUser.value.roles, {
      hasInterests: currentUser.value.hasInterests
    }))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <header class="lg:grid grid-cols-2 min-h-screen">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <div>
          <img
            class="h-20 w-auto"
            src="/images/japr-logo.png"
            alt="JAPR"
          >
          <h2 class="mt-8 text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Welcome back!
          </h2>
        </div>

        <div
          v-if="activated"
          class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          Account activated. You can sign in now.
        </div>

        <form
          class="mt-6 space-y-6"
          @submit.prevent="submit"
        >
          <div>
            <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email address</label>
            <div class="mt-2">
              <input
                id="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                class="block w-full bg-[#F9FAFB] rounded-md border-0 px-3 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              >
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium leading-6 text-gray-900">Password</label>
            <div class="mt-2 relative">
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••••"
                class="block w-full bg-[#F9FAFB] rounded-md border-0 px-3 py-1.5 pr-10 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
              >
              <button
                type="button"
                class="absolute inset-y-0 end-0 flex items-center px-3 text-gray-400"
                @click="showPassword = !showPassword"
              >
                <i class="ph" :class="showPassword ? 'ph-eye-slash' : 'ph-eye'" />
              </button>
            </div>
          </div>

          <div class="text-sm leading-6">
            <NuxtLink
              to="/auth/forgot-password"
              class="font-semibold text-secondary-900 hover:text-secondary-700"
            >
              Forgot password?
            </NuxtLink>
          </div>

          <div
            v-if="errorMessage"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="flex w-full justify-center rounded-md bg-secondary-900 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-secondary-700 disabled:opacity-50"
            :disabled="loading"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>

          <button
            type="button"
            class="flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            :disabled="loading"
            @click="signInWithGoogle"
          >
            Continue with Google
          </button>

          <p class="text-center text-sm text-gray-600">
            Don't have an account yet?
            <NuxtLink
              to="/auth/register"
              class="text-secondary-900 font-medium hover:underline"
            >
              Sign up here
            </NuxtLink>
          </p>
        </form>
      </div>
    </div>
    <div class="relative hidden w-full flex-1 lg:block">
      <img
        class="absolute inset-0 h-full w-full object-cover"
        src="/images/loginImg.png"
        alt=""
      >
    </div>
  </header>
</template>
