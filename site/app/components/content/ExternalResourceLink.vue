<script setup lang="ts">
const { compact = false, href } = defineProps<{
  href: string;
  compact?: boolean;
}>();
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :class="compact
      ? 'text-primary underline underline-offset-2 hover:text-primary/80'
      : 'inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:text-primary/80'"
  >
    <slot />
  </a>
</template>
