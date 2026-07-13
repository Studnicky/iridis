<script setup lang="ts">
defineProps<{
  label: string;
  help?: string;
}>();
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="rounded-lg border border-primary/20 bg-primary/[0.03] p-4"
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
