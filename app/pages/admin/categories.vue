<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

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

const subCategoryOptions = computed(() => {
  const category = data.value.categories.find(item => item.id === subSubForm.categoryId)
  return category?.subCategories ?? []
})

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
  <div class="row gy-4">
    <div class="col-12">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Add category
          </h5>
        </div>
        <div class="card-body">
          <form
            class="row gy-3 align-items-end"
            @submit.prevent="createCategory"
          >
            <div class="col-md-4">
              <label
                for="category-name"
                class="h6 mb-8 fw-semibold"
              >Category name</label>
              <input
                id="category-name"
                v-model="form.name"
                type="text"
                class="form-control fw-medium text-15"
                placeholder="Category name"
                required
              >
            </div>
            <div class="col-md-4">
              <label
                for="category-description"
                class="h6 mb-8 fw-semibold"
              >Description</label>
              <input
                id="category-description"
                v-model="form.description"
                type="text"
                class="form-control fw-medium text-15"
                placeholder="Description"
              >
            </div>
            <div class="col-md-2">
              <label
                for="category-active-status"
                class="h6 mb-8 fw-semibold"
              >Status</label>
              <select
                id="category-active-status"
                v-model="form.isActive"
                class="form-select py-9 text-15 fw-medium"
              >
                <option :value="true">
                  Enable
                </option>
                <option :value="false">
                  Disable
                </option>
              </select>
            </div>
            <div class="col-md-2">
              <button
                type="submit"
                class="btn btn-main rounded-pill py-9 w-100"
                :disabled="saving"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="col-md-6">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Add sub-category
          </h5>
        </div>
        <div class="card-body">
          <form
            class="row gy-3"
            @submit.prevent="createSubCategory"
          >
            <div class="col-12">
              <label
                for="sub-parent-category"
                class="h6 mb-8 fw-semibold"
              >Parent category</label>
              <select
                id="sub-parent-category"
                v-model="subForm.categoryId"
                class="form-select py-9 text-15 fw-medium"
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                <option
                  v-for="category in data.categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="col-12">
              <label
                for="subcategory-name"
                class="h6 mb-8 fw-semibold"
              >Sub-category name</label>
              <input
                id="subcategory-name"
                v-model="subForm.name"
                type="text"
                class="form-control fw-medium text-15"
                placeholder="Sub-category name"
                required
              >
            </div>
            <div class="col-12">
              <button
                type="submit"
                class="btn btn-main rounded-pill py-9"
                :disabled="saving"
              >
                Add sub-category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="col-md-6">
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Add sub-subcategory
          </h5>
        </div>
        <div class="card-body">
          <form
            class="row gy-3"
            @submit.prevent="createSubSubCategory"
          >
            <div class="col-12">
              <label
                for="subsub-parent-category"
                class="h6 mb-8 fw-semibold"
              >Parent category</label>
              <select
                id="subsub-parent-category"
                v-model="subSubForm.categoryId"
                class="form-select py-9 text-15 fw-medium"
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                <option
                  v-for="category in data.categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="col-12">
              <label
                for="subsub-parent-subcategory"
                class="h6 mb-8 fw-semibold"
              >Parent sub-category</label>
              <select
                id="subsub-parent-subcategory"
                v-model="subSubForm.subCategoryId"
                class="form-select py-9 text-15 fw-medium"
                :disabled="!subSubForm.categoryId"
                required
              >
                <option value="" disabled>
                  {{ subSubForm.categoryId ? 'Select sub-category' : 'Choose category first' }}
                </option>
                <option
                  v-for="subCategory in subCategoryOptions"
                  :key="subCategory.id"
                  :value="subCategory.id"
                >
                  {{ subCategory.name }}
                </option>
              </select>
            </div>
            <div class="col-12">
              <label
                for="subsubcategory-name"
                class="h6 mb-8 fw-semibold"
              >Sub-subcategory name</label>
              <input
                id="subsubcategory-name"
                v-model="subSubForm.name"
                type="text"
                class="form-control fw-medium text-15"
                placeholder="Sub-subcategory name"
                required
              >
            </div>
            <div class="col-12">
              <button
                type="submit"
                class="btn btn-main rounded-pill py-9"
                :disabled="saving || !subSubForm.subCategoryId"
              >
                Add sub-subcategory
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="col-12">
      <div
        v-if="message"
        class="alert alert-success text-15 mb-0"
        role="alert"
      >
        {{ message }}
      </div>
      <div
        v-if="errorMessage"
        class="alert alert-danger text-15 mb-0"
        role="alert"
      >
        {{ errorMessage }}
      </div>
    </div>

    <div
      id="subcategories"
      class="col-12"
    >
      <div class="card">
        <div class="card-header border-bottom border-gray-100">
          <h5 class="mb-0">
            Category tree
          </h5>
        </div>
        <div class="card-body">
          <p
            v-if="!data.categories.length"
            class="text-13 text-gray-500 mb-0"
          >
            No categories yet.
          </p>
          <div
            v-for="category in data.categories"
            :key="category.id"
            class="mb-24 pb-24 border-bottom border-gray-100"
          >
            <template v-if="editingCategoryId === category.id">
              <div class="row gy-2 align-items-end mb-12">
                <div class="col-md-4">
                  <label
                    :for="`edit-category-name-${category.id}`"
                    class="h6 mb-8 fw-semibold"
                  >Name</label>
                  <input
                    :id="`edit-category-name-${category.id}`"
                    v-model="categoryDraft.name"
                    type="text"
                    class="form-control fw-medium text-15"
                  >
                </div>
                <div class="col-md-4">
                  <label
                    :for="`edit-category-desc-${category.id}`"
                    class="h6 mb-8 fw-semibold"
                  >Description</label>
                  <input
                    :id="`edit-category-desc-${category.id}`"
                    v-model="categoryDraft.description"
                    type="text"
                    class="form-control fw-medium text-15"
                  >
                </div>
                <div class="col-md-2">
                  <label
                    :for="`edit-category-status-${category.id}`"
                    class="h6 mb-8 fw-semibold"
                  >Status</label>
                  <select
                    :id="`edit-category-status-${category.id}`"
                    v-model="categoryDraft.isActive"
                    class="form-select py-9 text-15 fw-medium"
                  >
                    <option :value="true">
                      Enable
                    </option>
                    <option :value="false">
                      Disable
                    </option>
                  </select>
                </div>
                <div class="col-md-2 flex-align gap-8">
                  <button
                    type="button"
                    class="btn btn-main rounded-pill py-9"
                    :disabled="saving"
                    @click="saveCategory(category.id)"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    class="btn btn-outline-secondary rounded-pill py-9"
                    :disabled="saving"
                    @click="cancelEditCategory"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="flex-between flex-wrap gap-8 mb-8">
                <h6 class="fw-semibold text-gray-900 mb-0 flex-align gap-8">
                  {{ category.name }}
                  <span
                    class="badge text-13"
                    :class="category.isActive ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-600'"
                  >
                    {{ category.isActive ? 'Enabled' : 'Disabled' }}
                  </span>
                </h6>
                <div class="flex-align gap-8">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-main rounded-pill"
                    :disabled="saving"
                    @click="startEditCategory(category)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm rounded-pill"
                    :class="category.isActive ? 'btn-outline-danger' : 'btn-outline-success'"
                    :disabled="saving"
                    @click="toggleCategoryStatus(category)"
                  >
                    {{ category.isActive ? 'Disable' : 'Enable' }}
                  </button>
                </div>
              </div>
              <p
                v-if="category.description"
                class="text-13 text-gray-500 mb-12"
              >
                {{ category.description }}
              </p>
            </template>

            <div
              v-for="subCategory in category.subCategories"
              :key="subCategory.id"
              class="ps-16 mb-12"
            >
              <div class="flex-align flex-wrap gap-8 mb-8">
                <template v-if="editingSubId === subCategory.id">
                  <input
                    v-model="subDraft.name"
                    type="text"
                    class="form-control fw-medium text-15 w-auto"
                    aria-label="Sub-category name"
                  >
                  <button
                    type="button"
                    class="btn btn-sm btn-main rounded-pill"
                    :disabled="saving"
                    @click="saveSub(subCategory.id)"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary rounded-pill"
                    :disabled="saving"
                    @click="cancelEditSub"
                  >
                    Cancel
                  </button>
                </template>
                <template v-else>
                  <p class="fw-medium text-15 text-gray-800 mb-0">
                    {{ subCategory.name }}
                  </p>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-main rounded-pill"
                    :disabled="saving"
                    @click="startEditSub(subCategory)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger rounded-pill"
                    :disabled="saving"
                    @click="deleteSub(subCategory)"
                  >
                    Delete
                  </button>
                </template>
              </div>
              <div
                id="sub-subcategories"
                class="flex-align flex-wrap gap-8 ps-16"
              >
                <span
                  v-for="child in subCategory.subSubCategories"
                  :key="child.id"
                  class="badge bg-gray-100 text-13 flex-align gap-8"
                >
                  <template v-if="editingSubSubId === child.id">
                    <input
                      v-model="subSubDraft.name"
                      type="text"
                      class="form-control form-control-sm w-auto"
                      aria-label="Sub-subcategory name"
                    >
                    <button
                      type="button"
                      class="btn btn-sm btn-main rounded-pill"
                      :disabled="saving"
                      @click="saveSubSub(child.id)"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-secondary rounded-pill"
                      :disabled="saving"
                      @click="cancelEditSubSub"
                    >
                      Cancel
                    </button>
                  </template>
                  <template v-else>
                    {{ child.name }}
                    <button
                      type="button"
                      class="btn btn-sm p-0 text-primary-600"
                      :disabled="saving"
                      :aria-label="`Edit ${child.name}`"
                      @click="startEditSubSub(child)"
                    >
                      <i class="ph ph-pencil-simple" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm p-0 text-danger"
                      :disabled="saving"
                      :aria-label="`Delete ${child.name}`"
                      @click="deleteSubSub(child)"
                    >
                      <i class="ph ph-trash" />
                    </button>
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
