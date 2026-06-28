<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const route = useRoute()
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
      <NuxtLink
        to="/auth/login"
        class="btn btn-primary mt-8 inline-flex"
      >
        Back to sign in
      </NuxtLink>
    </div>
  </div>
</template>
