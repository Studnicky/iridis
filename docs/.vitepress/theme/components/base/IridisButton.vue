<script setup lang="ts">
/**
 * IridisButton.vue — PrimeVue Button wrapper with iridis chrome.
 *
 * Delegates rendering, focus management, accessibility, and disabled
 * semantics to PrimeVue's Button. The wrapper maps the iridis variant
 * vocabulary onto PrimeVue's severity/variant slots and applies the
 * shared business-card shape (squircle radius + outer drop + inner
 * edge highlights) on top of PrimeVue's default chrome via scoped CSS.
 *
 * Variant mapping:
 *   primary   → default Button (paints with --p-primary-color, which
 *               resolves to var(--iridis-brand) via primevuePreset)
 *   secondary → severity="secondary"
 *   ghost     → variant="text"
 *   danger    → severity="danger"
 *
 * Size mapping:
 *   sm → size="small"
 *   md → default
 *
 * Square mode produces an icon-only square button by fixing width
 * to match height; used for × remove affordances.
 */

import { computed } from 'vue';
import Button       from 'primevue/button';

const props = withDefaults(defineProps<{
  'variant'?:  'primary' | 'secondary' | 'ghost' | 'danger';
  'size'?:     'sm' | 'md';
  'type'?:     'button' | 'submit' | 'reset';
  'disabled'?: boolean;
  'square'?:   boolean;
}>(), {
  'variant':  'secondary',
  'size':     'md',
  'type':     'button',
  'disabled': false,
  'square':   false,
});

const severity = computed<'secondary' | 'danger' | undefined>(() => {
  if (props.variant === 'secondary') return 'secondary';
  if (props.variant === 'danger')    return 'danger';
  return undefined;
});

const variantProp = computed<'text' | undefined>(() => {
  return props.variant === 'ghost' ? 'text' : undefined;
});

const sizeProp = computed<'small' | undefined>(() => {
  return props.size === 'sm' ? 'small' : undefined;
});
</script>

<template>
  <Button
    :type="type"
    :disabled="disabled"
    :severity="severity"
    :variant="variantProp"
    :size="sizeProp"
    :class="['ir-btn', `ir-btn--${variant}`, `ir-btn--${size}`, { 'ir-btn--square': square }]"
  >
    <slot />
  </Button>
</template>

<style scoped>
/* Apply the iridis business-card shape on top of PrimeVue's chrome.
   PrimeVue paints the color tokens (background, text, border) from the
   preset; this layer adds the shared radius + shadow stack so the
   button reads as one plane with cards/chips/inputs. */
.ir-btn {
  border-radius: var(--iridis-radius);
  box-shadow:    var(--iridis-card-shadow);
  font-weight:   600;
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
}
.ir-btn:hover:not(:disabled) {
  box-shadow: var(--iridis-card-shadow-hover);
  transform:  translateY(-1px);
}
.ir-btn:active:not(:disabled) {
  box-shadow: var(--iridis-card-shadow-pressed);
  transform:  translateY(0);
}

.ir-btn--sm { padding: 0.32rem 0.65rem; font-size: 0.74rem; }
.ir-btn--md { padding: 0.5rem  1rem;    font-size: 0.85rem; }

.ir-btn--square.ir-btn--sm { padding: 0; width: 1.6rem; height: 1.6rem; }
.ir-btn--square.ir-btn--md { padding: 0; width: 2rem;   height: 2rem;   }

/* PrimeVue text variant uses transparent bg + no border; restore the
   business-card shadow on hover so ghost buttons rise like the others. */
.ir-btn--ghost { box-shadow: none; }
.ir-btn--ghost:hover:not(:disabled) {
  box-shadow: var(--iridis-card-shadow);
}
</style>
