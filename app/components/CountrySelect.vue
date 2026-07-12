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

// Consumes the injected UFormField context so the field's auto-generated label `for`
// id actually matches this control's id (falls back to the `id` prop when standalone).
const { id } = useFormField(props)

const { data } = await useFetch<{
  regions: Array<{
    id: string
    name: string
    countries: Array<{ id: string, name: string }>
  }>
}>('/api/countries', {
  default: () => ({ regions: [] })
})

// Flat items list: each region contributes a non-selectable `type: 'label'` heading
// followed by its countries as plain strings. Because a country's stored value IS its
// name, using string items keeps the `v-model` a country-name string with no value-key
// (a value-key would be rejected — the heading items have no `value` field).
const items = computed(() =>
  data.value.regions.flatMap(region => [
    { type: 'label' as const, label: region.name },
    ...region.countries.map(country => country.name)
  ])
)

const placeholder = computed(() =>
  props.variant === 'auth' ? 'Select your country' : 'Select country'
)
</script>

<template>
  <USelectMenu
    :id="id"
    v-model="model"
    :items="items"
    :required="required"
    :placeholder="placeholder"
    class="w-full"
  />
</template>
