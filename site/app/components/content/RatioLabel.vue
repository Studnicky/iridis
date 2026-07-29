<script setup lang="ts">
defineProps<{
  value: number;
  class?: string;
}>();
</script>

<template>
  <span
    class="text-[10px] text-muted"
    :class="$props.class"
  >
    Ratio {{ value.toFixed(2) }}
  </span>
</template>
