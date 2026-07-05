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
  <div class="row gy-4">
    <div class="col-lg-12">
      <div class="card mt-24">
        <div class="card-header flex-between flex-wrap gap-8">
          <div>
            <h4 class="mb-4">
              Notification Preferences
            </h4>
            <p class="text-13 text-gray-600 mb-0">
              Customize how you receive notifications
            </p>
          </div>
          <NuxtLink
            to="/notifications"
            class="btn btn-outline-secondary btn-sm"
          >
            Back to notifications
          </NuxtLink>
        </div>

        <div class="card-body">
          <div
            v-if="successMessage"
            class="alert alert-success mb-16"
          >
            {{ successMessage }}
          </div>
          <div
            v-if="errorMessage"
            class="alert alert-danger mb-16"
          >
            {{ errorMessage }}
          </div>

          <form
            class="grid gap-24"
            @submit.prevent="save"
          >
            <section>
              <h5 class="mb-12">
                Email notifications
              </h5>
              <div class="grid gap-8">
                <label class="flex-align gap-8">
                  <input
                    v-model="form.email.manuscript_status"
                    type="checkbox"
                  >
                  <span>Manuscript status updates</span>
                </label>
                <label class="flex-align gap-8">
                  <input
                    v-model="form.email.review_assignment"
                    type="checkbox"
                  >
                  <span>Review assignments</span>
                </label>
                <label
                  class="flex-align gap-8"
                  :class="{ 'opacity-50': !isEditor }"
                >
                  <input
                    v-model="form.email.new_submissions"
                    type="checkbox"
                    :disabled="!isEditor"
                  >
                  <span>New submissions (editors)</span>
                </label>
              </div>
            </section>

            <section>
              <h5 class="mb-12">
                In-app notifications
              </h5>
              <div class="grid gap-8">
                <label class="flex-align gap-8">
                  <input
                    v-model="form.in_app.realtime"
                    type="checkbox"
                  >
                  <span>Realtime updates</span>
                </label>
                <label class="flex-align gap-8">
                  <input
                    v-model="form.in_app.sound"
                    type="checkbox"
                  >
                  <span>Sound alerts</span>
                </label>
                <label class="flex-align gap-8">
                  <input
                    v-model="form.in_app.desktop"
                    type="checkbox"
                  >
                  <span>Desktop notifications</span>
                </label>
              </div>
            </section>

            <div>
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="saving"
              >
                Save preferences
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
