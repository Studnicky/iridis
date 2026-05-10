<script setup lang="ts">
/**
 * IridisButton.vue — business-card button.
 *
 * Variants:
 *   - primary  : brand background, on-brand text
 *   - secondary: surface background, text color
 *   - ghost    : transparent, picks up brand on hover
 *   - danger   : critical-tinted (red surface)
 *
 * Sizes: sm | md
 *
 * All variants share the squircle radius + business-card shadow recipe.
 * Color exclusively comes from --iridis-* engine-driven tokens.
 */

withDefaults(defineProps<{
  'variant'?:  'primary' | 'secondary' | 'ghost' | 'danger';
  'size'?:     'sm' | 'md';
  'type'?:     'button' | 'submit' | 'reset';
  'disabled'?: boolean;
  'square'?:   boolean;        // for icon-only buttons (× remove etc.)
}>(), {
  'variant':  'secondary',
  'size':     'md',
  'type':     'button',
  'disabled': false,
  'square':   false,
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="['ir-btn', `ir-btn--${variant}`, `ir-btn--${size}`, { 'ir-btn--square': square }]"
  >
    <slot />
  </button>
</template>

<style scoped>
.ir-btn {
  font-family: var(--vp-font-family-base);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: var(--iridis-radius);
  border: var(--iridis-card-border);
  box-shadow: var(--iridis-card-shadow);
  cursor: pointer;
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition),
    filter           var(--iridis-transition),
    transform 120ms cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}
.ir-btn:active:not(:disabled) {
  box-shadow: var(--iridis-card-shadow-pressed);
  transform: translateY(0);
}
.ir-btn:hover:not(:disabled) {
  box-shadow: var(--iridis-card-shadow-hover);
  transform: translateY(-1px);
}
.ir-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Sizes */
.ir-btn--sm { padding: 0.32rem 0.65rem; font-size: 0.74rem; }
.ir-btn--md { padding: 0.5rem  1rem;    font-size: 0.85rem; }

/* Square variant: icon-only buttons (× remove etc.) */
.ir-btn--square.ir-btn--sm { padding: 0; width: 1.6rem; height: 1.6rem; }
.ir-btn--square.ir-btn--md { padding: 0; width: 2rem;   height: 2rem;   }

/* Variants — ALL colors come from --iridis-* engine tokens. */
.ir-btn--primary {
  background: var(--iridis-brand);
  color:      var(--iridis-on-brand);
  border-color: color-mix(in oklch, var(--iridis-brand) 60%, var(--iridis-divider));
}
.ir-btn--primary:hover:not(:disabled) { filter: brightness(1.08); }

.ir-btn--secondary {
  background: var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color:      var(--iridis-text,   var(--vp-c-text-1));
}
.ir-btn--secondary:hover:not(:disabled) {
  border-color: color-mix(in oklch, var(--iridis-brand) 50%, var(--iridis-divider));
  color:        var(--iridis-brand);
}

.ir-btn--ghost {
  background: transparent;
  color:      var(--iridis-muted, var(--vp-c-text-3));
  border-color: transparent;
  box-shadow: none;
}
.ir-btn--ghost:hover:not(:disabled) {
  background: color-mix(in oklch, var(--iridis-brand) 10%, transparent);
  color:      var(--iridis-brand);
  border-color: var(--iridis-card-border);
  box-shadow: var(--iridis-card-shadow);
}

.ir-btn--danger {
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 18%, var(--iridis-bg-soft));
  color:      var(--iridis-error, var(--iridis-text, currentColor));
  border-color: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 40%, var(--iridis-divider));
}
.ir-btn--danger:hover:not(:disabled) {
  background: color-mix(in oklch, var(--iridis-error, var(--iridis-text, currentColor)) 30%, var(--iridis-bg-soft));
}
</style>
