<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';
import type { Mode } from '~/composables/useIridis.ts';

/**
 * Mode selector. The demo is EITHER a color picker OR an image extractor, never
 * both — each mode owns its own palette, and switching swaps which palette themes
 * the page (the engine re-runs against the newly-active seeds).
 */
const { mode } = useIridis();
function select(m: Mode): void { mode.value = m; }
</script>

<template>
  <UButtonGroup>
    <UButton
      icon="i-material-symbols-colorize-rounded"
      :color="mode === 'picker' ? 'primary' : 'neutral'"
      :variant="mode === 'picker' ? 'solid' : 'outline'"
      @click="select('picker')"
    >Color picker</UButton>
    <UButton
      icon="i-material-symbols-image-rounded"
      :color="mode === 'image' ? 'primary' : 'neutral'"
      :variant="mode === 'image' ? 'solid' : 'outline'"
      @click="select('image')"
    >Image</UButton>
  </UButtonGroup>
</template>
