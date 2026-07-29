<script setup lang="ts">
const props = defineProps<{
  currentRole: string | undefined;
  index: number;
  roles: readonly string[];
  seedRoles: readonly (string | undefined)[];
}>();

const emit = defineEmits<{
  pin: [index: number, role: string | undefined];
}>();

function isTaken(role: string): boolean {
  return props.seedRoles.some((seedRole, seedIndex) => seedIndex !== props.index && seedRole === role);
}
</script>

<template>
  <UPopover
    mode="hover"
    :content="{ align: 'start' }"
  >
    <UButton
      :label="currentRole ?? 'Unpinned'"
      trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
      size="xs"
      :color="currentRole ? 'primary' : 'neutral'"
      variant="soft"
      class="w-full justify-between rounded-full"
    />
    <template #content>
      <div class="flex max-h-64 max-w-56 flex-wrap gap-1 overflow-y-auto p-2">
        <UButton
          label="Unpinned"
          size="xs"
          :color="currentRole ? 'neutral' : 'primary'"
          :variant="currentRole ? 'soft' : 'solid'"
          class="rounded-full"
          @click="emit('pin', index, undefined)"
        />
        <UButton
          v-for="role in roles"
          :key="role"
          :label="role"
          size="xs"
          :color="currentRole === role ? 'primary' : (isTaken(role) ? 'warning' : 'neutral')"
          :variant="currentRole === role ? 'solid' : 'soft'"
          class="rounded-full"
          @click="emit('pin', index, currentRole === role ? undefined : role)"
        />
      </div>
    </template>
  </UPopover>
</template>
