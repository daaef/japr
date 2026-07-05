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
  <div class="py-6">
    <div class="border-b border-gray-200 pb-5 sm:flex w-full sm:items-center sm:justify-between">
      <h3 class="text-lg font-bold text-gray-900">
        Settings
      </h3>
      <h4 class="mt-2 sm:mt-0 text-base text-gray-700">
        {{ firstName }}'s Dashboard
      </h4>
    </div>

    <SettingsForm
      role="author"
      author-public-layout
    />
  </div>
</template>
