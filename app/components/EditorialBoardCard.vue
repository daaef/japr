<script setup lang="ts">
import type { EditorialBoardMember } from '#shared/content/editorial-board'

defineProps<{
  member: EditorialBoardMember
}>()
</script>

<template>
  <article class="card p-24">
    <div class="border-b border-default pb-4">
      <h3 class="text-lg font-semibold text-toned">
        {{ member.name }}
      </h3>
      <p class="mt-1 text-sm text-primary">
        {{ member.role }}
      </p>
    </div>

    <div class="mt-4 space-y-2 text-sm text-muted">
      <p v-if="member.email">
        {{ member.email }}
      </p>
      <p v-if="member.region">
        {{ member.region }}
      </p>
      <p v-if="member.institution">
        {{ member.institution }}
      </p>
    </div>
  </article>
</template>
