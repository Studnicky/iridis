<script setup lang="ts">
/**
 * IridisCard.vue — PrimeVue Card wrapper with iridis chrome.
 *
 * PrimeVue Card provides the structural slots (header, title, subtitle,
 * content, footer); the iridis layer adds the shared business-card
 * shadow recipe (outer drop + inner edge highlight + corner accents)
 * and surface tinting via the variant prop.
 *
 * Variants:
 *   default → bg-soft surface
 *   inset   → background surface (recessed feel for nested cards)
 *   panel   → brand-tinted gradient (elevated chrome)
 *
 * The `tag` prop is preserved for backward compat but PrimeVue Card
 * renders its own root element; consumers that relied on a custom tag
 * should fall back to the default content slot, which works inside
 * any wrapping element.
 */

import Card from 'primevue/card';

withDefaults(defineProps<{
  'variant'?:     'default' | 'inset' | 'panel';
  'padded'?:      boolean;
  'interactive'?: boolean;
}>(), {
  'variant':     'default',
  'padded':      true,
  'interactive': false,
});
</script>

<template>
  <Card
    :class="[
      'ir-card',
      `ir-card--${variant}`,
      { 'ir-card--padded': padded, 'ir-card--interactive': interactive }
    ]"
    :pt="{
      'root':    { 'class': 'ir-card__root' },
      'body':    { 'class': 'ir-card__body' },
      'content': { 'class': 'ir-card__content' }
    }"
  >
    <template #content>
      <slot />
    </template>
  </Card>
</template>

<style scoped>
/* Override PrimeVue Card's default chrome with the iridis business-card
   shape. PrimeVue paints the base surface via --p-content-background
   (which resolves to iridis surface via the preset); this layer adds
   the radius + shadow recipe. */
.ir-card :deep(.ir-card__root) {
  border-radius: var(--iridis-radius);
  border:        var(--iridis-card-border);
  box-shadow:    var(--iridis-card-shadow);
  background:    var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color:         var(--iridis-text, var(--vp-c-text-1));
  transition:
    background-color var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    transform 140ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ir-card :deep(.ir-card__body)    { padding: 0; }
.ir-card :deep(.ir-card__content) { padding: 0; }

.ir-card--padded :deep(.ir-card__body) { padding: 0.65rem 0.75rem; }

.ir-card--inset :deep(.ir-card__root) { background: var(--iridis-background, var(--vp-c-bg)); }
.ir-card--panel :deep(.ir-card__root) {
  background:
    linear-gradient(160deg,
      color-mix(in oklch, var(--iridis-surface) 92%, var(--iridis-brand) 8%) 0%,
      color-mix(in oklch, var(--iridis-surface) 96%, var(--iridis-text)  4%) 100%);
  backdrop-filter: blur(10px);
}

.ir-card--interactive :deep(.ir-card__root) { cursor: pointer; }
.ir-card--interactive:hover :deep(.ir-card__root) {
  box-shadow: var(--iridis-card-shadow-hover);
  transform:  translateY(-1px);
}
.ir-card--interactive:active :deep(.ir-card__root) {
  box-shadow: var(--iridis-card-shadow-pressed);
  transform:  translateY(0);
}
</style>
