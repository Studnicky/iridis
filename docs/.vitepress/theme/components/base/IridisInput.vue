<script setup lang="ts">
/**
 * IridisInput.vue — PrimeVue InputText / InputNumber wrapper.
 *
 * Routes by the `type` prop:
 *   text   → PrimeVue InputText (string value, free-form)
 *   number → PrimeVue InputNumber (typed numeric value with min/max/step)
 *   color  → native <input type="color"> (PrimeVue ColorPicker is hex-
 *            only with no OKLCH support, so the swatch stays native)
 *
 * The wrapper applies the shared business-card chrome (squircle
 * radius, border, inner pressed shadow) on top of PrimeVue's default
 * paint. PrimeVue's chrome tokens (--p-form-field-*) are rewired
 * through primevuePreset to read from --iridis-bg-soft / --iridis-text
 * / --iridis-divider so the color tinting cascades automatically.
 */

import { computed } from 'vue';
import InputText    from 'primevue/inputtext';
import InputNumber  from 'primevue/inputnumber';

const props = withDefaults(defineProps<{
  'modelValue':   string | number;
  'type'?:        'text' | 'number' | 'color';
  'placeholder'?: string;
  'min'?:         number | string;
  'max'?:         number | string;
  'step'?:        number | string;
  'disabled'?:    boolean;
  'mono'?:        boolean;
  'size'?:        'sm' | 'md';
}>(), {
  'type':        'text',
  'placeholder': '',
  'disabled':    false,
  'mono':        true,
  'size':        'sm',
});

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();

const sizeProp = computed<'small' | undefined>(() => {
  return props.size === 'sm' ? 'small' : undefined;
});

/** InputNumber emits `null` when cleared; coerce to a safe numeric value. */
function onNumberUpdate(next: number | null): void {
  emit('update:modelValue', next ?? 0);
}

function asNumber(v: string | number): number {
  return typeof v === 'number' ? v : Number.parseFloat(v) || 0;
}
</script>

<template>
  <InputText
    v-if="type === 'text'"
    :model-value="String(modelValue)"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="sizeProp"
    :class="['ir-input', `ir-input--${size}`, { 'ir-input--mono': mono }]"
    @update:model-value="(v) => emit('update:modelValue', v ?? '')"
  />

  <InputNumber
    v-else-if="type === 'number'"
    :model-value="asNumber(modelValue)"
    :min="typeof min === 'string' ? Number.parseFloat(min) : min"
    :max="typeof max === 'string' ? Number.parseFloat(max) : max"
    :step="typeof step === 'string' ? Number.parseFloat(step) : step"
    :disabled="disabled"
    :size="sizeProp"
    :class="['ir-input', `ir-input--${size}`, { 'ir-input--mono': mono }]"
    :input-class="['ir-input__inner', { 'ir-input--mono': mono }]"
    @update:model-value="onNumberUpdate"
  />

  <input
    v-else
    type="color"
    :value="modelValue"
    :disabled="disabled"
    :class="['ir-input', 'ir-input--color']"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>

<style scoped>
/* PrimeVue paints the form-field tokens (background, border, text)
   from the preset; this layer enforces the shared chrome (radius,
   inner pressed shadow). */
.ir-input {
  border-radius: var(--iridis-radius);
  box-shadow:    var(--iridis-card-shadow-pressed);
  width:         100%;
  min-width:     0;
  box-sizing:    border-box;
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition);
}
.ir-input :deep(.p-inputnumber-input) {
  width:        100%;
  box-sizing:   border-box;
  border:       var(--iridis-card-border);
  border-radius: var(--iridis-radius);
  background:   var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color:        var(--iridis-text, var(--vp-c-text-1));
}
.ir-input--mono            { font-family: var(--vp-font-family-mono); }
.ir-input--mono :deep(.p-inputnumber-input),
.ir-input--mono :deep(.p-inputtext) { font-family: var(--vp-font-family-mono); }

.ir-input--sm { font-size: 0.78rem; }
.ir-input--md { font-size: 0.85rem; }

.ir-input--color {
  height:     1.7rem;
  width:      1.7rem;
  padding:    0;
  cursor:     pointer;
  background: transparent;
  border:     var(--iridis-card-border);
}
</style>
