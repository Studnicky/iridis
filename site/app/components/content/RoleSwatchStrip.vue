<script setup lang="ts">
defineProps<{
  roles: readonly { name: string; hex: string }[];
  class?: string;
}>();
</script>

<template>
  <div
    class="flex flex-wrap gap-1"
    :class="$props.class"
  >
    <SwatchChip
      v-for="role in roles"
      :key="role.name"
      :hex="role.hex"
      class="h-5 w-5 rounded border border-default"
      :title="role.name"
      :aria-label="`${role.name} ${role.hex}`"
    />
  </div>
</template>
