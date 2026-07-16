<script setup lang="ts">
defineProps<{
  hex: string;
  ariaLabel?: string;
}>();
</script>

<template>
  <div class="relative flex flex-col gap-2 rounded-lg border border-default bg-elevated/50 p-2.5">
    <slot name="overlay" />
    <SwatchSummaryRow
      :hex="hex"
      :aria-label="ariaLabel"
    >
      <template #default>
        <slot name="summary">
          <span class="truncate font-mono text-xs text-muted">{{ hex }}</span>
        </slot>
      </template>
    </SwatchSummaryRow>
    <slot />
  </div>
</template>
