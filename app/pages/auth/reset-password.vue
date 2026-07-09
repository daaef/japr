<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { authClient } from '~~/lib/auth-client'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { resetPasswordSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const route = useRoute()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(resetPasswordSchema),
  initialValues: { password: '' }
})

const [password, passwordAttrs] = defineField('password')

const errorMessage = ref('')
const loading = ref(false)

const resetPassword = handleSubmit(async (values) => {
  if (!token.value) {
    await navigateTo('/auth/forgot-password')
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const { error } = await authClient.resetPassword({
      token: token.value,
      newPassword: values.password
    })

    if (error) {
      errorMessage.value = error.message || 'Unable to reset your password.'
      return
    }

    await navigateTo('/auth/success-reset')
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to reset your password.')
  } finally {
    loading.value = false
  }
})

onMounted(() => {
  if (!token.value) {
    navigateTo('/auth/forgot-password', { replace: true })
  }
})
</script>

<template>
  <header class="lg:grid grid-cols-2 min-h-screen">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <img
          class="h-20 w-auto"
          src="/images/japr-logo.png"
          alt="JAPR"
        >
        <h2 class="mt-8 text-2xl font-bold text-highlighted">
          Set a new password
        </h2>

        <form
          class="mt-6 space-y-6"
          @submit.prevent="resetPassword"
        >
          <UFormField
            label="New password"
            :error="errors.password"
          >
            <UInput
              v-model="password"
              v-bind="passwordAttrs"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••••"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="errorMessage"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="loading"
          >
            {{ loading ? 'Updating...' : 'Update password' }}
          </UButton>
        </form>
      </div>
    </div>
    <div class="relative hidden w-full flex-1 lg:block">
      <img
        class="absolute inset-0 h-full w-full object-cover"
        src="/images/loginImg.png"
        alt=""
      >
    </div>
  </header>
</template>
