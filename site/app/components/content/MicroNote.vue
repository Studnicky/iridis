<script setup lang="ts">
defineProps<{
  class?: string;
}>();
</script>

<template>
  <div
    class="text-[10px] text-dimmed"
    :class="$props.class"
  >
    <slot />
  </div>
</template>
