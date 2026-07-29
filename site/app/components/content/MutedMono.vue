<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <span
    class="font-mono text-xs text-muted"
    :class="$props.class"
  >
    <slot />
  </span>
</template>
