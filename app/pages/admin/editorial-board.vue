<script setup lang="ts">
import type { EditorialBoardMember } from '#shared/types/editorialBoard'
definePageMeta({
  middleware: ['auth', 'role'],
  // admin, or copy_desk_editor as admin-backup duty (the stakeholder's "desk editor can
  // do this too") — not ADMIN_ROLES, since this one page is intentionally broader.
  requiredRoles: ['admin', 'copy_desk_editor']
})

usePageHeading().value = 'Editorial Board'

const { loading: saving, message, error: errorMessage, run: runAction, clear: clearFeedback } = useActionHandler()

const { data, refresh } = await useFetch<{ members: EditorialBoardMember[] }>('/api/editorial-board', {
  query: { includeInactive: '1' },
  default: () => ({ members: [] })
})

const form = reactive({
  name: '',
  role: '',
  section: '',
  email: '',
  institution: '',
  region: '',
  sortOrder: 0
})

// Section names already in use, offered as a datalist — doesn't restrict free text,
// so a genuinely new section (e.g. "Book Review Editors") is just typing a new name.
const knownSections = computed(() => [...new Set(data.value.members.map(member => member.section))])

const editingId = ref('')
const draft = reactive({
  name: '',
  role: '',
  section: '',
  email: '',
  institution: '',
  region: '',
  sortOrder: 0
})

const grouped = computed(() => {
  const bySection = new Map<string, EditorialBoardMember[]>()
  for (const member of data.value.members) {
    const group = bySection.get(member.section) ?? []
    group.push(member)
    bySection.set(member.section, group)
  }
  return [...bySection.entries()]
    .map(([section, members]) => ({
      section,
      members: [...members].sort((a, b) => a.sortOrder - b.sortOrder)
    }))
    .sort((a, b) => (a.members[0]?.sortOrder ?? 0) - (b.members[0]?.sortOrder ?? 0))
})

function createMember() {
  clearFeedback()

  if (!form.name.trim() || !form.role.trim() || !form.section.trim()) {
    errorMessage.value = 'Name, role, and section are required.'
    return
  }

  return runAction(async () => {
    await $fetch('/api/editorial-board', {
      method: 'POST',
      body: {
        name: form.name,
        role: form.role,
        section: form.section,
        email: form.email || null,
        institution: form.institution || null,
        region: form.region || null,
        sortOrder: form.sortOrder
      }
    })
    form.name = ''
    form.role = ''
    form.section = ''
    form.email = ''
    form.institution = ''
    form.region = ''
    form.sortOrder = 0
    await refresh()
  }, 'Editorial board member added.', 'Unable to add editorial board member.')
}

function startEdit(member: EditorialBoardMember) {
  clearFeedback()
  editingId.value = member.id
  draft.name = member.name
  draft.role = member.role
  draft.section = member.section
  draft.email = member.email ?? ''
  draft.institution = member.institution ?? ''
  draft.region = member.region ?? ''
  draft.sortOrder = member.sortOrder
}

function cancelEdit() {
  editingId.value = ''
}

function saveMember(id: string) {
  return runAction(async () => {
    await $fetch(`/api/editorial-board/${id}`, {
      method: 'PATCH',
      body: {
        name: draft.name,
        role: draft.role,
        section: draft.section,
        email: draft.email || null,
        institution: draft.institution || null,
        region: draft.region || null,
        sortOrder: draft.sortOrder
      }
    })
    editingId.value = ''
    await refresh()
  }, 'Editorial board member updated.', 'Unable to update editorial board member.')
}

function toggleActive(member: EditorialBoardMember) {
  const successMessage = member.isActive ? 'Member hidden from the public page.' : 'Member shown on the public page.'

  return runAction(async () => {
    await $fetch(`/api/editorial-board/${member.id}`, {
      method: 'PATCH',
      body: { isActive: !member.isActive }
    })
    await refresh()
  }, successMessage, 'Unable to update visibility.')
}

function deleteMember(member: EditorialBoardMember) {
  clearFeedback()

  if (!confirm(`Permanently remove "${member.name}" from the editorial board?`)) {
    return
  }

  return runAction(async () => {
    await $fetch(`/api/editorial-board/${member.id}`, { method: 'DELETE' })
    await refresh()
  }, 'Editorial board member removed.', 'Unable to remove editorial board member.')
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <h2 class="text-base font-semibold text-highlighted">
          Add editorial board member
        </h2>
      </template>
      <form
        class="grid gap-4 md:grid-cols-12 md:items-end"
        @submit.prevent="createMember"
      >
        <UFormField
          class="md:col-span-3"
          label="Name"
          required
        >
          <UInput
            v-model="form.name"
            type="text"
            placeholder="Full name"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-3"
          label="Role / title"
          required
        >
          <UInput
            v-model="form.role"
            type="text"
            placeholder="e.g. Associate Editor"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-3"
          label="Section"
          required
        >
          <UInput
            v-model="form.section"
            type="text"
            list="editorial-board-sections"
            placeholder="e.g. Leadership, Associate Editors"
            required
            class="w-full"
          />
          <datalist id="editorial-board-sections">
            <option
              v-for="section in knownSections"
              :key="section"
              :value="section"
            />
          </datalist>
        </UFormField>
        <UFormField
          class="md:col-span-3"
          label="Display order"
        >
          <UInput
            v-model.number="form.sortOrder"
            type="number"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-4"
          label="Email"
        >
          <UInput
            v-model="form.email"
            type="email"
            placeholder="Optional"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-4"
          label="Institution"
        >
          <UInput
            v-model="form.institution"
            type="text"
            placeholder="Optional"
            class="w-full"
          />
        </UFormField>
        <UFormField
          class="md:col-span-4"
          label="Region"
        >
          <UInput
            v-model="form.region"
            type="text"
            placeholder="Optional"
            class="w-full"
          />
        </UFormField>
        <div class="md:col-span-12">
          <UButton
            type="submit"
            color="primary"
            :loading="saving"
            :disabled="saving"
          >
            Add member
          </UButton>
        </div>
      </form>
    </UCard>

    <div
      v-if="message || errorMessage"
      class="space-y-3"
    >
      <UAlert
        v-if="message"
        color="success"
        variant="subtle"
        icon="i-lucide-circle-check"
        :title="message"
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="errorMessage"
      />
    </div>

    <UCard
      v-for="group in grouped"
      :key="group.section"
    >
      <template #header>
        <h2 class="text-base font-semibold text-highlighted">
          {{ group.section }}
        </h2>
      </template>

      <div
        v-for="member in group.members"
        :key="member.id"
        class="mb-5 border-b border-default pb-5 last:mb-0 last:border-0 last:pb-0"
      >
        <template v-if="editingId === member.id">
          <div class="grid gap-3 md:grid-cols-12 md:items-end">
            <UFormField
              class="md:col-span-3"
              label="Name"
            >
              <UInput
                v-model="draft.name"
                type="text"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-3"
              label="Role / title"
            >
              <UInput
                v-model="draft.role"
                type="text"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-3"
              label="Section"
            >
              <UInput
                v-model="draft.section"
                type="text"
                list="editorial-board-sections"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-3"
              label="Display order"
            >
              <UInput
                v-model.number="draft.sortOrder"
                type="number"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-4"
              label="Email"
            >
              <UInput
                v-model="draft.email"
                type="email"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-4"
              label="Institution"
            >
              <UInput
                v-model="draft.institution"
                type="text"
                class="w-full"
              />
            </UFormField>
            <UFormField
              class="md:col-span-4"
              label="Region"
            >
              <UInput
                v-model="draft.region"
                type="text"
                class="w-full"
              />
            </UFormField>
            <div class="md:col-span-12 flex gap-2">
              <UButton
                type="button"
                color="primary"
                :loading="saving"
                :disabled="saving"
                @click="saveMember(member.id)"
              >
                Save
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="outline"
                :disabled="saving"
                @click="cancelEdit"
              >
                Cancel
              </UButton>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="flex items-center gap-2 font-semibold text-highlighted">
                {{ member.name }}
                <UBadge
                  v-if="!member.isActive"
                  color="neutral"
                  variant="subtle"
                  label="Hidden"
                />
              </p>
              <p class="text-xs font-medium tracking-wide text-primary-700 uppercase">
                {{ member.role }}
              </p>
              <p
                v-if="member.institution || member.region"
                class="mt-1 text-xs text-muted"
              >
                {{ [member.institution, member.region].filter(Boolean).join(' — ') }}
              </p>
              <p
                v-if="member.email"
                class="text-xs text-muted"
              >
                {{ member.email }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UButton
                type="button"
                color="primary"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="startEdit(member)"
              >
                Edit
              </UButton>
              <UButton
                type="button"
                :color="member.isActive ? 'warning' : 'success'"
                variant="outline"
                size="sm"
                :disabled="saving"
                @click="toggleActive(member)"
              >
                {{ member.isActive ? 'Hide' : 'Show' }}
              </UButton>
              <UButton
                type="button"
                icon="i-lucide-trash-2"
                color="error"
                variant="outline"
                size="sm"
                :disabled="saving"
                :aria-label="`Remove ${member.name}`"
                @click="deleteMember(member)"
              />
            </div>
          </div>
        </template>
      </div>
    </UCard>
  </div>
</template>
