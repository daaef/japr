<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const route = useRoute()
const config = useRuntimeConfig()
const showMailViewer = computed(() => config.public.enableMailViewer === true)
const email = computed(() => typeof route.query.email === 'string' ? route.query.email : '')
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4">
    <div class="max-w-md text-center">
      <img
        class="mx-auto h-20"
        src="/images/japr-logo.png"
        alt="JAPR"
      >
      <h1 class="mt-8 text-2xl font-bold text-gray-900">
        Reset link sent
      </h1>
      <p class="mt-4 text-sm text-gray-600">
        If an account exists for <strong>{{ email || 'your email' }}</strong>, you will receive password reset instructions shortly.
      </p>
      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <NuxtLink
          to="/auth/login"
          class="btn btn-primary inline-flex"
        >
          Back to sign in
        </NuxtLink>
        <NuxtLink
          v-if="showMailViewer"
          :to="{ path: '/mail', query: email ? { to: email } : undefined }"
          class="inline-flex items-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700"
        >
          View captured mail
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
