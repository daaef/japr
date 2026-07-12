<script setup lang="ts">
import type { NotificationPreferences } from '#shared/validation/notifications'
import { hasEditorRole } from '#shared/constants/roles'
import { defaultNotificationPreferences } from '#shared/validation/notifications'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

definePageMeta({
  middleware: ['auth']
})

const { applyRoleLayout } = useRoleLayout()
await applyRoleLayout()
const { data: currentUser, refresh } = useCurrentUser()

const isEditor = computed(() => hasEditorRole(currentUser.value.roles))

const form = reactive<NotificationPreferences>({
  ...defaultNotificationPreferences
})

const saving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

watch(
  () => currentUser.value?.user?.notificationPreferences,
  (preferences) => {
    if (preferences) {
      Object.assign(form, preferences)
    }
  },
  { immediate: true }
)

async function save() {
  if (!currentUser.value?.user?.id) {
    return
  }

  saving.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const payload = {
      ...form,
      email: {
        ...form.email,
        new_submissions: isEditor.value ? form.email.new_submissions : false
      }
    }

    await $fetch(`/api/users/${currentUser.value.user.id}/notification-preferences`, {
      method: 'PATCH',
      body: payload
    })
    await refresh()
    await refreshNuxtData('current-user')
    successMessage.value = 'Notification preferences updated successfully.'
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to save preferences.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UCard class="mt-6">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 class="mb-1 text-lg font-semibold">
            Notification Preferences
          </h4>
          <p class="text-xs text-muted">
            Customize how you receive notifications
          </p>
        </div>
        <UButton
          to="/notifications"
          color="neutral"
          variant="outline"
          size="sm"
        >
          Back to notifications
        </UButton>
      </div>
    </template>

    <UAlert
      v-if="successMessage"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      class="mb-4"
      :title="successMessage"
    />
    <UAlert
      v-if="errorMessage"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      class="mb-4"
      :title="errorMessage"
    />

    <form
      class="grid gap-6"
      @submit.prevent="save"
    >
      <section>
        <h5 class="mb-3 text-base font-semibold">
          Email notifications
        </h5>
        <div class="grid gap-2">
          <USwitch
            v-model="form.email.manuscript_status"
            label="Manuscript status updates"
          />
          <USwitch
            v-model="form.email.review_assignment"
            label="Review assignments"
          />
          <USwitch
            v-model="form.email.new_submissions"
            label="New submissions (editors)"
            :disabled="!isEditor"
          />
        </div>
      </section>

      <section>
        <h5 class="mb-3 text-base font-semibold">
          In-app notifications
        </h5>
        <div class="grid gap-2">
          <USwitch
            v-model="form.in_app.realtime"
            label="Realtime updates"
          />
          <USwitch
            v-model="form.in_app.sound"
            label="Sound alerts"
          />
          <USwitch
            v-model="form.in_app.desktop"
            label="Desktop notifications"
          />
        </div>
      </section>

      <div>
        <UButton
          type="submit"
          color="primary"
          :loading="saving"
        >
          Save preferences
        </UButton>
      </div>
    </form>
  </UCard>
</template>
