<script setup lang="ts">
import { COPY_DESK_ROLES } from '#shared/constants/roles'
import { userPingTemplates } from '#shared/constants/userPingTemplates'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  layout: 'copy-desk',
  middleware: ['auth', 'role'],
  requiredRoles: COPY_DESK_ROLES
})

usePageHeading().value = 'Users'

const { data: usersData, refresh } = await useFetch<{
  users: Array<{
    id: string
    fullname: string
    email: string
    username: string
    roles: string[]
  }>
}>('/api/copy-desk/users', {
  default: () => ({ users: [] })
})

const users = computed(() => usersData.value?.users ?? [])

const selectedUser = ref<typeof users.value[number] | null>(null)
const selectedTemplateId = ref<string>('')
const customMessage = ref('')
const sending = ref(false)
const feedback = ref('')
const feedbackColor = ref<'success' | 'error' | 'warning'>('success')

const modalOpen = computed({
  get: () => selectedUser.value !== null,
  set: (value: boolean) => {
    if (!value) {
      selectedUser.value = null
      selectedTemplateId.value = ''
      customMessage.value = ''
      feedback.value = ''
    }
  }
})

function openPing(user: typeof users.value[number]) {
  selectedUser.value = user
  selectedTemplateId.value = ''
  customMessage.value = ''
  feedback.value = ''
}

watch(selectedTemplateId, (id) => {
  if (!id) {
    return
  }
  const template = userPingTemplates.find(t => t.id === id)
  if (template) {
    customMessage.value = template.message
  }
})

async function sendPing() {
  if (!selectedUser.value) return

  sending.value = true
  feedback.value = ''

  try {
    await $fetch('/api/copy-desk/ping', {
      method: 'POST',
      body: {
        targetUserId: selectedUser.value.id,
        templateId: selectedTemplateId.value || undefined,
        customMessage: customMessage.value.trim() || undefined
      }
    })
    feedback.value = 'Ping sent.'
    feedbackColor.value = 'success'
    setTimeout(() => {
      modalOpen.value = false
      refresh()
    }, 800)
  } catch (caught) {
    feedback.value = extractApiErrorMessage(caught, 'Unable to send ping.')
    feedbackColor.value = 'error'
  } finally {
    sending.value = false
  }
}

function roleLabel(role: string) {
  return role.replaceAll('_', ' ')
}
</script>

<template>
  <div>
    <p class="mb-5 max-w-2xl text-[13.5px] text-muted">
      Select a user and send a nudge. Pick a preset message or write your own.
    </p>

    <div class="rounded-2xl border border-default bg-elevated p-4">
      <div v-if="users.length === 0" class="py-8 text-center text-sm text-muted">
        No users found.
      </div>

      <div v-else class="divide-y divide-default">
        <div
          v-for="user in users"
          :key="user.id"
          class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="font-semibold text-highlighted">
              {{ user.fullname }}
            </p>
            <p class="text-sm text-muted">
              {{ user.email }}
            </p>
            <div class="mt-1 flex flex-wrap gap-1">
              <UBadge
                v-for="role in user.roles"
                :key="role"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ roleLabel(role) }}
              </UBadge>
            </div>
          </div>

          <UButton
            color="warning"
            variant="outline"
            icon="i-lucide-bell-ring"
            size="sm"
            @click="openPing(user)"
          >
            Ping
          </UButton>
        </div>
      </div>
    </div>

    <UModal v-model:open="modalOpen">
      <template #content>
        <div class="p-5 sm:max-w-md">
          <h3 class="mb-1 font-semibold text-highlighted">
            Send a nudge
          </h3>
          <p class="mb-4 text-sm text-muted">
            To {{ selectedUser?.fullname }}
          </p>

          <UFormField label="Preset message" class="mb-4">
            <USelect
              v-model="selectedTemplateId"
              :items="[
                { label: 'Custom / write your own', value: '' },
                ...userPingTemplates.map(t => ({ label: t.label, value: t.id }))
              ]"
              placeholder="Choose a preset or write your own"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Message" class="mb-4">
            <UTextarea
              v-model="customMessage"
              :rows="4"
              class="w-full"
              placeholder="Write your own message, or pick a preset above..."
            />
          </UFormField>

          <UAlert
            v-if="feedback"
            :color="feedbackColor"
            variant="subtle"
            class="mb-4"
            :title="feedback"
          />

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="sending"
              @click="modalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="warning"
              :loading="sending"
              :disabled="!customMessage.trim() && !selectedTemplateId"
              @click="sendPing"
            >
              Send Ping
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
