<script setup lang="ts">
/**
 * NavBarBuilderToggle.vue
 *
 * The Example/Try-iridis CTA, mounted inside the main navbar menu
 * alongside the Docs and GitHub links. Visible at every viewport.
 *
 * Styled as an accent CTA: brand text on a muted brand-tinted
 * background. Distinct from a regular nav link, but less heavyweight
 * than a primary brand-filled button.
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
      <span class="iridis-nav-builder-toggle__label">Example</span>
    </Button>
  </ClientOnly>
</template>

<style scoped>
.iridis-nav-builder-toggle {
  display: inline-flex;
}
.iridis-nav-builder-toggle :deep(.p-button) {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  background: color-mix(in oklch, var(--iridis-brand) 12%, var(--iridis-bg-soft));
  border: 1px solid color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider));
  border-radius: var(--iridis-radius);
  color: var(--iridis-brand);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: var(--iridis-shadow-sm);
  min-height: 2.4rem;
}
/* Active-state tint painted by a ::before pseudo at z-index 0 so the
   label and icon (at z-index 1) stay legible underneath the highlight. */
.iridis-nav-builder-toggle :deep(.p-button)::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: transparent;
  z-index: 0;
  pointer-events: none;
  transition: background 160ms ease;
}
.iridis-nav-builder-toggle :deep(.p-button) > * {
  position: relative;
  z-index: 1;
}
.iridis-nav-builder-toggle :deep(.p-button:hover) {
  background: color-mix(in oklch, var(--iridis-brand) 20%, var(--iridis-bg-soft));
  border-color: color-mix(in oklch, var(--iridis-brand) 55%, var(--iridis-divider));
  color: var(--iridis-brand);
}
.iridis-nav-builder-toggle :deep(.p-button[aria-pressed="true"]) {
  border-color: color-mix(in oklch, var(--iridis-brand) 65%, var(--iridis-divider));
  color: var(--iridis-brand);
}
.iridis-nav-builder-toggle :deep(.p-button[aria-pressed="true"])::before {
  background: color-mix(in oklch, var(--iridis-brand) 10%, transparent);
}
.iridis-nav-builder-toggle__icon {
  font-size: 1rem;
  line-height: 1;
  color: var(--iridis-brand);
}
.iridis-nav-builder-toggle__label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
</style>
