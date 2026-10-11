<script setup lang="ts">
import type { EditorialBoardMember } from '#shared/types/editorialBoard'

definePageMeta({
  layout: 'public'
})

useHead({
  title: 'Welcome to JAPR Homepage | Editorial Board'
})

const { data } = await useFetch<{ members: EditorialBoardMember[] }>('/api/editorial-board', {
  default: () => ({ members: [] })
})

// Generic by design: any section an admin creates — existing or new — gets its own
// heading here with its members underneath, each showing their own role, with no code
// change required. Section order is derived from its lowest member sortOrder rather
// than a separate field, since reordering a whole section this size is rare.
const sections = computed(() => {
  const bySection = new Map<string, EditorialBoardMember[]>()

  for (const member of data.value.members) {
    const group = bySection.get(member.section) ?? []
    group.push(member)
    bySection.set(member.section, group)
  }

  return [...bySection.entries()]
    .map(([section, members]) => {
      const sorted = [...members].sort((a, b) => a.sortOrder - b.sortOrder)
      return { section, members: sorted, order: sorted[0]!.sortOrder }
    })
    .sort((a, b) => a.order - b.order)
})
</script>

<template>
  <main>
    <section class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div class="mb-13 text-center">
        <p class="mb-2.5 text-xs font-bold tracking-widest text-secondary-800 uppercase">
          JAPR
        </p>
        <h1 class="font-serif text-4xl font-semibold text-highlighted">
          Meet our Editorial Board
        </h1>
      </div>

      <div
        v-for="group in sections"
        :key="group.section"
        class="mb-14"
      >
        <h2 class="mb-7 text-center text-xl font-bold text-highlighted">
          {{ group.section }}
        </h2>
        <div class="grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
          <EditorialBoardCard
            v-for="member in group.members"
            :key="member.id"
            :member="member"
          />
        </div>
      </div>
    </section>
  </main>
</template>
