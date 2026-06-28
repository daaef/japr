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
    <select
      v-model="searchType"
      class="form-select lg:w-40"
    >
      <option
        v-for="option in searchTypes"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <input
      v-model="search"
      type="search"
      placeholder="Search keyword or title"
      class="form-control flex-1"
    >

    <button
      v-if="showFilterButton"
      type="button"
      class="btn btn-outline-secondary lg:hidden"
      @click="emit('toggleFilters')"
    >
      Filters
    </button>

    <button
      type="submit"
      class="btn btn-primary"
    >
      Search
    </button>
  </form>
</template>
