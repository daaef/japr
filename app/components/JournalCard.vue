<script setup lang="ts">
defineProps<{
  journal: {
    id: string
    slug: string
    title: string
    author: string
    abstract: string | null
    country: string | null
    approvalStatus: string
    coverImage?: string | null
    createdAt: string
  }
}>()
</script>

<template>
  <article class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4 hover:shadow-md transition-shadow">
    <div class="flex flex-wrap gap-4">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-3 mb-2">
          <JournalStatusBadge :status="journal.approvalStatus" />
          <span class="text-13 text-gray-500">{{ journal.country || 'Global' }}</span>
        </div>
        <h2 class="text-lg font-bold text-gray-900">
          <NuxtLink
            :to="`/journals/${journal.slug}`"
            class="hover:text-primary-600"
          >
            {{ journal.title }}
          </NuxtLink>
        </h2>
        <p class="text-13 text-gray-600 mt-1">
          {{ journal.author }}
        </p>
        <p class="text-13 text-gray-600 mt-3 line-clamp-3">
          {{ journal.abstract || 'No abstract provided.' }}
        </p>
        <p class="text-13 text-gray-400 mt-3">
          {{ new Date(journal.createdAt).toLocaleDateString() }}
        </p>
      </div>
    </div>
  </article>
</template>
