<script setup lang="ts">
useHead({
  link: [],
  script: [
    { src: '/assets/js/jquery-3.7.1.min.js', defer: true }
  ]
})
</script>

<template>
  <div class="journal-site min-h-screen bg-white">
    <slot />
  </div>
</template>
