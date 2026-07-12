<script setup lang="ts">
defineProps<{
  image: string
  quote?: string
}>()
</script>

<template>
  <div class="relative hidden w-full flex-1 lg:block">
    <img
      class="absolute inset-0 h-full w-full object-cover"
      :src="image"
      alt=""
    >
    <div class="absolute inset-0 bg-gradient-to-b from-primary-950/0 from-40% to-primary-950/60" />
    <p
      v-if="quote"
      class="absolute inset-x-10 bottom-10 font-serif text-xl font-semibold text-white italic"
    >
      "{{ quote }}"
    </p>
  </div>
</template>
