<script setup lang="ts">
import { ADMIN_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ADMIN_ROLES
})

usePageHeading().value = 'Categories'

type SubSubNode = { id: string, name: string }
type SubNode = { id: string, name: string, subSubCategories: SubSubNode[] }
type CategoryNode = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  subCategories: SubNode[]
}

const form = reactive({
  name: '',
  description: '',
  isActive: true
})

const subForm = reactive({
  categoryId: '',
  name: ''
})

const subSubForm = reactive({
  categoryId: '',
  subCategoryId: '',
  name: ''
})

const { loading: saving, message, error: errorMessage, run: runAction, clear: clearFeedback } = useActionHandler()

const { data, refresh } = await useFetch<{ categories: CategoryNode[] }>('/api/categories', {
  query: { includeInactive: '1' },
  default: () => ({ categories: [] })
})

const editingCategoryId = ref('')
const categoryDraft = reactive({ name: '', description: '', isActive: true })

const editingSubId = ref('')
const subDraft = reactive({ name: '' })

const editingSubSubId = ref('')
const subSubDraft = reactive({ name: '' })

// Presentational item lists for USelect's `:items` API (label/value shape).
const categoryItems = computed(() => data.value.categories.map(category => ({
  label: category.name,
  value: category.id
})))

const subCategoryItems = computed(() => {
  const category = data.value.categories.find(item => item.id === subSubForm.categoryId)
  return (category?.subCategories ?? []).map(subCategory => ({
    label: subCategory.name,
    value: subCategory.id
  }))
})

const statusItems = [
  { label: 'Enable', value: true },
  { label: 'Disable', value: false }
]

watch(() => subSubForm.categoryId, () => {
  subSubForm.subCategoryId = ''
})

function createCategory() {
  return runAction(async () => {
    await $fetch('/api/categories', {
      method: 'POST',
      body: form
    })
    form.name = ''
    form.description = ''
    await refresh()
  }, 'Category created.', 'Unable to create category.')
}

function createSubCategory() {
  clearFeedback()

  if (!subForm.categoryId) {
    errorMessage.value = 'Select a parent category.'
    return
  }

  return runAction(async () => {
    await $fetch(`/api/categories/${subForm.categoryId}/subcategories`, {
      method: 'POST',
      body: { name: subForm.name }
    })
    subForm.name = ''
    await refresh()
  }, 'Sub-category created.', 'Unable to create sub-category.')
}

function createSubSubCategory() {
  clearFeedback()

  if (!subSubForm.subCategoryId) {
    errorMessage.value = 'Select a parent sub-category.'
    return
  }

  return runAction(async () => {
    await $fetch(`/api/subcategories/${subSubForm.subCategoryId}/sub-subcategories`, {
      method: 'POST',
      body: { name: subSubForm.name }
    })
    subSubForm.name = ''
    await refresh()
  }, 'Sub-subcategory created.', 'Unable to create sub-subcategory.')
}

function startEditCategory(category: CategoryNode) {
  clearFeedback()
  editingCategoryId.value = category.id
  categoryDraft.name = category.name
  categoryDraft.description = category.description ?? ''
  categoryDraft.isActive = category.isActive
}

function cancelEditCategory() {
  editingCategoryId.value = ''
}

function saveCategory(id: string) {
  return runAction(async () => {
    await $fetch(`/api/categories/${id}`, {
      method: 'PATCH',
      body: {
        name: categoryDraft.name,
        description: categoryDraft.description || null,
        isActive: categoryDraft.isActive
      }
    })
    editingCategoryId.value = ''
    await refresh()
  }, 'Category updated.', 'Unable to update category.')
}

function toggleCategoryStatus(category: CategoryNode) {
  const successMessage = category.isActive ? 'Category disabled.' : 'Category enabled.'

  return runAction(async () => {
    await $fetch(`/api/categories/${category.id}`, {
      method: 'PATCH',
      body: { isActive: !category.isActive }
    })
    await refresh()
  }, successMessage, 'Unable to update category status.')
}

function startEditSub(sub: SubNode) {
  clearFeedback()
  editingSubId.value = sub.id
  subDraft.name = sub.name
}

function cancelEditSub() {
  editingSubId.value = ''
}

function saveSub(id: string) {
  return runAction(async () => {
    await $fetch(`/api/subcategories/${id}`, {
      method: 'PATCH',
      body: { name: subDraft.name }
    })
    editingSubId.value = ''
    await refresh()
  }, 'Sub-category updated.', 'Unable to update sub-category.')
}

function deleteSub(sub: SubNode) {
  clearFeedback()

  if (!confirm(`Delete sub-category "${sub.name}" and all its sub-subcategories?`)) {
    return
  }

  return runAction(async () => {
    await $fetch(`/api/subcategories/${sub.id}`, { method: 'DELETE' })
    await refresh()
  }, 'Sub-category deleted.', 'Unable to delete sub-category.')
}

function startEditSubSub(child: SubSubNode) {
  clearFeedback()
  editingSubSubId.value = child.id
  subSubDraft.name = child.name
}

function cancelEditSubSub() {
  editingSubSubId.value = ''
}

function saveSubSub(id: string) {
  return runAction(async () => {
    await $fetch(`/api/sub-subcategories/${id}`, {
      method: 'PATCH',
      body: { name: subSubDraft.name }
    })
    editingSubSubId.value = ''
    await refresh()
  }, 'Sub-subcategory updated.', 'Unable to update sub-subcategory.')
}

function deleteSubSub(child: SubSubNode) {
  clearFeedback()

  if (!confirm(`Delete sub-subcategory "${child.name}"?`)) {
    return
  }

  return runAction(async () => {
    await $fetch(`/api/sub-subcategories/${child.id}`, { method: 'DELETE' })
    await refresh()
  }, 'Sub-subcategory deleted.', 'Unable to delete sub-subcategory.')
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h2 class="text-base font-semibold text-highlighted">
          Add category
        </h2>
      </template>
      <form
        class="grid gap-4 md:grid-cols-12 md:items-end"
        @submit.prevent="createCategory"
      >
        <UFormField
          class="md:col-span-4"
          label="Category name"
          required
        >
          <UInput
            v-model="form.name"
            type="text"
            placeholder="Category name"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-4"
          label="Description"
        >
          <UInput
            v-model="form.description"
            type="text"
            placeholder="Description"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-2"
          label="Status"
        >
          <USelect
            v-model="form.isActive"
            :items="statusItems"
            class="w-full"
          />
        </UFormField>
        <div class="md:col-span-2">
          <UButton
            type="submit"
            color="primary"
            block
            :loading="saving"
            :disabled="saving"
          >
            Add
          </UButton>
        </div>
      </form>
    </UCard>

    <div class="grid gap-6 md:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">
            Add sub-category
          </h2>
        </template>
        <form
          class="space-y-4"
          @submit.prevent="createSubCategory"
        >
          <UFormField
            label="Parent category"
            required
          >
            <USelect
              v-model="subForm.categoryId"
              :items="categoryItems"
              placeholder="Select category"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Sub-category name"
            required
          >
            <UInput
              v-model="subForm.name"
              type="text"
              placeholder="Sub-category name"
              required
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="saving"
          >
            Add sub-category
          </UButton>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">
            Add sub-subcategory
          </h2>
        </template>
        <form
          class="space-y-4"
          @submit.prevent="createSubSubCategory"
        >
          <UFormField
            label="Parent category"
            required
          >
            <USelect
              v-model="subSubForm.categoryId"
              :items="categoryItems"
              placeholder="Select category"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Parent sub-category"
            required
          >
            <USelect
              v-model="subSubForm.subCategoryId"
              :items="subCategoryItems"
              :placeholder="subSubForm.categoryId ? 'Select sub-category' : 'Choose category first'"
              :disabled="!subSubForm.categoryId"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Sub-subcategory name"
            required
          >
            <UInput
              v-model="subSubForm.name"
              type="text"
              placeholder="Sub-subcategory name"
              required
              class="w-full"
            />
          </UFormField>
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="saving || !subSubForm.subCategoryId"
          >
            Add sub-subcategory
          </UButton>
        </form>
      </UCard>
    </div>

    <div
      v-if="message || errorMessage"
      class="space-y-3"
    >
      <UAlert
        v-if="message"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :title="message"
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
      />
    </div>

    <UCard id="subcategories">
      <template #header>
        <h2 class="text-base font-semibold text-highlighted">
          Category tree
        </h2>
      </template>
      <p
        v-if="!data.categories.length"
        class="text-xs text-muted"
      >
        No categories yet.
      </p>
      <div
        v-for="category in data.categories"
        :key="category.id"
        class="mb-6 pb-6 border-b border-default"
      >
        <template v-if="editingCategoryId === category.id">
          <div class="grid gap-2 md:grid-cols-12 md:items-end mb-3">
            <UFormField
              class="md:col-span-4"
              label="Name"
            >
              <UInput
                v-model="categoryDraft.name"
                type="text"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-4"
              label="Description"
            >
              <UInput
                v-model="categoryDraft.description"
                type="text"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-2"
              label="Status"
            >
              <USelect
                v-model="categoryDraft.isActive"
                :items="statusItems"
                class="w-full"
              />
            </UFormField>
            <div class="md:col-span-2 flex flex-wrap items-end gap-2">
              <UButton
                type="button"
                color="primary"
                :loading="saving"
                :disabled="saving"
                @click="saveCategory(category.id)"
              >
                Save
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                :disabled="saving"
                @click="cancelEditCategory"
              >
                Cancel
              </UButton>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 class="flex items-center gap-2 font-semibold text-highlighted">
              {{ category.name }}
              <UBadge
                :color="category.isActive ? 'success' : 'neutral'"
                variant="subtle"
                :label="category.isActive ? 'Enabled' : 'Disabled'"
              />
            </h3>
            <div class="flex items-center gap-2">
              <UButton
                type="button"
                color="primary"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="startEditCategory(category)"
              >
                Edit
              </UButton>
              <UButton
                type="button"
                :color="category.isActive ? 'error' : 'success'"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="toggleCategoryStatus(category)"
              >
                {{ category.isActive ? 'Disable' : 'Enable' }}
              </UButton>
            </div>
          </div>
          <p
            v-if="category.description"
            class="text-xs text-muted mb-3"
          >
            {{ category.description }}
          </p>
        </template>

        <div
          v-for="subCategory in category.subCategories"
          :key="subCategory.id"
          class="ps-4 mb-3"
        >
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <template v-if="editingSubId === subCategory.id">
              <UInput
                v-model="subDraft.name"
                type="text"
                size="sm"
                aria-label="Sub-category name"
                class="w-auto"
              />
              <UButton
                type="button"
                color="primary"
                size="sm"
                :loading="saving"
                :disabled="saving"
                @click="saveSub(subCategory.id)"
              >
                Save
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="cancelEditSub"
              >
                Cancel
              </UButton>
            </template>
            <template v-else>
              <p class="font-medium text-sm text-highlighted">
                {{ subCategory.name }}
              </p>
              <UButton
                type="button"
                color="primary"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="startEditSub(subCategory)"
              >
                Edit
              </UButton>
              <UButton
                type="button"
                color="error"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="deleteSub(subCategory)"
              >
                Delete
              </UButton>
            </template>
          </div>
          <div
            id="sub-subcategories"
            class="flex flex-wrap items-center gap-2 ps-4"
          >
            <UBadge
              v-for="child in subCategory.subSubCategories"
              :key="child.id"
              color="neutral"
              variant="subtle"
              class="items-center gap-2"
            >
              <template v-if="editingSubSubId === child.id">
                <UInput
                  v-model="subSubDraft.name"
                  type="text"
                  size="sm"
                  aria-label="Sub-subcategory name"
                  class="w-auto"
                />
                <UButton
                  type="button"
                  color="primary"
                  size="sm"
                  :loading="saving"
                  :disabled="saving"
                  @click="saveSubSub(child.id)"
                >
                  Save
                </UButton>
                <UButton
                  type="button"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :disabled="saving"
                  @click="cancelEditSubSub"
                >
                  Cancel
                </UButton>
              </template>
              <template v-else>
                {{ child.name }}
                <UButton
                  type="button"
                  icon="i-lucide-pencil"
                  color="primary"
                  variant="ghost"
                  size="sm"
                  :disabled="saving"
                  :aria-label="`Edit ${child.name}`"
                  @click="startEditSubSub(child)"
                />
                <UButton
                  type="button"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="sm"
                  :disabled="saving"
                  :aria-label="`Delete ${child.name}`"
                  @click="deleteSubSub(child)"
                />
              </template>
            </UBadge>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
