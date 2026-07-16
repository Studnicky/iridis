<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <p
    class="mt-3 text-xs text-muted"
    :class="$props.class"
  >
    <slot />
  </p>
</template>
