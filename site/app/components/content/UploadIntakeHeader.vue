<script setup lang="ts">
const emit = defineEmits<{
  skip: [];
}>();
</script>

<template>
  <SplitHeader align="start">
    <p class="text-sm text-muted">
      Extract a palette from one or more images — upload them or try a sample. Each image is decoded and reduced to its own dominant colors independently, with its own extraction settings; the Combine stage right after this one merges every image's result into one final palette.
    </p>
    <template #meta>
      <UButton
        icon="i-material-symbols-skip-next-rounded"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('skip')"
      >
        Skip
      </UButton>
    </template>
  </SplitHeader>
</template>
