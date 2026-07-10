<script setup lang="ts">
definePageMeta({
  layout: 'public'
})
</script>

<template>
  <article class="max-w-4xl mx-auto">
    <UCard>
      <AppPageHeader
        title="Terms and Conditions"
        description="Effective Date: January 28, 2025"
      />

      <div class="mt-8 space-y-6 text-sm leading-7 text-muted">
        <section>
          <h2 class="text-xl font-semibold text-highlighted">
            1. Use of the Website
          </h2>
          <p class="mt-2">
            You may use this website solely for academic, professional, or personal purposes in accordance with these Terms. You agree not to misuse the website by uploading malicious content, accessing it through unauthorized methods, or disrupting website functionality.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-highlighted">
            2. Intellectual Property
          </h2>
          <p class="mt-2">
            All content, including articles, images, and logos, is the intellectual property of JAPR or its licensors. You may not reproduce, distribute, or modify website content without explicit permission.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-highlighted">
            3. Account Responsibilities
          </h2>
          <p class="mt-2">
            If you create an account, you are responsible for maintaining its confidentiality. Notify us immediately of any unauthorized access to your account.
          </p>
        </section>
      </div>
    </UCard>
  </article>
</template>
