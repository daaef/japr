<script setup lang="ts">
import { AUTHOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: AUTHOR_ROLES
})

const { data: currentUser } = useCurrentUser()

const firstName = computed(() => {
  const name = currentUser.value.user?.name?.trim() ?? 'Author'
  return name.split(/\s+/)[0] ?? 'Author'
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex w-full flex-col gap-1 border-b border-default pb-5 sm:flex-row sm:items-center sm:justify-between">
      <AppPageHeader title="Settings" />
      <span class="text-sm text-muted">
        {{ firstName }}'s Dashboard
      </span>
    </div>

    <SettingsForm
      role="author"
      author-public-layout
    />
  </div>
</template>
