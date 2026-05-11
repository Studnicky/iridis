<script setup lang="ts">
/**
 * NavBarBuilderToggle.vue
 *
 * The universal builder toggle, mounted into the navbar via the
 * nav-bar-content-after slot. Visible at every viewport.
 *
 * Reads and writes the same `panelOpen` ref that RightPanel.vue
 * consumes; the panel renders as an overlay drawer at every width.
 */
import Button from 'primevue/button';

import { panelOpen, togglePanel } from '../stores/panelState.ts';

function onClick(): void {
  togglePanel();
}
</script>

<template>
  <ClientOnly>
    <Button
      class="iridis-nav-builder-toggle"
      severity="secondary"
      variant="text"
      :aria-pressed="panelOpen"
      :aria-label="panelOpen ? 'Hide palette builder' : 'Open palette builder'"
      :title="panelOpen ? 'Hide palette builder' : 'Open palette builder'"
      @click="onClick"
    >
      <span class="iridis-nav-builder-toggle__icon" aria-hidden="true">{{ panelOpen ? '✕' : '◐' }}</span>
      <span class="iridis-nav-builder-toggle__label">Try iridis</span>
    </Button>
  </ClientOnly>
</template>

<style scoped>
.iridis-nav-builder-toggle {
  display: inline-flex;
  margin-right: 0.35rem;
}
.iridis-nav-builder-toggle :deep(.p-button) {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  background:
    linear-gradient(180deg,
      color-mix(in oklch, var(--iridis-brand) 22%, var(--iridis-surface)) 0%,
      color-mix(in oklch, var(--iridis-brand) 10%, var(--iridis-surface)) 100%);
  border: 1px solid color-mix(in oklch, var(--iridis-divider) 30%, var(--iridis-brand) 70%);
  border-radius: var(--iridis-radius);
  color: var(--iridis-text);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: var(--iridis-shadow-sm);
  min-height: 2.4rem;
}
.iridis-nav-builder-toggle :deep(.p-button:hover) {
  background:
    linear-gradient(180deg,
      color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-surface)) 0%,
      color-mix(in oklch, var(--iridis-brand) 18%, var(--iridis-surface)) 100%);
  border-color: color-mix(in oklch, var(--iridis-divider) 10%, var(--iridis-brand) 90%);
  color: var(--iridis-brand);
}
.iridis-nav-builder-toggle :deep(.p-button[aria-pressed="true"]) {
  background:
    linear-gradient(180deg,
      color-mix(in oklch, var(--iridis-brand) 38%, var(--iridis-surface)) 0%,
      color-mix(in oklch, var(--iridis-brand) 20%, var(--iridis-surface)) 100%);
  border-color: color-mix(in oklch, var(--iridis-brand) 80%, var(--iridis-divider));
  color: var(--iridis-brand);
}
.iridis-nav-builder-toggle__icon {
  font-size: 1rem;
  line-height: 1;
  color: color-mix(in oklch, var(--iridis-brand) 85%, var(--iridis-text));
}
.iridis-nav-builder-toggle__label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
@media (max-width: 480px) {
  .iridis-nav-builder-toggle__label {
    display: none;
  }
}
</style>
