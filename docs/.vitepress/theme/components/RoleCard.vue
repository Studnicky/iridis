<script setup lang="ts">
/**
 * RoleCard.vue
 *
 * Reusable vertical card editor for a single `RoleDefinitionInterface`.
 * The role schema editor renders one of these per role and lets CSS
 * grid reflow them into one, two, or three columns based on the drawer
 * width — matching the card metaphor used by the IridisPicker.
 *
 * Every field carries a native `title` tooltip explaining what it does
 * and how the engine uses it. Tooltips appear on the wrapper element
 * (not the inner PrimeVue control) so they fire on hover anywhere over
 * the labelled region.
 *
 * Edits emit typed events; the parent owns the schema and dispatches
 * through the theme dispatcher. This component never mutates state.
 */

import InputText   from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select      from 'primevue/select';
import Checkbox    from 'primevue/checkbox';
import Button      from 'primevue/button';

import FormField from './FormField.vue';

import type { ColorIntentType, RoleDefinitionInterface } from '@studnicky/iridis/model';

interface SelectOptionInterface { 'label': string; 'value': string }

defineProps<{
  'role':                 RoleDefinitionInterface;
  'intentOptions':        readonly SelectOptionInterface[];
  'derivedFromOptions':   readonly SelectOptionInterface[];
  'removable':            boolean;
}>();

const emit = defineEmits<{
  'update:name':        [value: string];
  'update:intent':      [value: string];
  'update:required':    [value: boolean];
  'update:range':       [field: 'lightnessRange' | 'chromaRange', which: 0 | 1, value: number];
  'update:derivedFrom': [value: string];
  'update:hueLock':     [enabled: boolean];
  'update:hueOffset':   [value: number];
  'remove':             [];
}>();

function setIntent(v: unknown): void {
  emit('update:intent', (v === '' || v === null || v === undefined) ? '' : (v as ColorIntentType));
}
</script>

<template>
  <article class="role-card">
    <header class="role-card__head">
      <InputText
        :model-value="role.name"
        placeholder="role name"
        spellcheck="false"
        size="small"
        class="role-card__name"
        title="Role name. The emitted CSS variable becomes --c-{name}; contrast pairs reference roles by this string. Lowercase alphanumeric and hyphens recommended."
        @update:model-value="(v) => emit('update:name', v ?? '')"
      />
      <Button
        type="button"
        severity="secondary"
        size="small"
        class="role-card__remove"
        :disabled="!removable"
        :aria-label="`Remove ${role.name}`"
        title="Remove this role. Any contrast pair that referenced it is dropped at the same time. Disabled when only one role remains."
        @click="emit('remove')"
      >
        <span aria-hidden="true">×</span>
      </Button>
    </header>

    <div class="role-card__body">
      <FormField leg="intent" tooltip="Semantic intent — drives forced-colors mapping, APCA Lc target, WCAG required ratio, Capacitor StatusBar style. Pick the closest match; the engine treats unknown roles by name only when intent is absent.">
        <Select
          :model-value="role.intent ?? ''"
          :options="intentOptions"
          option-label="label"
          option-value="value"
          size="small"
          class="role-card__select"
          @update:model-value="setIntent"
        />
      </FormField>

      <FormField leg="L range" tooltip="OKLCH lightness envelope. The engine nudges any resolved color into this range. 0 is black, 1 is white. Background roles in dark mode typically sit at 0.04–0.14; text at 0.85–0.96.">
        <InputNumber
          :model-value="role.lightnessRange?.[0] ?? 0"
          :min="0" :max="1" :step="0.01"
          :max-fraction-digits="2"
          :show-buttons="false"
          size="small"
          title="Lightness floor — the lowest OKLCH L value the resolver will allow."
          @update:model-value="(v) => emit('update:range', 'lightnessRange', 0, Number(v ?? 0))"
        />
        <span class="role-card__dash">→</span>
        <InputNumber
          :model-value="role.lightnessRange?.[1] ?? 1"
          :min="0" :max="1" :step="0.01"
          :max-fraction-digits="2"
          :show-buttons="false"
          size="small"
          title="Lightness ceiling — the highest OKLCH L value the resolver will allow."
          @update:model-value="(v) => emit('update:range', 'lightnessRange', 1, Number(v ?? 1))"
        />
      </FormField>

      <FormField leg="C range" tooltip="OKLCH chroma envelope. 0 is fully grey, 0.4+ is highly saturated. Accent roles typically sit at 0.12–0.30; surfaces and dividers stay near 0.">
        <InputNumber
          :model-value="role.chromaRange?.[0] ?? 0"
          :min="0" :max="0.5" :step="0.01"
          :max-fraction-digits="2"
          :show-buttons="false"
          size="small"
          title="Chroma floor — the lowest OKLCH C value the resolver will allow."
          @update:model-value="(v) => emit('update:range', 'chromaRange', 0, Number(v ?? 0))"
        />
        <span class="role-card__dash">→</span>
        <InputNumber
          :model-value="role.chromaRange?.[1] ?? 0.5"
          :min="0" :max="0.5" :step="0.01"
          :max-fraction-digits="2"
          :show-buttons="false"
          size="small"
          title="Chroma ceiling — the highest OKLCH C value the resolver will allow."
          @update:model-value="(v) => emit('update:range', 'chromaRange', 1, Number(v ?? 0.5))"
        />
      </FormField>

      <FormField leg="derive" tooltip="Pick a parent role to derive from. The expand:family task synthesizes the child by copying the parent's hue and applying the hue offset below. Leave as none to resolve independently from the input palette.">
        <Select
          :model-value="role.derivedFrom ?? ''"
          :options="[{ 'label': '— none —', 'value': '' }, ...derivedFromOptions.filter((o) => o.value !== role.name)]"
          option-label="label"
          option-value="value"
          size="small"
          class="role-card__select"
          @update:model-value="(v) => emit('update:derivedFrom', String(v ?? ''))"
        />
      </FormField>

      <FormField leg="hue lock" tooltip="Pin the OKLCH hue to a specific angle (0–359°) rather than inheriting from the input palette. When enabled, this role always renders at this hue regardless of the palette colors.">
        <Checkbox
          :model-value="role.hueOffset !== undefined"
          binary
          title="Enable hue lock. Reveals a degree input the role's hue is pinned to."
          @update:model-value="(v) => emit('update:hueLock', Boolean(v))"
        />
        <InputNumber
          v-if="role.hueOffset !== undefined"
          :model-value="Math.round(role.hueOffset)"
          :min="0" :max="359"
          :show-buttons="false"
          size="small"
          title="Hue in degrees (0–359). 0 is red, 120 green, 240 blue."
          @update:model-value="(v) => emit('update:hueOffset', Number(v ?? 0))"
        />
      </FormField>

      <!-- "required" doesn't fit FormField: the checkbox precedes the label
           rather than following a leg legend. Kept as a bespoke field. -->
      <label class="role-card__field role-card__field--required" title="Required roles MUST be populated. If no input color resolves into this role's ranges, the engine synthesizes a color from the range centers. Optional roles silently disappear when no candidate fits.">
        <Checkbox
          :model-value="role.required ?? false"
          binary
          @update:model-value="(v) => emit('update:required', Boolean(v))"
        />
        <span class="role-card__required-text">required</span>
      </label>
    </div>
  </article>
</template>

<style scoped>
.role-card {
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

.role-card__head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.role-card__name {
  flex: 1 1 auto;
  min-width: 0;
}
.role-card__remove {
  flex: 0 0 auto;
}
.role-card__remove :deep(.p-button) {
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
.role-card__remove :deep(.p-button:hover:not(:disabled)) {
  background: color-mix(in oklch, var(--iridis-error, currentColor) 18%, transparent);
  color: var(--iridis-error, currentColor);
  box-shadow: var(--iridis-card-shadow-hover);
}
.role-card__remove :deep(.p-button:disabled) {
  opacity: 0.35;
  cursor: not-allowed;
}

.role-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

/* The bespoke "required" field — checkbox-then-label layout that the
   leg-before-control FormField wrapper does not model. */
.role-card__field {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-size: 0.72rem;
  color: var(--vp-c-text-2);
}
.role-card__field--required {
  align-self: flex-start;
  padding: 0.2rem 0.5rem;
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-sm);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  user-select: none;
}
.role-card__required-text {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.04em;
}

.role-card__dash {
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  user-select: none;
}

.role-card__select {
  flex: 1 1 auto;
  min-width: 0;
}
.role-card__select :deep(.p-select) {
  width: 100%;
}

/* Shared input chrome — monospace + iridis radius, scoped here so the
   tokens descend into PrimeVue children without leaking to neighbouring
   components. Dropdown labels render at their authored case; only the
   leg legends use uppercase. */
.role-card :deep(.p-inputtext),
.role-card :deep(.p-select-label),
.role-card :deep(.p-inputnumber-input) {
  padding: 0.32rem 0.45rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  border-radius: var(--iridis-radius-sm);
  text-transform: none;
}
</style>
