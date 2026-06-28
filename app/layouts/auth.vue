<script setup lang="ts">
useHead({
  link: [
    { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.css' }
  ],
  script: [
    { src: '/assets/js/jquery-3.7.1.min.js', defer: true },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js', defer: true }
  ]
})
</script>

<template>
  <div class="journal-site min-h-screen bg-white">
    <slot />
  </div>
</template>
