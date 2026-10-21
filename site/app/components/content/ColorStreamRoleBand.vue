<script setup lang="ts">
defineProps<{
  label: string;
}>();
</script>

<template>
  <div
    class="rounded border border-default bg-elevated/70 px-3 py-2 text-sm"
    role="listitem"
  >
    <p class="font-medium text-highlighted">
      {{ label }}
    </p>
    <p class="mt-1 text-xs text-muted">
      Engine-driven chroma drift · CSS lerp (naive RGB) · OKLCH engine
    </p>
  </div>
</template>
