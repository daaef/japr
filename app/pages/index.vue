<script setup lang="ts">
import type { PublicDashboardStats } from '#shared/types/dashboard'

definePageMeta({
  layout: 'public'
})

useHead({
  title: 'Welcome to JAPR Homepage'
})

type CategoryNode = {
  id: string
  name: string
  subCategories?: Array<{
    id: string
    name: string
    subSubCategories?: Array<{ id: string, name: string }>
  }>
}

const router = useRouter()
const route = useRoute()

const { data: categoryData } = await useFetch<{ categories: CategoryNode[] }>('/api/categories', {
  default: () => ({ categories: [] })
})

const {
  data: statsData,
  pending: statsPending,
  error: statsError
} = await useFetch<{ stats: PublicDashboardStats }>('/api/stats', {
  default: () => ({
    stats: {
      journals: 0,
      authors: 0,
      associateEditors: 0,
      manuscripts: 0
    }
  })
})

const categories = computed(() => categoryData.value?.categories ?? [])
const homepageStats = computed(() => statsData.value.stats)
const search = ref('')
const accessDeniedPath = computed(() => {
  if (route.query.accessDenied !== '1') {
    return ''
  }

  const from = route.query.from
  return typeof from === 'string' ? from : ''
})

const collapsedCategories = ref(new Set<string>())
const collapsedSubcategories = ref(new Set<string>())

function toggleCategoryCollapse(id: string) {
  const next = new Set(collapsedCategories.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  collapsedCategories.value = next
}

function toggleSubcategoryCollapse(id: string) {
  const next = new Set(collapsedSubcategories.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  collapsedSubcategories.value = next
}

function setDescendantsChecked(root: HTMLElement, checked: boolean) {
  root.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    (input as HTMLInputElement).checked = checked
  })
}

function onCategoryLabelClick(event: MouseEvent) {
  const root = (event.currentTarget as HTMLElement).closest('.category') as HTMLElement | null
  if (!root) {
    return
  }
  const checkbox = root.querySelector('.category-checkbox') as HTMLInputElement | null
  if (checkbox) {
    setDescendantsChecked(root, checkbox.checked)
  }
}

function onSubcategoryLabelClick(event: MouseEvent) {
  const root = (event.currentTarget as HTMLElement).closest('.subcategory') as HTMLElement | null
  if (!root) {
    return
  }
  const checkbox = root.querySelector('.subcategory-checkbox') as HTMLInputElement | null
  if (checkbox) {
    setDescendantsChecked(root, checkbox.checked)
  }
}

function onCategoryCheckboxChange(event: Event) {
  const input = event.target as HTMLInputElement
  const root = input.closest('.category') as HTMLElement | null
  if (root) {
    setDescendantsChecked(root, input.checked)
  }
}

function onSubcategoryCheckboxChange(event: Event) {
  const input = event.target as HTMLInputElement
  const root = input.closest('.subcategory') as HTMLElement | null
  if (root) {
    setDescendantsChecked(root, input.checked)
  }
}

function submitSearch(event: Event) {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  const formData = new FormData(form)
  const query: Record<string, string | string[]> = {}

  if (search.value.trim()) {
    query.search = search.value.trim()
  }

  const selectedCategories = formData.getAll('category[]').map(String).filter(Boolean)
  if (selectedCategories.length) {
    query.category = selectedCategories
  }

  const subcategory = formData.get('subcategory')
  if (subcategory) {
    query.subcategory = String(subcategory)
  }

  const subsubcategories = formData.getAll('subsubcategory[]').map(String).filter(Boolean)
  if (subsubcategories.length) {
    query.subsubcategory = subsubcategories
  }

  router.push({ path: '/journals', query })
}

const mostViewedTiles = [
  { name: 'Education', image: '/images/education.png' },
  { name: 'History', image: '/images/history.png' },
  { name: 'Sports', image: '/images/sports.png' },
  { name: 'Science', image: '/images/science.png' },
  { name: 'Technology', image: '/images/technology.png' }
]

function displayStat(value: number) {
  return statsPending.value ? '…' : value
}
</script>

<template>
  <div>
  <div
    v-if="accessDeniedPath"
    class="fixed left-1/2 top-[96px] z-2100 w-[min(92vw,640px)] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-lg"
    role="alert"
  >
    You do not have permission to access
    <span class="font-semibold">{{ accessDeniedPath }}</span>.
    Please switch to an account with the required dashboard role.
  </div>

  <form
    class="grid grid-cols-[300px_1fr] w-full"
    action="/journals"
    method="get"
    @submit="submitSearch"
  >
    <div class="border-[1px] rounded-[15px] h-[560px] p-2 border-primary-900 rounded-r-none border-r-0">
      <div class="flex justify-between items-center">
        <h3 class="pb-1 text-sm">
          Categories Filter
        </h3>
      </div>
      <hr class="border-b border-t-0 border-primary-900 border-[px] mb-2">
      <div class="sidebar overflow-y-auto h-[500px] pb-2 w-full">
        <ul class="tree">
          <li
            v-for="category in categories"
            :key="category.id"
            class="category flex items-start flex-wrap font-medium"
            :class="{ collapsed: !collapsedCategories.has(category.id) }"
          >
            <span
              class="caret-icon block h-[18px]"
              @click.stop="toggleCategoryCollapse(category.id)"
            >
              <svg
                class="inline !align-baseline h-[18px] w-[18px]"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
            <input
              :id="`category-${category.id}`"
              type="checkbox"
              name="category[]"
              :value="category.id"
              class="category-checkbox"
              @change="onCategoryCheckboxChange"
            >
            <label
              class="category-label w-[180px] truncate"
              :for="`category-${category.id}`"
              @click="onCategoryLabelClick"
            >
              {{ category.name }}
            </label>
            <ul
              v-if="category.subCategories?.length"
              class="subcategories"
            >
              <li
                v-for="subCategory in category.subCategories"
                :key="subCategory.id"
                class="subcategory flex items-start flex-wrap"
                :class="{ collapsed: collapsedSubcategories.has(subCategory.id) }"
              >
                <span
                  class="caret-icon block h-[18px]"
                  @click.stop="toggleSubcategoryCollapse(subCategory.id)"
                >
                  <svg
                    class="!align-baseline h-[18px] w-[18px]"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
                <input
                  :id="`subcategory-${subCategory.id}`"
                  type="checkbox"
                  class="subcategory-checkbox"
                  name="subcategory"
                  :value="subCategory.id"
                  @change="onSubcategoryCheckboxChange"
                >
                <label
                  class="subcategory-label w-[180px] truncate"
                  :for="`subcategory-${subCategory.id}`"
                  @click="onSubcategoryLabelClick"
                >
                  {{ subCategory.name }}
                </label>
                <ul
                  v-if="subCategory.subSubCategories?.length"
                  class="subsubcategories"
                >
                  <li
                    v-for="subSubCategory in subCategory.subSubCategories"
                    :key="subSubCategory.id"
                    class="subsubcategory"
                  >
                    <input
                      :id="`subsubcategory-${subSubCategory.id}`"
                      type="checkbox"
                      name="subsubcategory[]"
                      class="subsubcategory-checkbox"
                      :value="subSubCategory.id"
                    >
                    <label
                      class="subsubcategory-label"
                      :for="`subsubcategory-${subSubCategory.id}`"
                    >
                      {{ subSubCategory.name }}
                    </label>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
    <div class="h-[560px] bg-secondary-900 rounded-r-[15px] grid grid-cols-2 overflow-x-hidden">
      <div class="px-14 flex justify-center gap-4 flex-col">
        <h3 class="text-5xl font-bold from-white to-primary-500 bg-gradient-to-r bg-clip-text text-transparent">
          Gateway to African Knowledge
        </h3>
        <p class="text-white text-xl">
          Explore Journals, Literature, and Research Across the Continent
        </p>
        <div class="flex rounded-[15px] shadow-sm relative">
          <input
            id="search"
            v-model="search"
            type="text"
            name="search"
            class="py-3 px-4 block w-full border-gray-200 shadow-sm rounded-[15px] text-sm focus:z-10 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50 disabled:pointer-events-none"
            placeholder="Search  for a keyword, title, publication date, ISSN, ISBN, DOI "
          >
          <button
            type="submit"
            class="w-[2.875rem] z-[1000] h-[2.875rem] absolute right-0 shrink-0 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-[15px] border border-transparent bg-primary-500 text-white hover:bg-primary-900 focus:outline-none focus:bg-primary-950 disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg
              class="shrink-0 size-4"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="11"
                cy="11"
                r="8"
              />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </div>
      </div>
      <img
        class="w-full h-[560px] object-cover"
        src="/images/headerImg.png"
        alt=""
      >
    </div>
  </form>

  <section
    id="most_viewed"
    class="py-[50px]"
  >
    <div class="flex justify-between">
      <h3 class="font-bold text-primary-500">
        Most Viewed
      </h3>
      <a
        href="#"
        class="text-secondary-900 text-sm"
      >
        Clear All
      </a>
    </div>
    <div class="grid grid-cols-5 gap-x-[30px] mt-6">
      <a
        v-for="tile in mostViewedTiles"
        :key="tile.name"
        href="#"
        class="relative flex flex-col justify-end h-[180px] after:bg-secondary-900/45 after:absolute after:top-0 after:left-0 after:w-full after:h-full rounded-[15px] after:rounded-[15px]"
      >
        <img
          class="w-full h-full absolute"
          :src="tile.image"
          :alt="tile.name"
        >
        <div class="relative p-4 z-[200] text-white flex items-center justify-between">
          <h5 class="font-bold">
            {{ tile.name }}
          </h5>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-arrow-right"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </a>
    </div>
  </section>

  <section
    id="about_japr"
    class="py-[50px]"
  >
    <h3 class="text-2xl font-bold text-primary-500 mb-4">
      About JAPR
    </h3>
    <p class="text-secondary-900">
      The Journal of African Policy was originally established to encourage an interdisciplinary academic and
      professional outlet about African political, social, cultural, and economic themes and the components of
      African development issues in the post-independence periods.
    </p>
    <p>
      The general thrust of The Journal of African Policy Review (JAPR) is that theoretical and conceptual
      discourse of development efforts in Africa must be interdisciplinary whereby policy makers, development
      practitioners, Artists, film- makers and academics will have an academic and professional journal
      through
      which empirical studies and interdisciplinary research could advance scholarship on Africa. Submissions
      are invited that generate ideas on policy implementation that advance the economic, political, and
      cultural
      development of African peoples.
    </p>
  </section>

  <section
    id="stats"
    class="py-[100px]"
  >
    <div class="grid grid-cols-4 gap-8">
      <p
        v-if="statsError"
        class="col-span-4 text-center text-sm text-red-600"
      >
        Live statistics are temporarily unavailable.
      </p>
      <div class="rounded-[15px] p-6 bg-secondary-900 flex flex-col items-center gap-6">
        <div class="flex gap-4 items-center flex-col">
          <img
            src="/images/metric.svg"
            alt="Metric"
          >
          <h4 class="font-bold text-xl text-white">
            Journals
          </h4>
        </div>
        <h2 class="text-5xl text-primary-500 font-bold">
          {{ displayStat(homepageStats.journals) }}
        </h2>
      </div>
      <div class="rounded-[15px] p-6 bg-secondary-900 flex flex-col items-center gap-6">
        <div class="flex gap-4 items-center flex-col">
          <img
            src="/images/metric.svg"
            alt="Metric"
          >
          <h4 class="font-bold text-xl text-white">
            Authors
          </h4>
        </div>
        <h2 class="text-5xl text-primary-500 font-bold">
          {{ displayStat(homepageStats.authors) }}
        </h2>
      </div>
      <div class="rounded-[15px] p-6 bg-secondary-900 flex flex-col items-center gap-6">
        <div class="flex gap-4 items-center flex-col">
          <img
            src="/images/metric.svg"
            alt="Metric"
          >
          <h4 class="font-bold text-xl text-white">
            Associate Editors
          </h4>
        </div>
        <h2 class="text-5xl text-primary-500 font-bold">
          {{ displayStat(homepageStats.associateEditors) }}
        </h2>
      </div>
      <div class="rounded-[15px] p-6 bg-secondary-900 flex flex-col items-center gap-6">
        <div class="flex gap-4 items-center flex-col">
          <img
            src="/images/metric.svg"
            alt="Metric"
          >
          <h4 class="font-bold text-xl text-white">
            Manuscripts
          </h4>
        </div>
        <h2 class="text-5xl text-primary-500 font-bold">
          {{ displayStat(homepageStats.manuscripts) }}
        </h2>
      </div>
    </div>
  </section>
  </div>
</template>
