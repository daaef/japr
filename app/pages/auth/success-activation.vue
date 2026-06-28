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
        Check your email
      </h1>
      <p class="mt-4 text-sm text-gray-600">
        We sent a six-digit activation code to your inbox. Enter it on the activation page to complete registration.
      </p>
      <NuxtLink
        to="/auth/activate"
        class="btn btn-primary mt-8 inline-flex"
      >
        Enter activation code
      </NuxtLink>
    </div>
  </div>
</template>
