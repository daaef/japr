// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@vee-validate/nuxt',
    '@nuxt/image'
  ],

  // Every component filename under app/components/** is already globally unique (verified),
  // so bare filenames are safe as component names. Without this, Nuxt's default folder-path
  // prefixing silently registers e.g. app/components/dashboard/JournalStatusBadge.vue as
  // <DashboardJournalStatusBadge>, not the <JournalStatusBadge> every template actually uses —
  // the component then renders as an empty unresolved tag with no build-time error.
  components: [
    { path: '~/components', pathPrefix: false }
  ],

  // Force light mode for the Nuxt UI migration. Color mode was previously unconfigured, so
  // @nuxtjs/color-mode (bundled by @nuxt/ui) defaulted to `preference: 'system'` — an OS-dark
  // visitor got a broken half-dark UI (only 1 `dark:` variant exists app-wide; the legacy
  // theme's ported CSS used hardcoded light hex that never flips). Whether the product supports
  // dark mode is a redesign (Track 2) decision; until then, pin light.
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/journal.css'
  ],

  runtimeConfig: {
    databaseUrl: '',
    betterAuthSecret: '',
    betterAuthUrl: 'http://localhost:3000',
    resendApiKey: '',
    resendFrom: 'journal@example.com',
    mailDomain: 'journal.local',
    emailTransport: 'local',
    localMailDir: '.data/mail',
    uploadDir: './uploads',
    maxFileSizeMb: 10,
    allowedMimeTypes: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pandocPath: 'pandoc',
    googleClientId: '',
    googleClientSecret: '',
    defaultAdminEmail: 'admin@example.com',
    defaultAdminPassword: 'password',
    public: {
      appName: 'JAPR',
      appDescription: 'Journal of African Policy Review',
      baseUrl: 'http://localhost:3000',
      // Dev/demo mail inbox (reads captured .data/mail). Off by default.
      // Enable with NUXT_PUBLIC_ENABLE_MAIL_VIEWER=true — public, no login required.
      enableMailViewer: false,
      // Upload manuscripts straight to Vercel Blob from the browser (bypasses the
      // ~4.5MB serverless body limit). Enable on Vercel with NUXT_PUBLIC_DIRECT_UPLOAD=true
      // alongside STORAGE_DRIVER=blob. Off by default → classic server multipart upload.
      directUpload: false
    }
  },

  compatibilityDate: '2025-01-15',

  routeRules: {
    '/login': { redirect: { to: '/auth/login', statusCode: 301 } }
  },

  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap' }
      ]
    }
  }
})
