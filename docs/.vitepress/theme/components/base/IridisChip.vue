<script setup lang="ts">
/**
 * IridisChip.vue — squircle pill for labels, toggles, and small status
 * markers. Same shape as everything else.
 *
 * Variants: default | brand | success | warning | danger
 */

withDefaults(defineProps<{
  'variant'?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  'tag'?:     string;
}>(), { 'variant': 'default', 'tag': 'span' });
</script>

<template>
  <component :is="tag" :class="['ir-chip', `ir-chip--${variant}`]">
    <slot />
  </component>
</template>

<style scoped>
.ir-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.18rem 0.55rem;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: var(--iridis-card-border);
  border-radius: var(--iridis-radius);
  background: var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color: var(--iridis-muted, var(--vp-c-text-3));
  box-shadow: var(--iridis-card-shadow);
  white-space: nowrap;
}
.ir-chip--brand {
  background: color-mix(in oklch, var(--iridis-brand) 12%, var(--iridis-bg-soft));
  color: var(--iridis-brand);
  border-color: color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider));
}
.ir-chip--success {
  background: color-mix(in oklch, var(--iridis-success, var(--iridis-brand, currentColor)) 14%, var(--iridis-bg-soft));
  color: color-mix(in oklch, var(--iridis-success, var(--iridis-brand, currentColor)) 80%, var(--iridis-text));
  border-color: color-mix(in oklch, var(--iridis-success, var(--iridis-brand, currentColor)) 35%, var(--iridis-divider));
}
.ir-chip--warning {
  background: color-mix(in oklch, var(--iridis-warning, var(--iridis-brand, currentColor)) 14%, var(--iridis-bg-soft));
  color: color-mix(in oklch, var(--iridis-warning, var(--iridis-brand, currentColor)) 80%, var(--iridis-text));
  border-color: color-mix(in oklch, var(--iridis-warning, var(--iridis-brand, currentColor)) 35%, var(--iridis-divider));
}
.ir-chip--danger {
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 14%, var(--iridis-bg-soft));
  color: var(--iridis-error, var(--iridis-text, currentColor));
  border-color: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 35%, var(--iridis-divider));
}
</style>
