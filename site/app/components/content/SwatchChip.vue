<script setup lang="ts">
defineProps<{
  hex: string;
  title?: string;
  ariaLabel?: string;
  class?: string;
}>();
</script>

<template>
  <span
    :class="$props.class ?? 'h-5 w-5 rounded border border-default'"
    :style="{ backgroundColor: hex }"
    :title="title ?? hex"
    role="img"
    :aria-label="ariaLabel ?? title ?? hex"
  />
</template>
