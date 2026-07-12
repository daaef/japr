<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { authClient } from '~~/lib/auth-client'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { forgotPasswordSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(forgotPasswordSchema),
  initialValues: { email: '' }
})

const [email, emailAttrs] = defineField('email')

const errorMessage = ref('')
const loading = ref(false)

const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  loading.value = true

  try {
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${useRuntimeConfig().public.baseUrl}/auth/reset-password`
    })

    if (error) {
      errorMessage.value = error.message || 'Unable to send reset email.'
      return
    }

    await navigateTo({
      path: '/auth/success-reset-request',
      query: { email: values.email }
    })
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to send reset email.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <header class="lg:grid grid-cols-2 min-h-screen">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <img
          class="h-16 w-auto"
          src="/images/japr-logo.png"
          alt="JAPR"
        >
        <h2 class="mt-7 font-serif text-[26px] leading-tight font-semibold text-highlighted">
          Reset your password
        </h2>
        <p class="mt-2 text-sm text-muted">
          Enter your email and we'll send you a reset link.
        </p>

        <form
          class="mt-6 space-y-6"
          @submit.prevent="submit"
        >
          <UFormField
            label="Email"
            :error="errors.email"
          >
            <UInput
              v-model="email"
              v-bind="emailAttrs"
              type="email"
              autocomplete="email"
              placeholder="name@example.com"
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
            {{ loading ? 'Sending...' : 'Send reset link' }}
          </UButton>

          <p class="text-center text-sm">
            <NuxtLink
              to="/auth/login"
              class="text-primary hover:underline"
            >
              Back to sign in
            </NuxtLink>
          </p>
        </form>
      </div>
    </div>
    <AuthPhotoPanel image="/images/loginImg.png" />
  </header>
</template>
