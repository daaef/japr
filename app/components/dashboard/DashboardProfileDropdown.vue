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
const root = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

function onSignOut() {
  close()
  emit('signOut')
}

onMounted(() => {
  const onDocumentClick = (event: MouseEvent) => {
    if (!open.value) {
      return
    }

    const target = event.target as Node | null
    if (root.value && target && !root.value.contains(target)) {
      close()
    }
  }

  document.addEventListener('click', onDocumentClick)

  onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick)
  })
})
</script>

<template>
  <div
    ref="root"
    class="dropdown position-relative"
  >
    <button
      type="button"
      class="users arrow-down-icon border border-gray-200 rounded-pill p-4 d-inline-block pe-40 position-relative"
      :aria-expanded="open"
      @click.stop="toggle"
    >
      {{ displayName }}
    </button>

    <div
      v-show="open"
      class="dropdown-menu dropdown-menu--lg border-0 bg-transparent p-0 show end-0"
      style="display: block; position: absolute; top: 100%; right: 0; z-index: 1050; margin-top: 0.25rem;"
    >
      <div class="card border border-gray-100 rounded-12 box-shadow-custom">
        <div class="card-body">
          <div class="flex-align gap-8 mb-20 pb-20 border-bottom border-gray-100">
            <div>
              <h4 class="my-0 mb-0">
                {{ fullName || displayName }}
              </h4>
            </div>
          </div>
          <ul class="max-h-270 overflow-y-auto scroll-sm pl-0 mb-0 list-unstyled">
            <li class="mb-4">
              <NuxtLink
                :to="settingsPath"
                class="py-12 text-15 px-20 hover-bg-gray-50 text-gray-300 rounded-8 flex-align gap-8 fw-medium text-15"
                @click="close"
              >
                <span class="text-2xl text-primary-600 d-flex"><i class="ph ph-gear" /></span>
                <span class="text">Account Settings</span>
              </NuxtLink>
            </li>
            <li class="pt-8 border-top border-gray-100">
              <button
                type="button"
                class="py-12 text-15 px-20 hover-bg-danger-50 text-gray-300 hover-text-danger-600 rounded-8 flex-align gap-8 fw-medium text-15 w-100 border-0 bg-transparent"
                @click="onSignOut"
              >
                <span class="text-2xl text-danger-600 d-flex"><i class="ph ph-sign-out" /></span>
                <span class="text">Log Out</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
