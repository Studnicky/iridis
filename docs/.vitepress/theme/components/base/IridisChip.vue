<script setup lang="ts">
/**
 * IridisChip.vue — PrimeVue Tag wrapper with iridis chrome.
 *
 * Chips on this site are non-interactive labels (status, kind, slot
 * markers). PrimeVue Tag matches that role; the wrapper adds the
 * shared business-card chrome (squircle radius, border, shadow) and
 * maps the iridis variant vocabulary onto PrimeVue's severity slot.
 *
 * Variants:
 *   default → no severity (paints neutral via preset surface tokens)
 *   brand   → severity="info" (primary-tinted via preset primary token)
 *   success → severity="success"
 *   warning → severity="warn"
 *   danger  → severity="danger"
 *
 * PrimeVue's severity-driven palette is rewired through primevuePreset
 * so the brand variant reads from --iridis-brand and the success/
 * warning/danger variants pick up --iridis-success / --iridis-warning
 * / --iridis-error when the active schema supplies them.
 */

import { computed } from 'vue';
import Tag          from 'primevue/tag';

const props = withDefaults(defineProps<{
  'variant'?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  'value'?:   string;
}>(), {
  'variant': 'default',
  'value':   '',
});

const severity = computed<'info' | 'success' | 'warn' | 'danger' | undefined>(() => {
  switch (props.variant) {
    case 'brand':   return 'info';
    case 'success': return 'success';
    case 'warning': return 'warn';
    case 'danger':  return 'danger';
    default:        return undefined;
  }
});
</script>

<template>
  <Tag
    :severity="severity"
    :value="value"
    :class="['ir-chip', `ir-chip--${variant}`]"
  >
    <slot>{{ value }}</slot>
  </Tag>
</template>

<style scoped>
/* PrimeVue Tag paints the color tokens; this layer enforces the
   shared chrome (radius, border, shadow, uppercase letterforms). */
.ir-chip {
  border-radius:  var(--iridis-radius);
  border:         var(--iridis-card-border);
  box-shadow:     var(--iridis-card-shadow);
  padding:        0.18rem 0.55rem;
  font-size:      0.66rem;
  font-weight:    700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space:    nowrap;
  display:        inline-flex;
  align-items:    center;
  gap:            0.3rem;
}
.ir-chip--default {
  background: var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color:      var(--iridis-muted, var(--vp-c-text-3));
}
.ir-chip--brand {
  background:   color-mix(in oklch, var(--iridis-brand) 12%, var(--iridis-bg-soft));
  color:        var(--iridis-brand);
  border-color: color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider));
}
.ir-chip--success {
  background:   color-mix(in oklch, var(--iridis-success, var(--iridis-brand, currentColor)) 14%, var(--iridis-bg-soft));
  color:        color-mix(in oklch, var(--iridis-success, var(--iridis-brand, currentColor)) 80%, var(--iridis-text));
  border-color: color-mix(in oklch, var(--iridis-success, var(--iridis-brand, currentColor)) 35%, var(--iridis-divider));
}
.ir-chip--warning {
  background:   color-mix(in oklch, var(--iridis-warning, var(--iridis-brand, currentColor)) 14%, var(--iridis-bg-soft));
  color:        color-mix(in oklch, var(--iridis-warning, var(--iridis-brand, currentColor)) 80%, var(--iridis-text));
  border-color: color-mix(in oklch, var(--iridis-warning, var(--iridis-brand, currentColor)) 35%, var(--iridis-divider));
}
.ir-chip--danger {
  background:   color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 14%, var(--iridis-bg-soft));
  color:        var(--iridis-error, var(--iridis-text, currentColor));
  border-color: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 35%, var(--iridis-divider));
}
</style>
