<script setup lang="ts">
defineProps<{
  label: string;
  help?: string;
}>();
</script>

<template>
  <div
    role="region"
    :aria-label="label"
    class="rounded-lg bg-elevated/30 p-4"
  >
    <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
      {{ label }}
    </p>
    <p
      v-if="help"
      class="mt-1 text-sm text-muted"
    >
      {{ help }}
    </p>
    <div class="mt-3">
      <slot />
    </div>
  </div>
</template>
