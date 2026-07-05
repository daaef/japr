<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})
</script>

<template>
  <JournalQueueList
    title="Under Peer Review"
    api-url="/api/editor/journals/under-peer-review"
    detail-path-prefix="/editor/journals"
    empty-message="No manuscripts under peer review."
  />
</template>
