<script setup lang="ts">
const search = defineModel<string>('search', { default: '' })
const searchType = defineModel<string>('searchType', { default: 'keyword' })

defineProps<{
  showFilterButton?: boolean
}>()

const emit = defineEmits<{
  submit: []
  toggleFilters: []
}>()

const searchTypes = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'title', label: 'Title' }
]
</script>

<template>
  <form
    class="flex flex-col gap-3 lg:flex-row"
    @submit.prevent="emit('submit')"
  >
    <USelect
      v-model="searchType"
      :items="searchTypes"
      class="lg:w-40"
    />

    <UInput
      v-model="search"
      type="search"
      placeholder="Search keyword or title"
      class="flex-1"
    />

    <UButton
      v-if="showFilterButton"
      type="button"
      color="neutral"
      variant="outline"
      class="lg:hidden"
      @click="emit('toggleFilters')"
    >
      Filters
    </UButton>

    <UButton
      type="submit"
      color="primary"
    >
      Search
    </UButton>
  </form>
</template>
