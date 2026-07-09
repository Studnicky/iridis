<script setup lang="ts">
import type { ModeType } from '~/composables/types/mode.ts';

import { useIridis } from '~/composables/useIridis.ts';

/**
 * Mode selector. The demo is EITHER a color picker OR an image extractor, never
 * both — each mode owns its own palette, and switching swaps which palette themes
 * the page (the engine re-runs against the newly-active seeds). A tab pair, not a
 * button group — matches every other choice-between-two/many surface on the site
 * (Multi-output's format tabs, the carousel's own tab-styled dots).
 */
const { mode } = useIridis();

const items = [
  { 'icon': 'i-material-symbols-palette-outline-rounded', 'label': 'Color picker', 'value': 'picker' },
  { 'icon': 'i-material-symbols-add-photo-alternate-outline-rounded', 'label': 'Image', 'value': 'image' }
];
</script>

<template>
  <UTabs
    :model-value="mode"
    :items="items"
    :content="false"
    size="sm"
    @update:model-value="mode = ($event as ModeType)"
  />
</template>
