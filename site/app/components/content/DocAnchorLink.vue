<script setup lang="ts">
const { href } = defineProps<{ href: string }>();
</script>

<template>
  <a
    :href="href"
    class="text-primary hover:underline"
  >
    <slot />
  </a>
</template>
