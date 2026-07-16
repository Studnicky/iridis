<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <div
    class="mb-3 flex items-start justify-between gap-2"
    :class="$props.class"
  >
    <div class="min-w-0 flex-1">
      <slot />
    </div>
    <div
      v-if="$slots.meta"
      class="flex-none"
    >
      <slot name="meta" />
    </div>
  </div>
</template>
