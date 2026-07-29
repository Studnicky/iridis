<script setup lang="ts">
defineProps<{
  label: string;
  help?: string;
}>();
</script>

<template>
  <InfoPanel
    role="region"
    variant="showcase"
    :label="label"
    :help="help"
  >
    <slot />
  </InfoPanel>
</template>
