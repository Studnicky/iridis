<script setup lang="ts">
/**
 * IridisCode.vue
 *
 * Code-behind block. Pairs with an adjacent IridisDemo so the reader can see
 * the actual code that drives what they're looking at. Show/hide toggle.
 *
 * Usage in markdown:
 *   <IridisCode label="Pipeline construction">
 *     ```ts
 *     import { engine, coreTasks } from '@studnicky/iridis';
 *     ...
 *     ```
 *   </IridisCode>
 *
 * Vitepress's markdown-it pass already produces a Shiki-highlighted block
 * inside the slot; we just frame it.
 */

import { ref } from 'vue';

withDefaults(defineProps<{
  'label'?:        string;
  'startOpen'?:    boolean;
}>(), {
  'label':     'Code behind',
  'startOpen': false,
});

const open = ref(false);
</script>

<template>
  <section class="iridis-code">
    <button
      class="iridis-code__toggle"
      type="button"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="iridis-code__chevron" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
      <span class="iridis-code__label">{{ label }}</span>
    </button>
    <div v-show="open" class="iridis-code__panel">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.iridis-code {
  margin: 0.4rem 0 1.5rem;
}
.iridis-code__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.78rem;
}
.iridis-code__toggle:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.iridis-code__chevron {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
.iridis-code__label {
  font-weight: 600;
}
.iridis-code__panel {
  margin-top: 0.5rem;
}
.iridis-code__panel :deep(div[class*='language-']) {
  margin: 0;
}
</style>
