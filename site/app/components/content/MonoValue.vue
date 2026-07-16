<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <span
    class="font-mono text-[11px] text-highlighted"
    :class="$props.class"
  >
    <slot />
  </span>
</template>
