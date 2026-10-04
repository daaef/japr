<script setup lang="ts">
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'

const props = defineProps<{
  journalId: string
}>()

const can = useCan()
const canPing = computed(() => can('ping', 'send'))

interface PingTarget {
  userId: string
  fullname: string
  role: string
}

interface PingTemplateItem {
  id: string
  label: string
  targets: PingTarget[]
}

const open = ref(false)
const templates = ref<PingTemplateItem[]>([])
const loading = ref(false)
const sending = ref(false)
const feedback = ref('')
const feedbackColor = ref<'success' | 'error' | 'warning'>('success')

async function loadTemplates() {
  loading.value = true
  try {
    const result = await $fetch<{ templates: PingTemplateItem[] }>(
      `/api/editor/journals/${props.journalId}/ping-templates`
    )
    templates.value = result.templates
  } catch {
    templates.value = []
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (value) {
    feedback.value = ''
    loadTemplates()
  }
})

async function sendPing(templateId: string, targetUserId: string) {
  sending.value = true
  feedback.value = ''

  try {
    await $fetch(`/api/editor/journals/${props.journalId}/ping`, {
      method: 'POST',
      body: { templateId, targetUserId }
    })
    feedback.value = 'Ping sent.'
    feedbackColor.value = 'success'
  } catch (caught) {
    const message = extractApiErrorMessage(caught, 'Unable to send ping.')
    feedbackColor.value = message.includes('Already pinged') ? 'warning' : 'error'
    feedback.value = message
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div v-if="canPing" class="relative">
    <UPopover v-model:open="open">
      <UButton
        color="warning"
        variant="outline"
        icon="i-lucide-bell-ring"
        size="sm"
      >
        Ping
      </UButton>

      <template #content>
        <div class="w-72 p-3">
          <p class="mb-2 text-sm font-semibold text-highlighted">
            Send a nudge
          </p>

          <div v-if="loading" class="py-4 text-center text-sm text-muted">
            Loading templates...
          </div>

          <div v-else-if="!templates.length" class="py-4 text-center text-sm text-muted">
            No applicable pings for this status.
          </div>

          <div v-else class="max-h-80 space-y-3 overflow-y-auto">
            <div
              v-for="template in templates"
              :key="template.id"
            >
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {{ template.label }}
              </p>
              <div class="space-y-1">
                <UButton
                  v-for="target in template.targets"
                  :key="target.userId"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  class="w-full justify-start"
                  :disabled="sending"
                  @click="sendPing(template.id, target.userId)"
                >
                  <span class="truncate">{{ target.fullname }}</span>
                  <UBadge color="neutral" variant="subtle" size="xs" class="ml-auto">
                    {{ target.role.replaceAll('_', ' ') }}
                  </UBadge>
                </UButton>
              </div>
            </div>
          </div>

          <UAlert
            v-if="feedback"
            :color="feedbackColor"
            variant="subtle"
            class="mt-3"
            :title="feedback"
          />
        </div>
      </template>
    </UPopover>
  </div>
</template>
