<script setup lang="ts">
import { EDITOR_ROLES } from '#shared/constants/roles'

definePageMeta({
  middleware: ['auth', 'role'],
  requiredRoles: EDITOR_ROLES
})

await navigateTo('/notifications', { replace: true })
</script>
