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
      <h1 class="mt-8 text-2xl font-bold text-highlighted">
        Password updated
      </h1>
      <p class="mt-4 text-sm text-muted">
        Your password has been reset successfully. You can sign in with your new credentials.
      </p>
      <UButton
        to="/auth/login"
        color="primary"
        size="lg"
        class="mt-8"
      >
        Sign in
      </UButton>
    </div>
  </div>
</template>
