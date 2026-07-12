<script setup lang="ts">
const props = defineProps<{
  categories: Array<{
    id: string
    name: string
    subCategories?: Array<{
      id: string
      name: string
      subSubCategories?: Array<{ id: string, name: string }>
    }>
  }>
  modelValue?: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selected = computed({
  get: () => props.modelValue ?? [],
  set: value => emit('update:modelValue', value)
})

function toggle(id: string) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter(item => item !== id)
  } else {
    selected.value = [...selected.value, id]
  }
}
</script>

<template>
  <div class="space-y-3">
    <details
      v-for="category in categories"
      :key="category.id"
      class="rounded-2xl border border-default bg-default p-3"
      open
    >
      <summary class="cursor-pointer font-medium text-toned">
        <label class="inline-flex items-center gap-2">
          <input
            type="checkbox"
            :checked="selected.includes(category.id)"
            @change="toggle(category.id)"
          >
          {{ category.name }}
        </label>
      </summary>

      <div
        v-if="category.subCategories?.length"
        class="mt-3 space-y-2 pl-4"
      >
        <div
          v-for="sub in category.subCategories"
          :key="sub.id"
        >
          <label class="inline-flex items-center gap-2 text-sm text-toned">
            <input
              type="checkbox"
              :checked="selected.includes(sub.id)"
              @change="toggle(sub.id)"
            >
            {{ sub.name }}
          </label>
          <div
            v-if="sub.subSubCategories?.length"
            class="mt-2 space-y-1 pl-4"
          >
            <label
              v-for="child in sub.subSubCategories"
              :key="child.id"
              class="flex items-center gap-2 text-xs text-muted"
            >
              <input
                type="checkbox"
                :checked="selected.includes(child.id)"
                @change="toggle(child.id)"
              >
              {{ child.name }}
            </label>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>
