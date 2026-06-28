import { defineStore } from 'pinia'

export const useJournalsStore = defineStore('journals', () => {
  const filters = reactive({
    search: '',
    categoryId: '',
    country: '',
    journalLanguage: '',
    page: 1
  })

  const journals = ref<Array<Record<string, unknown>>>([])
  const meta = ref({ total: 0, page: 1, pageSize: 20, totalPages: 1 })

  async function search() {
    const result = await $fetch<{ journals: Array<Record<string, unknown>>, meta: typeof meta.value }>('/api/journals/search', {
      query: {
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        country: filters.country || undefined,
        journalLanguage: filters.journalLanguage || undefined,
        page: filters.page
      }
    })

    journals.value = result.journals
    meta.value = result.meta
    return result
  }

  return {
    filters,
    journals,
    meta,
    search
  }
})
