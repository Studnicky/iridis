<script setup lang="ts">
/**
 * IridisCard.vue — the business-card surface.
 *
 * One radius. One border. The shared business-card shadow recipe (outer
 * drop + inner edge highlight at top + inner shadow at bottom + corner
 * accents). Every container in the app composes from this so the whole
 * UI reads as one physical plane.
 *
 * Variants:
 *   - default: bg-soft surface
 *   - inset:   bg surface, slightly recessed feel for nested cards
 *   - panel:   the right-panel chrome (brand-tinted gradient)
 */

withDefaults(defineProps<{
  'variant'?: 'default' | 'inset' | 'panel';
  'tag'?:     string;
  'padded'?:  boolean;
  'interactive'?: boolean;
}>(), {
  'variant':     'default',
  'tag':         'div',
  'padded':      true,
  'interactive': false,
});
</script>

<template>
  <component
    :is="tag"
    :class="['ir-card', `ir-card--${variant}`, { 'ir-card--padded': padded, 'ir-card--interactive': interactive }]"
  >
    <slot />
  </component>
</template>

<style scoped>
.ir-card {
  border:        var(--iridis-card-border);
  border-radius: var(--iridis-radius);
  box-shadow:    var(--iridis-card-shadow);
  background:    var(--vp-c-bg-soft);
  color:         var(--vp-c-text-1);
  transition:
    background-color var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    transform 140ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ir-card--padded { padding: 0.65rem 0.75rem; }
.ir-card--inset  { background: var(--vp-c-bg); }
.ir-card--panel  {
  background:
    linear-gradient(160deg,
      color-mix(in oklch, var(--iridis-surface) 92%, var(--iridis-brand) 8%) 0%,
      color-mix(in oklch, var(--iridis-surface) 96%, var(--iridis-text)  4%) 100%);
  backdrop-filter: blur(10px);
}
.ir-card--interactive { cursor: pointer; }
.ir-card--interactive:hover {
  box-shadow: var(--iridis-card-shadow-hover);
  transform: translateY(-1px);
}
.ir-card--interactive:active {
  box-shadow: var(--iridis-card-shadow-pressed);
  transform: translateY(0);
}
</style>
