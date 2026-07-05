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
        <h2 class="mt-8 text-2xl font-bold text-gray-900">
          Set a new password
        </h2>

        <form
          class="mt-6 space-y-6"
          @submit.prevent="resetPassword"
        >
          <div>
            <label class="block text-sm font-medium text-gray-900">New password</label>
            <input
              v-model="password"
              v-bind="passwordAttrs"
              type="password"
              class="form-control mt-2"
            >
            <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
          </div>

          <div
            v-if="errorMessage"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100"
            :disabled="loading"
          >
            {{ loading ? 'Updating...' : 'Update password' }}
          </button>
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
