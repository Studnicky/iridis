<script setup lang="ts">
/**
 * PairCard.vue
 *
 * Reusable vertical card editor for a single `ContrastPairInterface`.
 * Sibling to RoleCard — same card metaphor, same tooltip discipline,
 * same grid-reflow strategy in the parent. Each pair declares two
 * roles (foreground + background), a required minimum contrast ratio,
 * and which algorithm (WCAG 2.1 or APCA) the engine should enforce.
 *
 * Edits emit typed events; the parent owns the schema and dispatches
 * through the theme dispatcher. This component never mutates state.
 */

import InputNumber from 'primevue/inputnumber';
import Select      from 'primevue/select';
import Button      from 'primevue/button';

import FormField from './FormField.vue';

import type { ContrastPairInterface } from '@studnicky/iridis/model';

interface SelectOptionInterface { 'label': string; 'value': string }

defineProps<{
  'pair':              ContrastPairInterface;
  'roleOptions':       readonly SelectOptionInterface[];
  'algorithmOptions':  readonly SelectOptionInterface[];
}>();

const emit = defineEmits<{
  'update:foreground': [value: string];
  'update:background': [value: string];
  'update:minRatio':   [value: number];
  'update:algorithm':  [value: 'wcag21' | 'apca'];
  'remove':            [];
}>();
</script>

<template>
  <article class="pair-card">
    <header class="pair-card__head">
      <span class="pair-card__title">contrast pair</span>
      <Button
        type="button"
        severity="secondary"
        size="small"
        class="pair-card__remove"
        :aria-label="`Remove contrast pair`"
        title="Remove this contrast pair. The enforce:* tasks stop nudging colors for this combination."
        @click="emit('remove')"
      >
        <span aria-hidden="true">×</span>
      </Button>
    </header>

    <div class="pair-card__body">
      <FormField leg="foreground" tooltip="Foreground role — typically a text or accent color that must remain legible against the background role below.">
        <Select
          :model-value="pair.foreground"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="pair-card__select"
          @update:model-value="(v) => emit('update:foreground', String(v ?? ''))"
        />
      </FormField>

      <FormField leg="on" tooltip="Background role — the surface the foreground above is painted onto.">
        <Select
          :model-value="pair.background"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="pair-card__select"
          @update:model-value="(v) => emit('update:background', String(v ?? ''))"
        />
      </FormField>

      <FormField leg="min ratio" tooltip="Minimum contrast ratio the engine MUST enforce between the two roles. WCAG 2.1 conventions: 3.0 for large text or non-text UI, 4.5 for normal text, 7.0 for AAA. The enforce:contrast task nudges colors along the lightness axis until this ratio is reached.">
        <InputNumber
          :model-value="pair.minRatio"
          :min="1" :max="21" :step="0.5"
          :max-fraction-digits="1"
          :show-buttons="false"
          size="small"
          class="pair-card__num"
          @update:model-value="(v) => emit('update:minRatio', Number(v ?? 1))"
        />
      </FormField>

      <FormField leg="via" tooltip="Which contrast algorithm enforces this pair. WCAG 2.1 uses a luminance ratio (familiar, widely cited). APCA uses Lightness Contrast — perceptually accurate for modern UIs and required for WCAG 3.0 drafts.">
        <Select
          :model-value="pair.algorithm ?? 'wcag21'"
          :options="algorithmOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="pair-card__select"
          @update:model-value="(v) => emit('update:algorithm', String(v ?? 'wcag21') as 'wcag21' | 'apca')"
        />
      </FormField>
    </div>
  </article>
</template>

<style scoped>
.pair-card {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.7rem 0.75rem;
  background: var(--vp-c-bg);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  box-shadow: var(--iridis-shadow-felt);
  min-width: 0;
}

.pair-card__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.pair-card__title {
  flex: 1 1 auto;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.pair-card__remove {
  flex: 0 0 auto;
}
.pair-card__remove :deep(.p-button) {
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  border-radius: var(--iridis-radius);
  background: var(--vp-c-bg-soft);
  border: var(--iridis-card-border);
  color: var(--vp-c-text-3);
  box-shadow: var(--iridis-card-shadow);
}
.pair-card__remove :deep(.p-button:hover) {
  background: color-mix(in oklch, var(--iridis-error, currentColor) 18%, transparent);
  color: var(--iridis-error, currentColor);
  box-shadow: var(--iridis-card-shadow-hover);
}

.pair-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}
.pair-card__select,
.pair-card__num {
  flex: 1 1 auto;
  min-width: 0;
}
.pair-card__select :deep(.p-select),
.pair-card__num :deep(.p-inputnumber) {
  width: 100%;
}
.pair-card :deep(.p-inputtext),
.pair-card :deep(.p-select-label),
.pair-card :deep(.p-inputnumber-input) {
  padding: 0.32rem 0.45rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  border-radius: var(--iridis-radius-sm);
  text-transform: none;
}
</style>
