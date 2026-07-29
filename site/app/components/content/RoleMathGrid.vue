<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

defineProps<{
  roles: readonly RoleMathEntryType[];
  openRoleName: string | null;
}>();

const emit = defineEmits<{
  toggle: [roleName: string];
}>();
</script>

<template>
  <div class="role-grid columns-1 md:columns-2 xl:columns-3">
    <RoleMathCard
      v-for="role in roles"
      :key="role.name"
      :role="role"
      :is-open="openRoleName === role.name"
      @toggle="emit('toggle', role.name)"
    />
  </div>
</template>

<style scoped>
.role-grid {
  column-gap: 0.75rem;
}
</style>
