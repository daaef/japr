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
  <div class="rounded-2xl border border-default p-6 transition-shadow hover:shadow-md">
    <div class="mb-2.5 flex flex-wrap items-center gap-2">
      <JournalStatusBadge :status="journal.approvalStatus" />
      <span class="text-xs text-muted">{{ journal.country || 'Global' }}</span>
    </div>
    <h2 class="font-serif text-xl font-semibold text-highlighted">
      <NuxtLink
        :to="`/journals/${journal.slug}`"
        class="hover:text-primary-700"
      >
        {{ journal.title }}
      </NuxtLink>
    </h2>
    <p class="mt-1.5 text-xs text-dimmed">
      {{ journal.author }} · {{ new Date(journal.createdAt).toLocaleDateString() }}
    </p>
    <p class="mt-3 text-sm leading-relaxed text-toned line-clamp-3">
      {{ journal.abstract || 'No abstract provided.' }}
    </p>
    <div class="mt-4 border-t border-taupe-100 pt-3">
      <NuxtLink
        :to="`/journals/${journal.slug}`"
        class="text-xs font-bold text-primary-600 hover:text-primary-700"
      >
        Read Article →
      </NuxtLink>
    </div>
  </div>
</template>
