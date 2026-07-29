<script setup lang="ts">
defineProps<{
  title: string;
  as?: 'div' | 'p' | 'span';
}>();
</script>

<template>
  <component
    :is="as ?? 'p'"
    class="text-xs font-medium uppercase tracking-wide text-dimmed"
  >
    {{ title }}
  </component>
</template>
