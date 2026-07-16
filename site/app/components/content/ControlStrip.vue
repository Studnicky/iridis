<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  class?: string;
}>();
</script>

<template>
  <div
    class="rounded-md border border-default p-2.5"
    :class="$props.class"
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 flex-col">
        <span class="text-sm font-medium text-highlighted">{{ title }}</span>
        <span
          v-if="description"
          class="text-xs text-muted"
        >
          {{ description }}
        </span>
      </div>
      <slot />
    </div>
    <slot name="footer" />
  </div>
</template>
