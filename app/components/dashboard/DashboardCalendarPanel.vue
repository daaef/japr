<script setup lang="ts">
const now = new Date()

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now)
const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(now)
const dayNumber = new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(now)
</script>

<template>
  <UCard>
    <div class="text-center">
      <p class="text-xs text-muted mb-1">
        {{ monthName }}
      </p>
      <h3 class="text-3xl font-semibold text-highlighted mb-1">
        {{ dayNumber }}
      </h3>
      <p class="text-muted mb-0">
        {{ dayName }}
      </p>
    </div>
  </UCard>
</template>
