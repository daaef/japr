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
        class="mx-auto h-16"
        src="/images/japr-logo.png"
        alt="JAPR"
      >
      <h1 class="mt-7 font-serif text-[26px] leading-tight font-semibold text-highlighted">
        Reset link sent
      </h1>

      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-mail"
        class="mt-6 text-left"
        title="Check your email"
      >
        <template #description>
          If an account exists for <strong>{{ email || 'your email' }}</strong>, you will receive password reset instructions shortly.
        </template>
      </UAlert>

      <div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <UButton
          to="/auth/login"
          color="primary"
          size="lg"
        >
          Back to sign in
        </UButton>
        <UButton
          v-if="showMailViewer"
          :to="{ path: '/mail', query: email ? { to: email } : undefined }"
          color="neutral"
          variant="outline"
          size="lg"
        >
          View captured mail
        </UButton>
      </div>
    </div>
  </div>
</template>
