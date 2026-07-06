<script setup lang="ts">
defineProps<{
  displayName: string
  fullName?: string
  settingsPath: string
}>()

const emit = defineEmits<{
  signOut: []
}>()

const open = ref(false)

function onSignOut() {
  open.value = false
  emit('signOut')
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      color="neutral"
      variant="outline"
      trailing-icon="i-lucide-chevron-down"
      class="rounded-full"
    >
      {{ displayName }}
    </UButton>

    <template #content>
      <div class="w-64">
        <div class="px-4 py-3 border-b border-default">
          <p class="text-sm font-semibold text-highlighted truncate">
            {{ fullName || displayName }}
          </p>
        </div>
        <nav class="p-1">
          <NuxtLink
            :to="settingsPath"
            class="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-default hover:bg-elevated transition-colors"
            @click="open = false"
          >
            <UIcon
              name="i-lucide-settings"
              class="text-primary"
            />
            Account Settings
          </NuxtLink>
          <button
            type="button"
            class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-default hover:bg-error/10 hover:text-error transition-colors"
            @click="onSignOut"
          >
            <UIcon
              name="i-lucide-log-out"
              class="text-error"
            />
            Log Out
          </button>
        </nav>
      </div>
    </template>
  </UPopover>
</template>
