import { defineStore } from 'pinia'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Array<{
    id: string
    name: string
    subCategories?: Array<{ id: string, name: string, subSubCategories?: Array<{ id: string, name: string }> }>
  }>>([])
  const loaded = ref(false)

  async function load() {
    if (loaded.value) {
      return categories.value
    }

    const result = await $fetch<{ categories: typeof categories.value }>('/api/categories')
    categories.value = result.categories
    loaded.value = true
    return categories.value
  }

  return {
    categories,
    loaded,
    load
  }
})
