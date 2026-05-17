<script setup lang="ts">
/**
 * BuildTabPanel.vue
 *
 * Shared chrome for every tab body on the /build page so the five
 * surfaces (User palette / Image / Role schema / Configuration /
 * Code) read as one consistent system rather than five bespoke
 * components.
 *
 * Each tab supplies:
 *   - `eyebrow` — a tiny uppercase tag (matches the resolved-roles
 *     header label style)
 *   - `title`   — the human-readable name of the workflow
 *   - `hint`    — one sentence explaining what the tab does
 *
 * Content is slotted in; the panel imposes the surface (IridisCard
 * variant=default), the header padding, and the body spacing.
 */
import IridisCard from './base/IridisCard.vue';

defineProps<{
  'eyebrow': string;
  'title':   string;
  'hint':    string;
}>();
</script>

<template>
  <IridisCard variant="default" class="build-tab-panel">
    <header class="build-tab-panel__header">
      <span class="build-tab-panel__eyebrow">{{ eyebrow }}</span>
      <h2 class="build-tab-panel__title">{{ title }}</h2>
      <p class="build-tab-panel__hint">{{ hint }}</p>
    </header>
    <div class="build-tab-panel__body">
      <slot />
    </div>
  </IridisCard>
</template>

<style scoped>
.build-tab-panel {
  margin: 0;
}
.build-tab-panel :deep(.ir-card__body) {
  padding: 1.25rem 1.4rem 1.5rem;
}
.build-tab-panel__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.85rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid color-mix(in oklch, var(--vp-c-divider) 70%, transparent);
}
.build-tab-panel__eyebrow {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.build-tab-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.build-tab-panel__hint {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  max-width: 72ch;
}
.build-tab-panel__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
