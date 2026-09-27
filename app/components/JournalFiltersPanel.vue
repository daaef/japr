<script setup lang="ts">
import { JOURNAL_LICENSE_OPTIONS } from '#shared/constants/journalLicenses'

interface SubSubCategory { id: string, name: string }
interface SubCategory { id: string, name: string, subSubCategories: SubSubCategory[] }
interface Category { id: string, name: string, subCategories: SubCategory[] }

const selectedCategories = defineModel<string[]>('selectedCategories', { default: () => [] })
const selectedSubcategories = defineModel<string[]>('selectedSubcategories', { default: () => [] })
const selectedSubSubcategories = defineModel<string[]>('selectedSubSubcategories', { default: () => [] })
const selectedLanguages = defineModel<string[]>('selectedLanguages', { default: () => [] })
const selectedLicenses = defineModel<string[]>('selectedLicenses', { default: () => [] })
const selectedCountries = defineModel<string[]>('selectedCountries', { default: () => [] })

interface FacetCounts {
  categories: Record<string, number>
  subcategories: Record<string, number>
  subsubcategories: Record<string, number>
  languages: Record<string, number>
  licenses: Record<string, number>
  countries: Record<string, number>
}

const props = defineProps<{
  categories: Category[]
  countries: string[]
  facets?: FacetCounts | null
  loading?: boolean
}>()

const emit = defineEmits<{
  apply: []
}>()

function getCount(map: Record<string, number> | undefined, key: string) {
  return map?.[key] ?? 0
}

function isDisabled(count: number) {
  return !props.loading && count === 0
}

function countLabel(count: number) {
  return count > 0 ? ` (${count})` : ''
}

const languageOptions = ['British English', 'American English', 'French']
const licenseOptions = JOURNAL_LICENSE_OPTIONS

function sortByCount<T>(items: readonly T[], getKey: (item: T) => string, map?: Record<string, number>): T[] {
  return [...items].sort((a, b) => {
    const countA = map?.[getKey(a)] ?? 0
    const countB = map?.[getKey(b)] ?? 0
    return countB - countA
  })
}

const sortedCategories = computed(() => {
  return props.categories
    .map(category => ({
      ...category,
      subCategories: sortByCount(category.subCategories, sub => sub.id, props.facets?.subcategories)
        .map(sub => ({
          ...sub,
          subSubCategories: sortByCount(sub.subSubCategories, ss => ss.id, props.facets?.subsubcategories)
        }))
    }))
    .sort((a, b) => (props.facets?.categories[b.id] ?? 0) - (props.facets?.categories[a.id] ?? 0))
})

const sortedLanguageOptions = computed(() => sortByCount(languageOptions, l => l, props.facets?.languages))
const sortedLicenseOptions = computed(() => sortByCount(licenseOptions, l => l.label, props.facets?.licenses))
const sortedCountries = computed(() => sortByCount(props.countries, c => c, props.facets?.countries))

const filterAccordionItems = [
  { label: 'Categories', value: 'categories', slot: 'categories' as const },
  { label: 'Languages', value: 'languages', slot: 'languages' as const },
  { label: 'Licenses', value: 'licenses', slot: 'licenses' as const },
  { label: 'Country', value: 'countries', slot: 'countries' as const }
]

function toggleValue(list: string[], value: string, checked: boolean) {
  if (checked) {
    return list.includes(value) ? list : [...list, value]
  }
  return list.filter(item => item !== value)
}

function onCategoryChange(id: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedCategories.value = toggleValue(selectedCategories.value, id, checked)
}

function onSubcategoryChange(id: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedSubcategories.value = toggleValue(selectedSubcategories.value, id, checked)
}

function onSubSubcategoryChange(id: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedSubSubcategories.value = toggleValue(selectedSubSubcategories.value, id, checked)
}

function onLanguageChange(language: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedLanguages.value = toggleValue(selectedLanguages.value, language, checked)
}

function onLicenseChange(license: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedLicenses.value = toggleValue(selectedLicenses.value, license, checked)
}

function onCountryChange(country: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selectedCountries.value = toggleValue(selectedCountries.value, country, checked)
}
</script>

<template>
  <nav>
    <form
      class="w-full flex space-y-2.5 flex-col flex-wrap"
      @submit.prevent="emit('apply')"
    >
      <UAccordion
        type="multiple"
        :items="filterAccordionItems"
        :default-value="['categories', 'languages', 'licenses', 'countries']"
      >
        <template #categories>
          <ul class="pt-2 ps-2 max-h-[200px] overflow-y-auto">
            <li
              v-for="category in sortedCategories"
              :key="category.id"
            >
              <label
                class="flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-none"
                :class="isDisabled(getCount(props.facets?.categories, category.id)) ? 'text-muted cursor-not-allowed' : 'text-default hover:bg-elevated focus:bg-elevated'"
                :for="`cat-${category.id}`"
              >
                <input
                  :id="`cat-${category.id}`"
                  type="checkbox"
                  name="category[]"
                  class="h-4 w-4 rounded border-accented text-primary-600 focus:ring-primary-600 disabled:opacity-50"
                  :value="category.id"
                  :checked="selectedCategories.includes(category.id)"
                  :disabled="isDisabled(getCount(props.facets?.categories, category.id))"
                  @change="onCategoryChange(category.id, $event)"
                >
                <span class="inline-block">{{ category.name }}{{ countLabel(getCount(props.facets?.categories, category.id)) }}</span>
              </label>

              <ul
                v-if="selectedCategories.includes(category.id) && category.subCategories.length"
                class="ps-6"
              >
                <li
                  v-for="subCategory in category.subCategories"
                  :key="subCategory.id"
                >
                  <label
                    class="flex items-center gap-x-3.5 py-1.5 px-2.5 text-sm rounded-lg focus:outline-none"
                    :class="isDisabled(getCount(props.facets?.subcategories, subCategory.id)) ? 'text-muted cursor-not-allowed' : 'text-toned hover:bg-elevated focus:bg-elevated'"
                    :for="`subcat-${subCategory.id}`"
                  >
                    <input
                      :id="`subcat-${subCategory.id}`"
                      type="checkbox"
                      name="subcategory[]"
                      class="h-4 w-4 rounded border-accented text-primary-600 focus:ring-primary-600 disabled:opacity-50"
                      :value="subCategory.id"
                      :checked="selectedSubcategories.includes(subCategory.id)"
                      :disabled="isDisabled(getCount(props.facets?.subcategories, subCategory.id))"
                      @change="onSubcategoryChange(subCategory.id, $event)"
                    >
                    <span class="inline-block">{{ subCategory.name }}{{ countLabel(getCount(props.facets?.subcategories, subCategory.id)) }}</span>
                  </label>

                  <ul
                    v-if="selectedSubcategories.includes(subCategory.id) && subCategory.subSubCategories.length"
                    class="ps-6"
                  >
                    <li
                      v-for="subSubCategory in subCategory.subSubCategories"
                      :key="subSubCategory.id"
                    >
                      <label
                        class="flex items-center gap-x-3.5 py-1.5 px-2.5 text-sm rounded-lg focus:outline-none"
                        :class="isDisabled(getCount(props.facets?.subsubcategories, subSubCategory.id)) ? 'text-muted cursor-not-allowed' : 'text-muted hover:bg-elevated focus:bg-elevated'"
                        :for="`subsubcat-${subSubCategory.id}`"
                      >
                        <input
                          :id="`subsubcat-${subSubCategory.id}`"
                          type="checkbox"
                          name="subsubcategory[]"
                          class="h-4 w-4 rounded border-accented text-primary-600 focus:ring-primary-600 disabled:opacity-50"
                          :value="subSubCategory.id"
                          :checked="selectedSubSubcategories.includes(subSubCategory.id)"
                          :disabled="isDisabled(getCount(props.facets?.subsubcategories, subSubCategory.id))"
                          @change="onSubSubcategoryChange(subSubCategory.id, $event)"
                        >
                        <span class="inline-block">{{ subSubCategory.name }}{{ countLabel(getCount(props.facets?.subsubcategories, subSubCategory.id)) }}</span>
                      </label>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </template>

        <template #languages>
          <ul class="pt-2 ps-2">
            <li
              v-for="(language, index) in sortedLanguageOptions"
              :key="language"
            >
              <label
                class="flex items-center gap-x-3.5 py-2 px-2.5 text-sm rounded-lg focus:outline-none"
                :class="isDisabled(getCount(props.facets?.languages, language)) ? 'text-muted cursor-not-allowed' : 'text-default hover:bg-elevated focus:bg-elevated'"
                :for="`lang-${index + 1}`"
              >
                <input
                  :id="`lang-${index + 1}`"
                  type="checkbox"
                  class="h-4 w-4 rounded border-accented text-primary-600 focus:ring-primary-600 disabled:opacity-50"
                  :checked="selectedLanguages.includes(language)"
                  :disabled="isDisabled(getCount(props.facets?.languages, language))"
                  @change="onLanguageChange(language, $event)"
                >
                <span class="inline-block">{{ language }}{{ countLabel(getCount(props.facets?.languages, language)) }}</span>
              </label>
            </li>
          </ul>
        </template>

        <template #licenses>
          <ul class="pt-2 ps-2">
            <li
              v-for="license in sortedLicenseOptions"
              :key="license.id"
              class="relative flex gap-x-3 px-2.5"
            >
              <div class="flex h-6 items-center">
                <input
                  :id="license.id"
                  name="license[]"
                  type="checkbox"
                  :value="license.label"
                  class="h-4 w-4 rounded border-accented text-primary-600 focus:ring-primary-600 disabled:opacity-50"
                  :checked="selectedLicenses.includes(license.label)"
                  :disabled="isDisabled(getCount(props.facets?.licenses, license.label))"
                  @change="onLicenseChange(license.label, $event)"
                >
              </div>
              <div class="text-sm leading-6">
                <label
                  :for="license.id"
                  :class="isDisabled(getCount(props.facets?.licenses, license.label)) ? 'text-muted cursor-not-allowed' : 'text-muted'"
                >{{ license.label }}{{ countLabel(getCount(props.facets?.licenses, license.label)) }}</label>
              </div>
            </li>
          </ul>
        </template>

        <template #countries>
          <ul class="pt-2 ps-2 max-h-[200px] overflow-y-auto">
            <li
              v-for="country in sortedCountries"
              :key="country"
              class="relative flex gap-x-3 px-2.5"
            >
              <div class="flex h-6 items-center">
                <input
                  :id="country"
                  name="country[]"
                  type="checkbox"
                  class="h-4 w-4 rounded border-accented text-primary-600 focus:ring-primary-600 disabled:opacity-50"
                  :value="country"
                  :checked="selectedCountries.includes(country)"
                  :disabled="isDisabled(getCount(props.facets?.countries, country))"
                  @change="onCountryChange(country, $event)"
                >
              </div>
              <div class="text-sm leading-6">
                <label
                  :for="country"
                  :class="isDisabled(getCount(props.facets?.countries, country)) ? 'text-muted cursor-not-allowed' : 'text-muted'"
                >{{ country }}{{ countLabel(getCount(props.facets?.countries, country)) }}</label>
              </div>
            </li>
          </ul>
        </template>
      </UAccordion>
      <UButton
        type="submit"
        color="primary"
        block
      >
        Apply filter
      </UButton>
    </form>
  </nav>
</template>
