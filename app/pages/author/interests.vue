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
    <div class="border-b border-default pb-5 sm:flex w-full sm:items-end sm:justify-between gap-4">
      <AppPageHeader
        eyebrow="Research Profile"
        title="Research Interests"
        :description="`Choose up to ${maxSelections} categories that best match your work. This helps structure your profile and reviewer matching.`"
      />
      <div class="mt-4 sm:mt-0 flex items-center gap-3 shrink-0">
        <UBadge
          :color="atSelectionLimit ? 'primary' : 'neutral'"
          variant="subtle"
          size="lg"
          class="rounded-full"
        >
          {{ selectionCount }} / {{ maxSelections }} selected
        </UBadge>
        <UButton
          color="primary"
          :loading="saving"
          :disabled="saving || !selectionCount"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save interests' }}
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="needsInterests"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      class="mt-6"
      description="Select at least one category and save to unlock manuscript submission. You can browse your dashboard and other tabs in the meantime."
    />

    <UAlert
      v-if="message"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      class="mt-6"
      :title="message"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      class="mt-6"
      :title="errorMessage"
    />

    <div
      v-if="selectedCategories.length"
      class="mt-6 rounded-2xl border border-default bg-default p-5"
    >
      <p class="text-sm font-bold text-highlighted mb-3">
        Your selections
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="category in selectedCategories"
          :key="category.id"
          color="primary"
          variant="solid"
          size="sm"
          class="rounded-full"
          trailing-icon="i-lucide-x"
          :aria-label="`Remove ${categoryLabel(category)}`"
          @click="removeCategory(category.id)"
        >
          {{ categoryLabel(category) }}
        </UButton>
      </div>
    </div>

    <div
      v-if="!categories.length"
      class="mt-6 rounded-2xl border border-default bg-default p-8 text-center text-sm text-muted"
    >
      No categories are available yet. Contact support or try again later.
    </div>

    <div
      v-else
      class="mt-6 rounded-2xl border border-default bg-default overflow-hidden"
    >
      <div class="p-5 border-b border-taupe-100">
        <UInput
          id="interest-search"
          v-model="searchQuery"
          type="search"
          icon="i-lucide-search"
          placeholder="Search categories…"
          aria-label="Search categories"
          class="w-full"
        />
        <p class="mt-2 text-xs text-dimmed">
          {{ filteredCategories.length }} of {{ categories.length }} categories shown
        </p>
      </div>

      <div
        v-if="!filteredCategories.length"
        class="p-8 text-center text-sm text-muted"
      >
        No categories match your search.
      </div>

      <div
        v-else
        class="p-5 grid gap-3 max-h-128 overflow-y-auto"
        style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));"
      >
        <UButton
          v-for="category in filteredCategories"
          :key="category.id"
          block
          size="lg"
          :color="isSelected(category.id) ? 'primary' : 'neutral'"
          :variant="isSelected(category.id) ? 'soft' : 'outline'"
          :leading-icon="isSelected(category.id) ? 'i-lucide-square-check' : 'i-lucide-square'"
          :disabled="!isSelected(category.id) && atSelectionLimit"
          :aria-pressed="isSelected(category.id)"
          class="justify-start text-left"
          @click="toggleCategory(category.id)"
        >
          <span class="font-medium leading-snug">
            {{ categoryLabel(category) }}
          </span>
        </UButton>
      </div>

      <div class="flex flex-col gap-3 border-t border-taupe-100 bg-taupe-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">
          Tap a category to select or deselect. Maximum {{ maxSelections }} interests.
        </p>
        <UButton
          color="primary"
          class="sm:shrink-0"
          :loading="saving"
          :disabled="saving || !selectionCount"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save interests' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
