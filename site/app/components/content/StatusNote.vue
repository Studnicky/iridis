<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <div
    class="text-xs text-muted italic"
    :class="$props.class"
  >
    <slot />
  </div>
</template>
