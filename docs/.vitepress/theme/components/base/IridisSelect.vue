<script setup lang="ts">
/**
 * IridisSelect.vue — PrimeVue Select wrapper.
 *
 * PrimeVue Select replaces the native <select> with a styled overlay
 * dropdown; the wrapper normalizes the consumer-facing API (string
 * options or { value, label } records) and applies the shared chrome
 * (squircle radius + inner pressed shadow). Color tokens cascade from
 * primevuePreset (--p-form-field-* → --iridis-*).
 */

import { computed } from 'vue';
import Select       from 'primevue/select';

type OptionRecord = { 'value': string; 'label'?: string };

const props = withDefaults(defineProps<{
  'modelValue': string;
  'options':    readonly OptionRecord[] | readonly string[];
  'disabled'?:  boolean;
  'size'?:      'sm' | 'md';
}>(), {
  'disabled': false,
  'size':     'sm',
});

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const normalizedOptions = computed<readonly { 'value': string; 'label': string }[]>(() => {
  return props.options.map((o) => {
    if (typeof o === 'string') return { 'value': o, 'label': o };
    return { 'value': o.value, 'label': o.label ?? o.value };
  });
});

const sizeProp = computed<'small' | undefined>(() => {
  return props.size === 'sm' ? 'small' : undefined;
});
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="normalizedOptions"
    option-label="label"
    option-value="value"
    :disabled="disabled"
    :size="sizeProp"
    :class="['ir-select', `ir-select--${size}`]"
    @update:model-value="(v) => emit('update:modelValue', v ?? '')"
  />
</template>

<style scoped>
.ir-select {
  border-radius: var(--iridis-radius);
  box-shadow:    var(--iridis-card-shadow-pressed);
  width:         100%;
  min-width:     0;
  box-sizing:    border-box;
  font-family:   var(--vp-font-family-mono);
  cursor:        pointer;
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition);
}
.ir-select :deep(.p-select-label) { font-family: var(--vp-font-family-mono); }

.ir-select--sm :deep(.p-select-label) { font-size: 0.78rem; padding: 0.32rem 0.45rem; }
.ir-select--md :deep(.p-select-label) { font-size: 0.85rem; padding: 0.45rem 0.6rem;  }
</style>
