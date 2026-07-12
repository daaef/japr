<script setup lang="ts">
import type { EditorialBoardMember } from '#shared/content/editorial-board'
import { getInitials } from '~/utils/initials'

defineProps<{
  member: EditorialBoardMember
}>()
</script>

<template>
  <div class="rounded-2xl border border-default p-7 text-center">
    <div class="mx-auto mb-4 flex size-18 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-600">
      {{ getInitials(member.name) }}
    </div>
    <p class="font-bold text-highlighted">
      {{ member.name }}
    </p>
    <p class="mt-1.5 mb-3 text-xs font-bold tracking-wide text-primary-700 uppercase">
      {{ member.role }}
    </p>
    <div class="space-y-1 text-sm leading-relaxed text-muted">
      <p v-if="member.institution">
        {{ member.institution }}
      </p>
      <p v-if="member.region">
        {{ member.region }}
      </p>
      <p v-if="member.email">
        {{ member.email }}
      </p>
    </div>
  </div>
</template>
