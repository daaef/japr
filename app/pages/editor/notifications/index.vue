<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: ['admin', 'editor_in_chief', 'managing_editor', 'copy_desk_editor']
})

await navigateTo('/notifications', { replace: true })
</script>
