<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'inverted'
}>(), {
  variant: 'default'
})
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      class="grid size-11 place-items-center rounded-full border shadow-sm"
      :class="variant === 'inverted'
        ? 'border-white/25 bg-white/10 text-white'
        : 'border-orange-700/20 bg-orange-50 text-orange-800'"
    >
      <div
        class="grid size-8 place-items-center rounded-full border text-[0.7rem] font-bold tracking-[0.18em]"
        :class="variant === 'inverted'
          ? 'border-white/30 bg-white/10'
          : 'border-orange-700/25 bg-white'"
      >
        JA
      </div>
    </div>
    <div class="leading-tight">
      <p
        class="journal-title text-lg font-semibold"
        :class="variant === 'inverted' ? 'text-white' : 'text-toned'"
      >
        JAPR
      </p>
      <p
        class="text-xs uppercase tracking-[0.22em]"
        :class="variant === 'inverted' ? 'text-orange-100/80' : 'text-muted'"
      >
        Journal Of African Policy Review
      </p>
    </div>
  </div>
</template>
