<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { signUpSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(signUpSchema),
  initialValues: {
    fullname: '',
    username: '',
    institution: '',
    email: '',
    country: '',
    password: '',
    confirmPassword: ''
  }
})

const [fullname, fullnameAttrs] = defineField('fullname')
const [username, usernameAttrs] = defineField('username')
const [institution, institutionAttrs] = defineField('institution')
const [email, emailAttrs] = defineField('email')
const [country, countryAttrs] = defineField('country')
const [password, passwordAttrs] = defineField('password')
const [confirmPassword, confirmPasswordAttrs] = defineField('confirmPassword')

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)

const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/sign-up', {
      method: 'POST',
      body: values
    })

    await navigateTo({
      path: '/auth/success-activation',
      query: { email: values.email }
    })
  } catch (error) {
    errorMessage.value = extractApiErrorMessage(error, 'Unable to create this account.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <header class="h-screen lg:grid grid-cols-2">
    <div class="flex justify-center h-full px-4 overflow-y-auto sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="w-full max-w-sm py-12 mx-auto lg:w-96">
        <div>
          <img
            class="w-auto h-16"
            src="/images/japr-logo.png"
            alt="JAPR"
          >
          <h2 class="mt-7 font-serif text-[28px] leading-tight font-semibold text-highlighted">
            Create your account
          </h2>
          <p class="mt-2 text-sm text-muted">
            Join JAPR to submit manuscripts and track reviews.
          </p>
        </div>

        <form
          class="pt-6 pb-10 space-y-6"
          @submit.prevent="submit"
        >
          <UFormField
            label="Full Name"
            :error="errors.fullname"
          >
            <UInput
              v-model="fullname"
              v-bind="fullnameAttrs"
              type="text"
              placeholder="Enter your full name"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Username"
            :error="errors.username"
          >
            <UInput
              v-model="username"
              v-bind="usernameAttrs"
              type="text"
              placeholder="Enter your Username"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Institution"
            :error="errors.institution"
          >
            <UInput
              v-model="institution"
              v-bind="institutionAttrs"
              type="text"
              placeholder="Enter your Institution"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Email address"
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

          <UFormField
            label="Country"
            :error="errors.country"
          >
            <CountrySelect
              v-model="country"
              v-bind="countryAttrs"
              variant="auth"
            />
          </UFormField>

          <UFormField
            label="Password"
            :error="errors.password"
          >
            <UInput
              v-model="password"
              v-bind="passwordAttrs"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••••"
              size="lg"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            label="Confirm Password"
            :error="errors.confirmPassword"
          >
            <UInput
              v-model="confirmPassword"
              v-bind="confirmPasswordAttrs"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••••"
              size="lg"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
                  @click="showConfirmPassword = !showConfirmPassword"
                />
              </template>
            </UInput>
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
            {{ loading ? 'Signing up...' : 'Sign up' }}
          </UButton>

          <p class="text-center text-sm text-muted">
            Already have an account?
            <NuxtLink
              to="/auth/login"
              class="text-primary font-medium hover:underline"
            >
              Sign in
            </NuxtLink>
          </p>
        </form>
      </div>
    </div>
    <AuthPhotoPanel
      image="/images/registerImg.png"
      quote="Rigorous peer review. Pan-African reach. Immediate open access."
    />
  </header>
</template>
