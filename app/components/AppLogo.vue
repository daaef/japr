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
        : 'border-primary-700/20 bg-primary-50 text-primary-800'"
    >
      <div
        class="grid size-8 place-items-center rounded-full border text-[0.7rem] font-bold tracking-[0.18em]"
        :class="variant === 'inverted'
          ? 'border-white/30 bg-white/10'
          : 'border-primary-700/25 bg-white'"
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
        :class="variant === 'inverted' ? 'text-white/70' : 'text-muted'"
      >
        Journal Of African Policy Review
      </p>
    </div>
  </div>
</template>
