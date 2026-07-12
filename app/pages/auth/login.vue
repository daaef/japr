<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { authClient } from '~~/lib/auth-client'
import { extractApiErrorMessage } from '~/utils/extractApiErrorMessage'
import { resolveWorkspacePath } from '~/utils/workspace'
import { signInSchema } from '#shared/validation/auth'

definePageMeta({
  layout: 'auth',
  middleware: ['guest']
})

const route = useRoute()
const { data: currentUser, refresh } = useCurrentUser()

const { defineField, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(signInSchema),
  initialValues: { email: '', password: '' }
})

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const showPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)

const activated = computed(() => route.query.activated === '1')

async function redirectToActivation(email: string) {
  try {
    await $fetch('/api/auth/resend-activation', {
      method: 'POST',
      body: { email }
    })
  } catch {
    // Activation page still works if resend fails.
  }

  await navigateTo({
    path: '/auth/activate',
    query: { email, resent: '1' }
  })
}

async function signInWithGoogle() {
  errorMessage.value = ''
  loading.value = true

  // With no explicit redirect target, land back on this page: the `guest` middleware
  // (already applied to this page) sends an authenticated user to resolveWorkspacePath(...)
  // itself, so a brand-new Google author with no interests correctly lands on
  // /author/interests instead of a hardcoded /author.
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
    ? route.query.redirect
    : '/auth/login'

  try {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirect
    })
  } catch (error) {
    const message = extractApiErrorMessage(error, 'Google sign-in is unavailable.')
    if (message.toLowerCase().includes('activate')) {
      await redirectToActivation(email.value ?? '')
      return
    }
    errorMessage.value = message
  } finally {
    loading.value = false
  }
}

const submit = handleSubmit(async (values) => {
  errorMessage.value = ''
  loading.value = true

  try {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password
    })

    if (error) {
      const message = error.message || 'Unable to sign in.'
      if (message.toLowerCase().includes('activate')) {
        await redirectToActivation(values.email)
        return
      }
      errorMessage.value = message
      return
    }

    await refresh()
    await refreshNuxtData('current-user')

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    if (redirect?.startsWith('/api/')) {
      await navigateTo(redirect, { external: true })
      return
    }
    if (redirect?.startsWith('/')) {
      await navigateTo(redirect)
      return
    }

    await navigateTo(resolveWorkspacePath(currentUser.value.roles, {
      hasInterests: currentUser.value.hasInterests
    }))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <header class="lg:grid grid-cols-2 min-h-screen">
    <div class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
      <div class="mx-auto w-full max-w-sm lg:w-96">
        <div>
          <img
            class="h-16 w-auto"
            src="/images/japr-logo.png"
            alt="JAPR"
          >
          <h2 class="mt-7 font-serif text-[28px] leading-tight font-semibold text-highlighted">
            Welcome back
          </h2>
          <p class="mt-2 text-sm text-muted">
            Sign in to continue to your JAPR workspace.
          </p>
        </div>

        <UAlert
          v-if="activated"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          class="mt-4"
          title="Account activated. You can sign in now."
        />

        <form
          class="mt-6 space-y-6"
          @submit.prevent="submit"
        >
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
            label="Password"
            :error="errors.password"
          >
            <UInput
              v-model="password"
              v-bind="passwordAttrs"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
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

          <div class="text-sm leading-6">
            <NuxtLink
              to="/auth/forgot-password"
              class="font-semibold text-primary hover:text-primary/80"
            >
              Forgot password?
            </NuxtLink>
          </div>

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
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </UButton>

          <UButton
            type="button"
            color="neutral"
            variant="outline"
            size="lg"
            block
            :disabled="loading"
            @click="signInWithGoogle"
          >
            Continue with Google
          </UButton>

          <p class="text-center text-sm text-muted">
            Don't have an account yet?
            <NuxtLink
              to="/auth/register"
              class="text-primary font-medium hover:underline"
            >
              Sign up here
            </NuxtLink>
          </p>
        </form>
      </div>
    </div>
    <AuthPhotoPanel
      image="/images/loginImg.png"
      quote="A gateway to African policy scholarship, open to readers everywhere."
    />
  </header>
</template>
