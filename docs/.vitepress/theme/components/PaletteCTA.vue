<script setup lang="ts">
/**
 * PaletteCTA.vue
 *
 * Designer-first call-to-action button. Opens the right panel via the
 * shared panelState store. On narrow viewports the panel is stacked
 * below content so the click also scrolls into view (handled by openPanel).
 */

import { panelOpen, openPanel } from '../stores/panelState.ts';
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="iridis-cta"
      :aria-pressed="panelOpen"
      @click="openPanel"
    >
      <span class="iridis-cta__label">{{ panelOpen ? 'Builder open ↘' : 'Build a palette →' }}</span>
    </button>
  </ClientOnly>
</template>

<style scoped>
.iridis-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.3rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  background: var(--iridis-brand);
  color: var(--iridis-on-brand);
  border: 1px solid var(--iridis-brand);
  border-radius: var(--iridis-radius-md);
  cursor: pointer;
  box-shadow: var(--iridis-shadow-felt);
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    filter           var(--iridis-transition),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
}
.iridis-cta:hover {
  filter: brightness(1.08);
  box-shadow: var(--iridis-shadow-felt-hover);
  transform: translateY(-1px);
}
.iridis-cta:active {
  box-shadow: var(--iridis-shadow-pressed);
  transform: translateY(0);
}
</style>
