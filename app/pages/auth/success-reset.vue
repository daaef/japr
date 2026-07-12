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
        class="mx-auto h-16"
        src="/images/japr-logo.png"
        alt="JAPR"
      >
      <h1 class="mt-7 font-serif text-[26px] leading-tight font-semibold text-highlighted">
        Password updated
      </h1>

      <UAlert
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        class="mt-6 text-left"
        description="Your password has been changed. You can now sign in with your new password."
      />

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
