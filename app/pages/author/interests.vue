<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

type Category = {
  id: string
  name: string
  categoryName?: string
}

const maxSelections = 5

const { data: currentUser, refresh: refreshCurrentUser } = useCurrentUser()

const { data: categoryData } = await useFetch<{ categories: Category[] }>('/api/categories', {
  default: () => ({ categories: [] })
})

const { data: interestData, refresh } = await useFetch<{
  interests: Array<{ categoryId: string }>
}>('/api/author/interests', {
  default: () => ({ interests: [] })
})

const selectedIds = ref<string[]>([])
const searchQuery = ref('')
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const needsInterests = computed(() => currentUser.value.authenticated && !currentUser.value.hasInterests)

const categories = computed(() => categoryData.value.categories)

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) {
    return categories.value
  }

  return categories.value.filter((category) => {
    const label = (category.categoryName || category.name).toLowerCase()
    return label.includes(query)
  })
})

const selectedCategories = computed(() =>
  selectedIds.value
    .map(id => categories.value.find(category => category.id === id))
    .filter((category): category is Category => Boolean(category))
)

const selectionCount = computed(() => selectedIds.value.length)
const atSelectionLimit = computed(() => selectionCount.value >= maxSelections)

watch(
  () => interestData.value.interests,
  (interests) => {
    selectedIds.value = interests.map(interest => interest.categoryId)
  },
  { immediate: true }
)

function categoryLabel(category: Category) {
  return category.categoryName || category.name
}

function isSelected(categoryId: string) {
  return selectedIds.value.includes(categoryId)
}

function toggleCategory(categoryId: string) {
  errorMessage.value = ''

  if (isSelected(categoryId)) {
    selectedIds.value = selectedIds.value.filter(id => id !== categoryId)
    return
  }

  if (atSelectionLimit.value) {
    errorMessage.value = `You can select up to ${maxSelections} interests.`
    return
  }

  selectedIds.value = [...selectedIds.value, categoryId]
}

function removeCategory(categoryId: string) {
  selectedIds.value = selectedIds.value.filter(id => id !== categoryId)
  errorMessage.value = ''
}

function formatSaveError(error: unknown) {
  return extractApiErrorMessage(error, 'Unable to save interests.')
}

async function save() {
  if (!selectedIds.value.length) {
    errorMessage.value = 'Select at least one category.'
    return
  }

  saving.value = true
  message.value = ''
  errorMessage.value = ''

  const isOnboarding = interestData.value.interests.length === 0

  try {
    await $fetch('/api/author/interests', {
      method: 'POST',
      body: {
        categoryIds: selectedIds.value
      }
    })

    await refresh()
    await refreshCurrentUser()
    message.value = 'Interests updated.'

    if (isOnboarding && selectedIds.value.length > 0) {
      await navigateTo('/author', { replace: true })
    }
  } catch (error) {
    errorMessage.value = formatSaveError(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="py-6">
    <div class="border-b border-gray-200 pb-5 sm:flex w-full sm:items-end sm:justify-between gap-4">
      <div>
        <h3 class="text-lg font-bold text-gray-900">
          Research interests
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          Choose up to {{ maxSelections }} categories that best match your work. This helps structure your profile and reviewer matching.
        </p>
      </div>
      <div class="mt-4 sm:mt-0 flex items-center gap-3 shrink-0">
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
          :class="atSelectionLimit ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'"
        >
          {{ selectionCount }} / {{ maxSelections }} selected
        </span>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="saving || !selectionCount"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save interests' }}
        </button>
      </div>
    </div>

    <div
      v-if="needsInterests"
      class="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"
    >
      Select at least one category and save to unlock manuscript submission. You can browse your dashboard and other tabs in the meantime.
    </div>

    <div
      v-if="message"
      class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {{ message }}
    </div>

    <div
      v-if="errorMessage"
      class="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="selectedCategories.length"
      class="mt-6 bg-white shadow rounded-lg p-5"
    >
      <p class="text-sm font-medium text-gray-700 mb-3">
        Your selections
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="category in selectedCategories"
          :key="category.id"
          type="button"
          class="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-800 transition hover:border-primary-300 hover:bg-primary-100"
          @click="removeCategory(category.id)"
        >
          {{ categoryLabel(category) }}
          <i class="ph ph-x text-xs" aria-hidden="true" />
          <span class="sr-only">Remove {{ categoryLabel(category) }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="!categories.length"
      class="mt-6 bg-white shadow rounded-lg p-8 text-center text-sm text-gray-500"
    >
      No categories are available yet. Contact support or try again later.
    </div>

    <div
      v-else
      class="mt-6 bg-white shadow rounded-lg overflow-hidden"
    >
      <div class="p-5 border-b border-gray-200">
        <label
          for="interest-search"
          class="sr-only"
        >
          Search categories
        </label>
        <div class="relative">
          <i
            class="ph ph-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="interest-search"
            v-model="searchQuery"
            type="search"
            placeholder="Search categories…"
            class="block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
        </div>
        <p class="mt-2 text-xs text-gray-500">
          {{ filteredCategories.length }} of {{ categories.length }} categories shown
        </p>
      </div>

      <div
        v-if="!filteredCategories.length"
        class="p-8 text-center text-sm text-gray-500"
      >
        No categories match your search.
      </div>

      <div
        v-else
        class="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-128 overflow-y-auto"
      >
        <button
          v-for="category in filteredCategories"
          :key="category.id"
          type="button"
          class="group flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition"
          :class="isSelected(category.id)
            ? 'border-primary-500 bg-primary-50 text-primary-900 shadow-sm'
            : atSelectionLimit
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50/50'"
          :disabled="!isSelected(category.id) && atSelectionLimit"
          :aria-pressed="isSelected(category.id)"
          @click="toggleCategory(category.id)"
        >
          <span
            class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition"
            :class="isSelected(category.id)
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-gray-300 bg-white text-transparent group-hover:border-primary-400'"
          >
            <i
              class="ph ph-check text-xs"
              aria-hidden="true"
            />
          </span>
          <span class="font-medium leading-snug">
            {{ categoryLabel(category) }}
          </span>
        </button>
      </div>

      <div class="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-600">
          Tap a category to select or deselect. Maximum {{ maxSelections }} interests.
        </p>
        <button
          type="button"
          class="btn btn-primary sm:shrink-0"
          :disabled="saving || !selectionCount"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save interests' }}
        </button>
      </div>
    </div>
  </div>
</template>
