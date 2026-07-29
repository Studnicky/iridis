<script setup lang="ts">
defineProps<{
  hex: string;
  ariaLabel?: string;
}>();
</script>

<template>
  <div class="flex items-center gap-2">
    <SwatchChip
      :hex="hex"
      class="h-10 w-10 flex-none rounded-md border border-default"
      :aria-label="ariaLabel ?? `Seed color ${hex}`"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <slot>
        <span class="truncate font-mono text-xs text-muted">{{ hex }}</span>
      </slot>
    </div>
  </div>
</template>
