<script setup lang="ts">
import { associateEditors, deskEditor, editorInChief, managingEditor } from '#shared/content/editorial-board'

definePageMeta({
  layout: 'public'
})

useHead({
  title: 'Welcome to JAPR Homepage | Editorial Board'
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

      <div class="mb-14 grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        <EditorialBoardCard :member="editorInChief" />
        <EditorialBoardCard :member="managingEditor" />
        <EditorialBoardCard :member="deskEditor" />
      </div>

      <h2 class="mb-7 text-center text-xl font-bold text-highlighted">
        Associate Editors
      </h2>
      <div class="grid gap-6" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        <EditorialBoardCard
          v-for="member in associateEditors"
          :key="member.name"
          :member="member"
        />
      </div>
    </section>
  </main>
</template>
