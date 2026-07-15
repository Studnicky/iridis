<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Mode selector. The demo is EITHER a color picker OR an image extractor, never
 * both — each mode owns its own palette, and switching swaps which palette themes
 * the page (the engine re-runs against the newly-active seeds). A tab pair, not a
 * button group — matches every other choice-between-two/many surface on the site
 * (Multi-output's format tabs, the carousel's own tab-styled dots).
 */
const { mode } = useIridis();

const tabItems = [
  { label: 'Build a palette', icon: 'i-material-symbols-palette-outline', value: '0' },
  { label: 'Extract from image', icon: 'i-material-symbols-image-outline-rounded', value: '1' }
];

// Returns a STRING to match tabItems' string `value`s — Reka's TabsTrigger
// selects on strict equality against TabsRoot's modelValue, so a numeric
// getter here (`'0' === 0` is false) would leave every trigger permanently
// unselected and the [data-state='active'] CSS would never apply.
const activeTab = computed({
  get: () => mode.value === 'picker' ? '0' : '1',
  set: (val: number | string) => {
    mode.value = Number(val) === 0 ? 'picker' : 'image';
  }
});

</script>

<template>
  <div class="flex justify-center w-full mb-6">
    <UTabs
      v-model="activeTab"
      :items="tabItems"
      :content="false"
      class="w-full max-w-sm output-tabs"
      :ui="{ indicator: 'hidden' }"
    />
  </div>
</template>

<style scoped>
.output-tabs :deep([role='tablist']) {
  flex-wrap: wrap;
  height: auto;
  width: 100%;
}
.output-tabs :deep([role='tab']) {
  flex: 1 1 0%;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease, color 0.2s ease;
  padding: 0.5rem;
}
.output-tabs :deep([role='tab'][data-state='active']) {
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
}
</style>
