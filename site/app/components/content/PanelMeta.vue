<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <div
    class="mb-1 flex justify-end"
    :class="$props.class"
  >
    <slot />
  </div>
</template>
