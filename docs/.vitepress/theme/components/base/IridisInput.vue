<script setup lang="ts">
/**
 * IridisInput.vue — business-card text/number/color input.
 *
 * Two-way binding via v-model. Same squircle radius + border as every
 * other surface. Color exclusively from --iridis-* tokens.
 */

withDefaults(defineProps<{
  'modelValue': string | number;
  'type'?:      'text' | 'number' | 'color';
  'placeholder'?: string;
  'min'?:       number | string;
  'max'?:       number | string;
  'step'?:      number | string;
  'disabled'?:  boolean;
  'mono'?:      boolean;
  'size'?:      'sm' | 'md';
}>(), {
  'type':       'text',
  'placeholder': '',
  'disabled':   false,
  'mono':       true,
  'size':       'sm',
});

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <input
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :class="['ir-input', `ir-input--${size}`, { 'ir-input--mono': mono, 'ir-input--color': type === 'color' }]"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
.ir-input {
  border: var(--iridis-card-border);
  border-radius: var(--iridis-radius);
  background: var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color: var(--iridis-text, var(--vp-c-text-1));
  box-shadow: var(--iridis-card-shadow-pressed);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition);
}
.ir-input:hover:not(:disabled) {
  border-color: color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider));
}
.ir-input:focus {
  outline: none;
  border-color: var(--iridis-brand);
  box-shadow: var(--iridis-card-shadow-pressed),
              0 0 0 2px color-mix(in oklch, var(--iridis-brand) 30%, transparent);
}
.ir-input:disabled { opacity: 0.5; cursor: not-allowed; }

.ir-input--mono { font-family: var(--vp-font-family-mono); }
.ir-input--sm { padding: 0.32rem 0.45rem; font-size: 0.78rem; }
.ir-input--md { padding: 0.45rem 0.6rem;  font-size: 0.85rem; }

.ir-input--color {
  height: 1.7rem;
  width: 1.7rem;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: var(--iridis-card-border);
}
</style>
