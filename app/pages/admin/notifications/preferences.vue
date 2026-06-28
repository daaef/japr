<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

await navigateTo('/notifications/preferences', { replace: true })
</script>
