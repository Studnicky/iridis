<script setup lang="ts">
defineProps<{
  class?: string;
  label: string;
}>();
</script>

<template>
  <div
    class="space-y-1"
    :class="$props.class"
  >
    <div class="text-[11px] font-mono text-dimmed">
      {{ label }}
    </div>
    <slot />
  </div>
</template>
