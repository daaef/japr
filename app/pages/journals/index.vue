<script setup lang="ts">
const route = useRoute()

const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const searchType = ref(typeof route.query.searchType === 'string' ? route.query.searchType : 'title')
const filterOpen = ref(false)

function readQueryArray(key: string): string[] {
  const value = route.query[key]
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }
  if (typeof value === 'string' && value) {
    return [value]
  }
  return []
}

const selectedCategories = ref<string[]>(readQueryArray('category'))
const selectedSubcategories = ref<string[]>(readQueryArray('subcategory'))
const selectedSubSubcategories = ref<string[]>(readQueryArray('subsubcategory'))
const selectedLanguages = ref<string[]>(readQueryArray('journalLanguage'))
const selectedLicenses = ref<string[]>(readQueryArray('license'))
const selectedCountries = ref<string[]>(readQueryArray('country'))

interface SubSubCategory { id: string, name: string }
interface SubCategory { id: string, name: string, subSubCategories: SubSubCategory[] }
interface Category { id: string, name: string, subCategories: SubCategory[] }

const { data: categoryData } = await useFetch<{ categories: Category[] }>('/api/categories', {
  default: () => ({ categories: [] })
})

const { data: countriesData } = await useFetch<{
  regions: Array<{ name: string, countries: Array<{ name: string }> }>
}>('/api/countries', {
  default: () => ({ regions: [] })
})

const flatCountries = computed(() => {
  return countriesData.value?.regions.flatMap(region => region.countries.map(country => country.name)) ?? []
})

const { data, pending, refresh } = await useFetch<{
  journals: Array<{
    id: string
    slug: string
    title: string
    author: string
    abstract: string | null
    country: string | null
    journalLanguage: string | null
    approvalStatus: string
    coverImage?: string | null
    createdAt: string
  }>
  meta: { total: number, page: number, pageSize: number, pageCount: number }
}>('/api/journals/search', {
  query: computed(() => ({
    search: typeof route.query.search === 'string' ? route.query.search : undefined,
    searchType: typeof route.query.searchType === 'string' ? route.query.searchType : undefined,
    category: readQueryArray('category'),
    subcategory: readQueryArray('subcategory'),
    subsubcategory: readQueryArray('subsubcategory'),
    country: readQueryArray('country'),
    journalLanguage: readQueryArray('journalLanguage'),
    license: readQueryArray('license'),
    page: typeof route.query.page === 'string' ? Number(route.query.page) : 1
  })),
  default: () => ({ journals: [], meta: { total: 0, page: 1, pageSize: 10, pageCount: 1 } })
})

watch(() => route.query, () => {
  search.value = typeof route.query.search === 'string' ? route.query.search : ''
  selectedCategories.value = readQueryArray('category')
  selectedSubcategories.value = readQueryArray('subcategory')
  selectedSubSubcategories.value = readQueryArray('subsubcategory')
  selectedLanguages.value = readQueryArray('journalLanguage')
  selectedLicenses.value = readQueryArray('license')
  selectedCountries.value = readQueryArray('country')
}, { deep: true })

function buildQuery(page = 1) {
  const query: Record<string, string | string[]> = { page: String(page) }

  if (search.value.trim()) {
    query.search = search.value.trim()
    query.searchType = searchType.value
  }

  if (selectedCategories.value.length) {
    query.category = selectedCategories.value
  }

  if (selectedSubcategories.value.length) {
    query.subcategory = selectedSubcategories.value
  }

  if (selectedSubSubcategories.value.length) {
    query.subsubcategory = selectedSubSubcategories.value
  }

  if (selectedLanguages.value.length) {
    query.journalLanguage = selectedLanguages.value
  }

  if (selectedLicenses.value.length) {
    query.license = selectedLicenses.value
  }

  if (selectedCountries.value.length) {
    query.country = selectedCountries.value
  }

  return query
}

async function submitSearch() {
  await navigateTo({ path: '/journals', query: buildQuery(1) })
  await refresh()
}

async function applyFilters() {
  filterOpen.value = false
  await submitSearch()
}

async function goToPage(page: number) {
  await navigateTo({ path: '/journals', query: buildQuery(page) })
  await refresh()
}

function toggleFilters() {
  filterOpen.value = !filterOpen.value
}

const page = computed(() => data.value?.meta.page ?? 1)
</script>

<template>
  <div>
    <div class="border-b border-default pb-5 sm:flex w-full sm:items-center sm:justify-between">
      <AppPageHeader title="Journals" />
      <div>
        <form
          class="flex rounded-lg border min-w-full"
          @submit.prevent="submitSearch"
        >
          <input
            id="hs-trailing-multiple-add-on"
            v-model="search"
            type="text"
            name="search"
            class="py-3 lg:w-[400px] px-4 block w-full border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
            placeholder="Search  for a keyword or title"
          >
          <div class="inline-flex items-center min-w-[180px] rounded-e-md">
            <select
              v-model="searchType"
              class="relative py-3 ps-4 pe-9 flex gap-x-2 text-nowrap w-full cursor-pointer bg-white border border-gray-200 border-s-0 text-start text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
            >
              <option value="title">
                Title
              </option>
              <option value="keyword">
                Keyword
              </option>
            </select>
          </div>
          <button
            type="submit"
            class="px-4 inline-flex items-center min-w-fit rounded-e-md border border-s-0 bg-primary-500 text-white"
          >
            Search
          </button>
        </form>
      </div>
    </div>

    <div class="grid lg:grid-cols-[300px_1fr] relative gap-[30px] overflow-x-hidden mt-6">
      <div
        id="filter"
        class="lg:translate-x-0 lg:static absolute transition-all duration-300 z-30 bg-white lg:bg-transparent w-[300px] max-w-[85vw]"
        :class="filterOpen ? 'translate-x-0' : 'translate-x-[-100%]'"
      >
        <div class="flex gap-x-2 px-2.5 mb-4 relative items-center">
          <img
            class="h-[25px] cursor-pointer lg:static absolute right-0 lg:translate-x-0 translate-x-[100%] top-0"
            src="/images/filter.png"
            alt="Filter"
            @click="toggleFilters"
          >
          <span
            id="filter-toggle"
            class="text-primary-500 font-bold cursor-pointer"
            @click="toggleFilters"
          >
            Filter Results
          </span>
        </div>
        <JournalFiltersPanel
          v-model:selected-categories="selectedCategories"
          v-model:selected-subcategories="selectedSubcategories"
          v-model:selected-sub-subcategories="selectedSubSubcategories"
          v-model:selected-languages="selectedLanguages"
          v-model:selected-licenses="selectedLicenses"
          v-model:selected-countries="selectedCountries"
          :categories="categoryData.categories"
          :countries="flatCountries"
          @apply="applyFilters"
        />
      </div>

      <div class="lg:border pl-8 border-transparent border-l-secondary-900/50 min-w-0">
        <div class="flex justify-end mb-6">
          <UPagination
            :page="page"
            :items-per-page="data?.meta.pageSize ?? 10"
            :total="data?.meta.total ?? 0"
            show-edges
            @update:page="goToPage"
          />
        </div>

        <UCard
          v-if="pending"
          class="text-center"
        >
          <p class="text-sm text-muted">
            Loading journals…
          </p>
        </UCard>

        <div
          v-else
          class="grid gap-4"
        >
          <JournalCard
            v-for="journal in data.journals"
            :key="journal.id"
            :journal="journal"
          />
          <p
            v-if="data.journals.length === 0"
            class="text-sm text-muted"
          >
            No published journals at the moment
          </p>
        </div>

        <div
          v-if="data.meta.total > 0"
          class="flex justify-between items-center mt-6"
        >
          <div class="text-sm text-muted">
            Showing {{ ((data.meta.page - 1) * data.meta.pageSize) + 1 }}
            to {{ Math.min(data.meta.page * data.meta.pageSize, data.meta.total) }}
            of {{ data.meta.total }} results
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
