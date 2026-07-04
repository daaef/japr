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

defineProps<{
  categories: Category[]
  countries: string[]
}>()

const emit = defineEmits<{
  apply: []
}>()

const languageOptions = ['British English', 'American English', 'French']
const licenseOptions = JOURNAL_LICENSE_OPTIONS

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
  <nav
    class="hs-accordion-group"
    data-hs-accordion-always-open
  >
    <form
      class="w-full flex space-y-2.5 flex-col flex-wrap"
      @submit.prevent="emit('apply')"
    >
      <ul class="space-y-1.5">
        <li
          class="hs-accordion active"
          id="categories-accordion"
        >
          <button
            type="button"
            class="hs-accordion-toggle hs-accordion-active:text-secondary-900 hs-accordion-active:hover:bg-transparent w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-secondary-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100 uppercase"
            aria-expanded="true"
            aria-controls="categories-accordion-content"
          >
            Categories
            <svg
              class="hs-accordion-active:block ms-auto hidden size-4 text-gray-600 group-hover:text-gray-500"
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
              <path d="m18 15-6-6-6 6" />
            </svg>
            <svg
              class="hs-accordion-active:hidden ms-auto block size-4 text-gray-600 group-hover:text-gray-500"
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            id="categories-accordion-content"
            class="hs-accordion-content w-full overflow-hidden transition-[height] duration-300"
            role="region"
            aria-labelledby="categories-accordion"
          >
            <ul class="pt-2 ps-2 max-h-[200px] overflow-y-auto">
              <li
                v-for="category in categories"
                :key="category.id"
              >
                <label
                  class="flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :for="`cat-${category.id}`"
                >
                  <input
                    :id="`cat-${category.id}`"
                    type="checkbox"
                    name="category[]"
                    :value="category.id"
                    :checked="selectedCategories.includes(category.id)"
                    @change="onCategoryChange(category.id, $event)"
                  >
                  <span class="inline-block">{{ category.name }}</span>
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
                      class="flex items-center gap-x-3.5 py-1.5 px-2.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                      :for="`subcat-${subCategory.id}`"
                    >
                      <input
                        :id="`subcat-${subCategory.id}`"
                        type="checkbox"
                        name="subcategory[]"
                        :value="subCategory.id"
                        :checked="selectedSubcategories.includes(subCategory.id)"
                        @change="onSubcategoryChange(subCategory.id, $event)"
                      >
                      <span class="inline-block">{{ subCategory.name }}</span>
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
                          class="flex items-center gap-x-3.5 py-1.5 px-2.5 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                          :for="`subsubcat-${subSubCategory.id}`"
                        >
                          <input
                            :id="`subsubcat-${subSubCategory.id}`"
                            type="checkbox"
                            name="subsubcategory[]"
                            :value="subSubCategory.id"
                            :checked="selectedSubSubcategories.includes(subSubCategory.id)"
                            @change="onSubSubcategoryChange(subSubCategory.id, $event)"
                          >
                          <span class="inline-block">{{ subSubCategory.name }}</span>
                        </label>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </li>

        <li
          class="hs-accordion active"
          id="languages-accordion"
        >
          <button
            type="button"
            class="hs-accordion-toggle hs-accordion-active:text-primary-900 hs-accordion-active:hover:bg-transparent w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-primary-800 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100 uppercase"
            aria-expanded="true"
            aria-controls="languages-accordion-content"
          >
            Languages
            <svg
              class="hs-accordion-active:block ms-auto hidden size-4 text-gray-600 group-hover:text-gray-500"
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
              <path d="m18 15-6-6-6 6" />
            </svg>
            <svg
              class="hs-accordion-active:hidden ms-auto block size-4 text-gray-600 group-hover:text-gray-500"
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            id="languages-accordion-content"
            class="hs-accordion-content w-full overflow-hidden transition-[height] duration-300"
            role="region"
            aria-labelledby="languages-accordion"
          >
            <ul class="pt-2 ps-2">
              <li
                v-for="(language, index) in languageOptions"
                :key="language"
              >
                <label
                  class="flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  :for="`lang-${index + 1}`"
                >
                  <input
                    :id="`lang-${index + 1}`"
                    type="checkbox"
                    :checked="selectedLanguages.includes(language)"
                    @change="onLanguageChange(language, $event)"
                  >
                  <span class="inline-block">{{ language }}</span>
                </label>
              </li>
            </ul>
          </div>
        </li>

        <li
          class="hs-accordion active"
          id="licenses-accordion"
        >
          <button
            type="button"
            class="hs-accordion-toggle hs-accordion-active:text-primary-900 hs-accordion-active:hover:bg-transparent w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-primary-800 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100 uppercase"
            aria-expanded="true"
            aria-controls="licenses-accordion-content"
          >
            Licenses
            <svg
              class="hs-accordion-active:block hs-accordion-active:text-primary-900 ms-auto hidden size-4 text-primary-800"
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
              <path d="m18 15-6-6-6 6" />
            </svg>
            <svg
              class="hs-accordion-active:hidden ms-auto block size-4 text-gray-600 group-hover:text-gray-500"
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            id="licenses-accordion-content"
            class="hs-accordion-content w-full overflow-hidden transition-[height] duration-300"
            role="region"
            aria-labelledby="licenses-accordion"
          >
            <ul class="pt-2 ps-2">
              <li
                v-for="license in licenseOptions"
                :key="license.id"
                class="relative flex gap-x-3 px-2.5"
              >
                <div class="flex h-6 items-center">
                  <input
                    :id="license.id"
                    name="license[]"
                    type="checkbox"
                    :value="license.label"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    :checked="selectedLicenses.includes(license.label)"
                    @change="onLicenseChange(license.label, $event)"
                  >
                </div>
                <div class="text-sm leading-6">
                  <label
                    :for="license.id"
                    class="text-gray-500"
                  >{{ license.label }}</label>
                </div>
              </li>
            </ul>
          </div>
        </li>

        <li
          class="hs-accordion active"
          id="countries-accordion"
        >
          <button
            type="button"
            class="hs-accordion-toggle hs-accordion-active:text-primary-900 hs-accordion-active:hover:bg-transparent w-full text-start flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-primary-800 rounded-lg hover:bg-gray-100 focus:outline-none focus:bg-gray-100 uppercase"
            aria-expanded="true"
            aria-controls="countries-accordion-content"
          >
            Country
            <svg
              class="hs-accordion-active:block hs-accordion-active:text-primary-900 ms-auto hidden size-4 text-primary-800"
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
              <path d="m18 15-6-6-6 6" />
            </svg>
            <svg
              class="hs-accordion-active:hidden ms-auto block size-4 text-gray-600 group-hover:text-gray-500"
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            id="countries-accordion-content"
            class="hs-accordion-content w-full overflow-hidden transition-[height] duration-300"
            role="region"
            aria-labelledby="countries-accordion"
          >
            <ul class="pt-2 ps-2 max-h-[200px] overflow-y-auto">
              <li
                v-for="country in countries"
                :key="country"
                class="relative flex gap-x-3 px-2.5"
              >
                <div class="flex h-6 items-center">
                  <input
                    :id="country"
                    name="country[]"
                    type="checkbox"
                    class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    :value="country"
                    :checked="selectedCountries.includes(country)"
                    @change="onCountryChange(country, $event)"
                  >
                </div>
                <div class="text-sm leading-6">
                  <label
                    :for="country"
                    class="text-gray-500"
                  >{{ country }}</label>
                </div>
              </li>
            </ul>
          </div>
        </li>
      </ul>
      <button
        type="submit"
        class="py-2 px-5 bg-primary-500 text-gray-100 rounded-[8px]"
      >
        Apply filter
      </button>
    </form>
  </nav>
</template>
