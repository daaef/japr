<script setup lang="ts">
interface MailRecord {
  id: string
  createdAt: string
  transport: string
  to: string | string[]
  subject: string
  html: string
  text?: string
}

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

useHead({ title: 'JAPR | Dev Mail Viewer' })

const { data, error, refresh, status } = await useFetch<MailRecord[]>('/api/dev/mail', {
  default: () => []
})

const disabled = computed(() => error.value?.statusCode === 404)
const emails = computed(() => data.value ?? [])
const selectedId = ref<string | null>(null)

watchEffect(() => {
  if (!selectedId.value && emails.value.length > 0) {
    selectedId.value = emails.value[0]!.id
  }
})

const selected = computed(() => emails.value.find(e => e.id === selectedId.value) ?? null)

function recipients(to: string | string[]) {
  return Array.isArray(to) ? to.join(', ') : to
}

function when(iso: string) {
  return new Date(iso).toLocaleString()
}
</script>

<template>
  <div class="row gy-4">
    <div class="col-12 d-flex justify-content-between align-items-center">
      <h4 class="mb-0">
        Dev Mail Viewer
      </h4>
      <button
        type="button"
        class="btn btn-outline-main-600 btn-sm"
        :disabled="status === 'pending'"
        @click="() => refresh()"
      >
        <i class="ph ph-arrows-clockwise me-1" /> Refresh
      </button>
    </div>

    <div v-if="disabled" class="col-12">
      <div class="card">
        <div class="card-body">
          <p class="mb-2 fw-semibold">
            The mail viewer is disabled.
          </p>
          <p class="text-gray-600 mb-0">
            Enable it by setting <code>NUXT_ENABLE_MAIL_VIEWER=true</code> (or run a non-production
            server with <code>EMAIL_TRANSPORT=local</code>). It is always restricted to admins and
            never available in production unless explicitly enabled.
          </p>
        </div>
      </div>
    </div>

    <div v-else-if="emails.length === 0" class="col-12">
      <div class="card">
        <div class="card-body text-gray-600">
          No captured emails yet. Trigger an action that sends mail (e.g. submit a manuscript) and refresh.
        </div>
      </div>
    </div>

    <template v-else>
      <div class="col-lg-4">
        <div class="card">
          <div class="card-body p-0" style="max-height: 70vh; overflow-y: auto;">
            <ul class="list-unstyled mb-0">
              <li
                v-for="mail in emails"
                :key="mail.id"
              >
                <button
                  type="button"
                  class="w-100 text-start border-0 bg-transparent p-16 border-bottom border-gray-100"
                  :class="{ 'bg-main-50': mail.id === selectedId }"
                  @click="selectedId = mail.id"
                >
                  <span class="d-block fw-semibold text-truncate">{{ mail.subject }}</span>
                  <span class="d-block text-13 text-gray-600 text-truncate">{{ recipients(mail.to) }}</span>
                  <span class="d-block text-12 text-gray-400">{{ when(mail.createdAt) }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="col-lg-8">
        <div v-if="selected" class="card">
          <div class="card-body">
            <h6 class="mb-1">
              {{ selected.subject }}
            </h6>
            <p class="text-13 text-gray-600 mb-1">
              <strong>To:</strong> {{ recipients(selected.to) }}
            </p>
            <p class="text-12 text-gray-400 mb-3">
              {{ when(selected.createdAt) }} · transport: {{ selected.transport }}
            </p>
            <!-- Captured HTML is untrusted: render in a fully sandboxed iframe (no scripts), never v-html -->
            <iframe
              :srcdoc="selected.html"
              sandbox=""
              title="Email preview"
              class="w-100 border border-gray-100 rounded"
              style="height: 60vh;"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
