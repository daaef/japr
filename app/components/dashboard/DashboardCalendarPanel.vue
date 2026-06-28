<script setup lang="ts">
const now = new Date()

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(now)
const dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(now)
const dayNumber = new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(now)
</script>

<template>
  <div class="card">
    <div class="card-body text-center">
      <p class="text-13 text-gray-500 mb-4">
        {{ monthName }}
      </p>
      <h3 class="mb-2">
        {{ dayNumber }}
      </h3>
      <p class="text-gray-600 mb-0">
        {{ dayName }}
      </p>
    </div>
  </div>
</template>
