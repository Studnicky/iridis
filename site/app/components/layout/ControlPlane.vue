<script setup lang="ts">
defineProps<{
  label: string;
  help?: string;
}>();
</script>

<template>
  <InfoPanel
    role="group"
    variant="control"
    :label="label"
    :help="help"
  >
    <slot />
  </InfoPanel>
</template>
