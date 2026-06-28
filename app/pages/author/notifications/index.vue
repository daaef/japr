<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['author', 'admin']
})

await navigateTo('/notifications', { replace: true })
</script>
