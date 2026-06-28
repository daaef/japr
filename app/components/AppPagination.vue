<script setup lang="ts">
const props = defineProps<{
  page: number
  totalPages: number
  total: number
  pageSize: number
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

function goTo(page: number) {
  if (page < 1 || page > props.totalPages) {
    return
  }

  emit('change', page)
}
</script>

<template>
  <div class="flex-between flex-wrap gap-8 mt-24">
    <p class="text-13 text-gray-600 mb-0">
      Showing page {{ page }} of {{ totalPages }} ({{ total }} results)
    </p>
    <div class="flex-align gap-8">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="page <= 1"
        @click="goTo(page - 1)"
      >
        Previous
      </button>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        :disabled="page >= totalPages"
        @click="goTo(page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
