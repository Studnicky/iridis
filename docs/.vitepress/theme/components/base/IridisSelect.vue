<script setup lang="ts">
/**
 * IridisSelect.vue — business-card select. Same shape language as input.
 */

withDefaults(defineProps<{
  'modelValue': string;
  'options':    readonly { 'value': string; 'label'?: string }[] | readonly string[];
  'disabled'?:  boolean;
  'size'?:      'sm' | 'md';
}>(), { 'disabled': false, 'size': 'sm' });

defineEmits<{ 'update:modelValue': [value: string] }>();

function asOption(o: string | { 'value': string; 'label'?: string }): { 'value': string; 'label': string } {
  if (typeof o === 'string') return { 'value': o, 'label': o };
  return { 'value': o.value, 'label': o.label ?? o.value };
}
</script>

<template>
  <select
    :value="modelValue"
    :disabled="disabled"
    :class="['ir-select', `ir-select--${size}`]"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="o in options" :key="asOption(o).value" :value="asOption(o).value">{{ asOption(o).label }}</option>
  </select>
</template>

<style scoped>
.ir-select {
  border: var(--iridis-card-border);
  border-radius: var(--iridis-radius);
  background: var(--iridis-bg-soft, var(--vp-c-bg-soft));
  color: var(--iridis-text, var(--vp-c-text-1));
  box-shadow: var(--iridis-card-shadow-pressed);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  transition:
    background-color var(--iridis-transition),
    color            var(--iridis-transition),
    border-color     var(--iridis-transition),
    box-shadow       var(--iridis-transition);
}
.ir-select:hover:not(:disabled) {
  border-color: color-mix(in oklch, var(--iridis-brand) 35%, var(--iridis-divider));
}
.ir-select:focus {
  outline: none;
  border-color: var(--iridis-brand);
  box-shadow: var(--iridis-card-shadow-pressed),
              0 0 0 2px color-mix(in oklch, var(--iridis-brand) 30%, transparent);
}
.ir-select--sm { padding: 0.32rem 0.45rem; font-size: 0.78rem; }
.ir-select--md { padding: 0.45rem 0.6rem;  font-size: 0.85rem; }
</style>
