<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'public' | 'dashboard' | 'auth'
  id?: string
  required?: boolean
}>(), {
  variant: 'public',
  id: 'country',
  required: false
})

const model = defineModel<string>({ default: '' })

const { data } = await useFetch<{
  regions: Array<{
    id: string
    name: string
    countries: Array<{ id: string, name: string }>
  }>
}>('/api/countries', {
  default: () => ({ regions: [] })
})

const selectClass = computed(() => {
  if (props.variant === 'dashboard') {
    return 'form-select py-9 text-15 fw-medium'
  }

  if (props.variant === 'auth') {
    return 'block w-full bg-[#F9FAFB] rounded-md border-0 px-3 py-1.5 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6'
  }

  return 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6'
})
</script>

<template>
  <select
    :id="id"
    v-model="model"
    :class="selectClass"
    :required="required"
  >
    <option value="" disabled>
      {{ variant === 'auth' ? 'Select your country' : 'Select country' }}
    </option>
    <optgroup
      v-for="region in data.regions"
      :key="region.id"
      :label="region.name"
    >
      <option
        v-for="country in region.countries"
        :key="country.id"
        :value="country.name"
      >
        {{ country.name }}
      </option>
    </optgroup>
  </select>
</template>
