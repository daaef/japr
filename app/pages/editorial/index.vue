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
    <section class="py-14 lg:py-24">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 class="text-4xl text-center font-bold text-highlighted mb-12">
          Meet our Editorial Board
        </h2>

        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <EditorialBoardCard :member="editorInChief" />
          <EditorialBoardCard :member="managingEditor" />
          <EditorialBoardCard :member="deskEditor" />
        </div>

        <div class="mt-12">
          <h3 class="text-center text-xl font-bold text-highlighted mb-6">
            Associate Editors
          </h3>
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <EditorialBoardCard
              v-for="member in associateEditors"
              :key="member.name"
              :member="member"
            />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
