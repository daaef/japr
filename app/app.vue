<script setup lang="ts">
const config = useRuntimeConfig()
const title = `${config.public.appName} | Gateway to African Knowledge`

useHead({
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  titleTemplate: '%s',
  title,
  description: config.public.appDescription,
  ogTitle: title,
  ogDescription: config.public.appDescription,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
