<script setup lang="ts">
defineProps<{
  page: number
  totalPages: number
  total: number
  pageSize: number
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

function onUpdatePage(page: number) {
  emit('change', page)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2 mt-6">
    <p class="text-sm text-muted">
      Showing page {{ page }} of {{ totalPages }} ({{ total }} results)
    </p>
    <UPagination
      :page="page"
      :items-per-page="pageSize"
      :total="total"
      size="sm"
      @update:page="onUpdatePage"
    />
  </div>
</template>
