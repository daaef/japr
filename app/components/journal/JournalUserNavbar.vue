<script setup lang="ts">
const route = useRoute()

function tabClass(active: boolean) {
  return active
    ? 'font-semibold border-primary-500 text-primary-500'
    : 'text-gray-500 border-transparent'
}

const isCollectionsTab = computed(() =>
  route.path === '/author'
  || route.path === '/author/'
  || route.path.startsWith('/author/collections')
)
</script>

<template>
  <div class="border-b flex justify-between border-gray-400/60 mb-4">
    <nav class="flex gap-x-6">
      <NuxtLink
        to="/author"
        class="py-4 px-1 inline-flex items-center gap-x-2 border-b-2 text-sm whitespace-nowrap hover:text-primary-600 focus:outline-none focus:text-primary-600"
        :class="tabClass(isCollectionsTab)"
        role="tab"
      >
        My Collections
      </NuxtLink>
      <NuxtLink
        to="/author/submissions"
        class="py-4 px-1 inline-flex items-center gap-x-2 border-b-2 text-sm whitespace-nowrap hover:text-primary-600 focus:outline-none focus:text-primary-600"
        :class="tabClass(route.path.startsWith('/author/submissions'))"
        role="tab"
      >
        My Submissions
      </NuxtLink>
      <NuxtLink
        to="/author/settings"
        class="py-4 px-1 inline-flex items-center gap-x-2 border-b-2 text-sm whitespace-nowrap hover:text-primary-600 focus:outline-none focus:text-primary-600"
        :class="tabClass(route.path === '/author/settings')"
        role="tab"
      >
        Profile
      </NuxtLink>
      <NuxtLink
        to="/author/interests"
        class="py-4 px-1 inline-flex items-center gap-x-2 border-b-2 text-sm whitespace-nowrap hover:text-primary-600 focus:outline-none focus:text-primary-600"
        :class="tabClass(route.path.startsWith('/author/interests'))"
        role="tab"
      >
        Interests
      </NuxtLink>
    </nav>
    <nav class="flex gap-x-6">
      <NuxtLink
        v-if="isCollectionsTab"
        to="/journals"
        class="font-semibold text-secondary-900 py-4 px-1 inline-flex items-center gap-x-2 border-b-2 border-transparent text-sm whitespace-nowrap hover:text-primary-600 focus:outline-none focus:text-primary-600"
        role="tab"
      >
        Create Collections
        <img
          class="h-6"
          src="/images/create-collection.png"
          alt=""
        >
      </NuxtLink>

      <NuxtLink
        v-if="route.path.startsWith('/author/submissions')"
        to="/author/submit"
        class="font-semibold text-secondary-900 py-4 px-1 inline-flex items-center gap-x-2 border-b-2 border-transparent text-sm whitespace-nowrap hover:text-primary-600 focus:outline-none focus:text-primary-600"
        role="tab"
      >
        Submit Manuscript
        <img
          class="h-6"
          src="/images/submit-manuscript.png"
          alt=""
        >
      </NuxtLink>
    </nav>
  </div>
</template>
