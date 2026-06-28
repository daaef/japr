<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin']
})

await navigateTo('/notifications', { replace: true })
</script>
