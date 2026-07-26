<script setup lang="ts">
const config = useRuntimeConfig()
const title = `${config.public.appName} | Gateway to African Knowledge`

// Product is light-only (see colorMode pin in nuxt.config.ts). @nuxtjs/color-mode reads any
// already-stored localStorage preference ahead of that config default, so visitors who loaded
// the site before the pin shipped (when the module's own default was 'system') can be stuck
// replaying their OS dark theme forever — the module's own hydration-time correction re-derives
// `value` from that stale storage read *after* setup runs, so a one-time fix-up here loses the
// race. Watching `.value` instead reacts to whatever the module (or anything else) sets it to,
// whenever it happens, and snaps it back — no dependency on hook/flush ordering.
if (import.meta.client) {
  const colorMode = useColorMode()
  watch(() => colorMode.value, (value) => {
    if (value !== 'light') {
      colorMode.preference = 'light'
    }
  }, { immediate: true })
}

useHead({
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'color-scheme', content: 'light' }
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
