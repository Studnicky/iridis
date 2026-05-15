<script setup lang="ts">
/**
 * FormField.vue
 *
 * Generic field wrapper that pairs a tiny uppercase "leg" label with a
 * slotted control under a single native-title tooltip. Encapsulates the
 * recurring `<label><span class="leg">…</span><Control/></label>` pattern
 * used across RoleCard, PairCard, and IridisPicker channel inputs.
 *
 * The `title` attribute lives on the wrapper `<label>` so hovering anywhere
 * inside the field — leg, control, padding — surfaces the help text. The
 * component never owns model state; it only frames whatever control the
 * consumer slots in (PrimeVue Inputs / Selects in practice).
 *
 * Orientation defaults to 'row' for the card-style layout. 'column' stacks
 * the leg above the control for dense grid contexts (e.g. the picker's
 * RGB / HSV / OKLCH channel triplets). The leg's column width is
 * controllable via the `legWidth` prop, exposed as the CSS custom property
 * `--form-field-leg-width` so flex children can opt into the override.
 */

defineProps<{
  'leg':           string;
  'tooltip':       string;
  'orientation'?:  'row' | 'column';
  'legWidth'?:     string;
  'compact'?:      boolean;
}>();
</script>

<template>
  <label
    class="form-field"
    :class="{
      'form-field--row':     (orientation ?? 'row') === 'row',
      'form-field--column':  orientation === 'column',
      'form-field--compact': compact === true,
    }"
    :style="legWidth ? { '--form-field-leg-width': legWidth } : undefined"
    :title="tooltip"
    :aria-label="leg"
  >
    <span class="form-field__leg">{{ leg }}</span>
    <span class="form-field__control">
      <slot />
    </span>
  </label>
</template>

<style scoped>
.form-field {
  --form-field-leg-width: 4.5rem;
  display: flex;
  min-width: 0;
  gap: 0.45rem;
  color: var(--vp-c-text-2);
  font-size: 0.72rem;
}

.form-field--row {
  flex-direction: row;
  align-items: center;
}
.form-field--row .form-field__leg {
  flex: 0 0 var(--form-field-leg-width);
}

.form-field--column {
  flex-direction: column;
  align-items: stretch;
  gap: 0.18rem;
}
.form-field--column .form-field__leg {
  flex: 0 0 auto;
}

.form-field__leg {
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
  user-select: none;
}

.form-field__control {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex: 1 1 auto;
  min-width: 0;
}
.form-field--column .form-field__control {
  width: 100%;
}

.form-field--compact {
  font-size: 0.7rem;
  gap: 0.3rem;
}
.form-field--compact .form-field__leg {
  font-size: 0.6rem;
}

/* PrimeVue chrome descending into the slotted control. Consumers slot
   InputText / InputNumber / Select; these rules let the control fill the
   remaining track width without per-call-site overrides. */
.form-field__control :deep(.p-inputnumber),
.form-field__control :deep(.p-select),
.form-field__control :deep(.p-inputtext) {
  width: 100%;
  min-width: 0;
}
.form-field__control :deep(.p-inputnumber-input) {
  width: 100%;
  min-width: 0;
}
</style>

