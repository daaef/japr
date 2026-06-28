<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})
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
        Password updated
      </h1>
      <p class="mt-4 text-sm text-gray-600">
        Your password has been reset successfully. You can sign in with your new credentials.
      </p>
      <NuxtLink
        to="/auth/login"
        class="btn btn-primary mt-8 inline-flex"
      >
        Sign in
      </NuxtLink>
    </div>
  </div>
</template>
