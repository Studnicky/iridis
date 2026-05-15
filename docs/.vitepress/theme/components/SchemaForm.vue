<script setup lang="ts">
/**
 * SchemaForm.vue
 *
 * Generic JSON-Schema-driven form generator. Walks the `properties` of an
 * object schema and renders a PrimeVue primitive per property based on
 * type/format/enum.
 *
 * Recognized property shapes:
 *   - { type: 'string', format: 'color' }     → native <input type="color">
 *     (PrimeVue ColorPicker is hex-only with no OKLCH support; for the
 *     docs config we keep the native swatch.)
 *   - { type: 'string', enum: [...] }         → PrimeVue Select
 *   - { type: 'number', minimum, maximum }    → PrimeVue Slider
 *   - { type: 'boolean' }                     → PrimeVue Checkbox
 *   - { type: 'array', items: { format: 'color' } } → repeatable color row
 *     with PrimeVue Buttons for + add / × remove
 *
 * Two-way bound to a target reactive object via v-model. The schema is
 * read-only; the target mutates in place. No JSON Schema validation here —
 * the schema is the form definition, not a runtime gate.
 */

import { computed } from 'vue';

import InputText from 'primevue/inputtext';
import Select    from 'primevue/select';
import Slider    from 'primevue/slider';
import Checkbox  from 'primevue/checkbox';
import Button    from 'primevue/button';

interface SchemaPropertyInterface {
  readonly type?:        string;
  readonly title?:       string;
  readonly description?: string;
  readonly enum?:        readonly string[];
  readonly format?:      string;
  readonly minimum?:     number;
  readonly maximum?:     number;
  readonly minItems?:    number;
  readonly maxItems?:    number;
  readonly items?:       SchemaPropertyInterface;
}

interface ObjectSchemaInterface {
  readonly type:        'object';
  readonly properties:  Readonly<Record<string, SchemaPropertyInterface>>;
  readonly required?:   readonly string[];
}

const props = defineProps<{
  'schema':       ObjectSchemaInterface;
  'modelValue':   Record<string, unknown>;
}>();

const properties = computed(() => Object.entries(props.schema.properties));

function update(key: string, value: unknown): void {
  (props.modelValue as Record<string, unknown>)[key] = value;
}

function inputKindFor(prop: SchemaPropertyInterface): string {
  if (prop.type === 'boolean')                                   return 'boolean';
  if (prop.type === 'string'  && prop.format === 'color')        return 'color';
  if (prop.type === 'string'  && Array.isArray(prop.enum))       return 'enum';
  if (prop.type === 'number'  && prop.minimum !== undefined)     return 'range';
  if (prop.type === 'array'   && prop.items?.format === 'color') return 'colorArray';
  return 'text';
}

function selectOptions(prop: SchemaPropertyInterface): readonly { 'label': string; 'value': string }[] {
  const list = prop.enum ?? [];
  return list.map((v) => ({ 'label': v, 'value': v }));
}

function arrayValue(key: string): string[] {
  const v = props.modelValue[key];
  return Array.isArray(v) ? (v as string[]) : [];
}

function setArrayItem(key: string, idx: number, value: string): void {
  const arr = [...arrayValue(key)];
  arr[idx] = value;
  update(key, arr);
}

function pushArrayItem(key: string): void {
  const arr = [...arrayValue(key)];
  const max = props.schema.properties[key]?.maxItems ?? Infinity;
  if (arr.length >= max) return;
  arr.push('#888888');
  update(key, arr);
}

function removeArrayItem(key: string, idx: number): void {
  const arr = [...arrayValue(key)];
  const min = props.schema.properties[key]?.minItems ?? 0;
  if (arr.length <= min) return;
  arr.splice(idx, 1);
  update(key, arr);
}
</script>

<template>
  <form class="iridis-schema-form" @submit.prevent>
    <div v-for="[key, prop] in properties" :key="key" class="iridis-schema-form__field">
      <label :for="`f-${key}`" class="iridis-schema-form__label">
        {{ prop.title ?? key }}
      </label>
      <p v-if="prop.description" class="iridis-schema-form__description">{{ prop.description }}</p>

      <!-- color -->
      <input
        v-if="inputKindFor(prop) === 'color'"
        :id="`f-${key}`"
        type="color"
        class="iridis-schema-form__color"
        :value="modelValue[key]"
        :title="prop.description ?? prop.title ?? key"
        @input="update(key, ($event.target as HTMLInputElement).value)"
      />

      <!-- enum -->
      <Select
        v-else-if="inputKindFor(prop) === 'enum'"
        :model-value="modelValue[key]"
        :options="selectOptions(prop)"
        option-label="label"
        option-value="value"
        size="small"
        class="iridis-schema-form__select"
        :title="prop.description ?? prop.title ?? key"
        @update:model-value="(v) => update(key, v)"
      />

      <!-- range -->
      <Slider
        v-else-if="inputKindFor(prop) === 'range'"
        :model-value="Number(modelValue[key])"
        :min="prop.minimum"
        :max="prop.maximum"
        class="iridis-schema-form__slider"
        :title="prop.description ?? prop.title ?? key"
        @update:model-value="(v) => update(key, Number(Array.isArray(v) ? v[0] : v))"
      />

      <!-- boolean -->
      <Checkbox
        v-else-if="inputKindFor(prop) === 'boolean'"
        :model-value="modelValue[key] as boolean"
        binary
        :input-id="`f-${key}`"
        :title="prop.description ?? prop.title ?? key"
        @update:model-value="(v) => update(key, Boolean(v))"
      />

      <!-- color array -->
      <div
        v-else-if="inputKindFor(prop) === 'colorArray'"
        class="iridis-schema-form__color-array"
        :title="prop.description ?? prop.title ?? key"
      >
        <div v-for="(color, idx) in arrayValue(key)" :key="idx" class="iridis-schema-form__color-row">
          <input
            type="color"
            class="iridis-schema-form__color-swatch"
            :value="color"
            :title="`Palette color ${idx + 1}. Click to open the native color picker.`"
            @input="setArrayItem(key, idx, ($event.target as HTMLInputElement).value)"
          />
          <code>{{ color }}</code>
          <Button
            type="button"
            severity="secondary"
            size="small"
            class="iridis-schema-form__remove"
            :disabled="arrayValue(key).length <= (prop.minItems ?? 0)"
            :title="`Remove color ${idx + 1}. Disabled when removing it would drop the palette below the schema's minItems floor.`"
            @click="removeArrayItem(key, idx)"
          >
            <span aria-hidden="true">×</span>
          </Button>
        </div>
        <Button
          type="button"
          label="+ add"
          severity="secondary"
          size="small"
          class="iridis-schema-form__add"
          :disabled="arrayValue(key).length >= (prop.maxItems ?? Infinity)"
          title="Append a new color to the palette. Disabled when the schema's maxItems is reached."
          @click="pushArrayItem(key)"
        />
      </div>

      <!-- fallback text -->
      <InputText
        v-else
        :id="`f-${key}`"
        :model-value="String(modelValue[key] ?? '')"
        size="small"
        class="iridis-schema-form__text"
        :title="prop.description ?? prop.title ?? key"
        @update:model-value="(v) => update(key, v ?? '')"
      />
    </div>
  </form>
</template>

<style scoped>
.iridis-schema-form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.iridis-schema-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.iridis-schema-form__label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--vp-c-text-2);
}
.iridis-schema-form__description {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin: 0 0 0.25rem;
  line-height: 1.4;
}
.iridis-schema-form__color {
  width: 100%;
  height: 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  padding: 0;
}
.iridis-schema-form__select :deep(.p-select-label),
.iridis-schema-form__text :deep(.p-inputtext) {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}
.iridis-schema-form__slider {
  margin: 0.4rem 0;
}
.iridis-schema-form__color-array {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.iridis-schema-form__color-row {
  display: grid;
  grid-template-columns: 2.25rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
.iridis-schema-form__color-swatch {
  height: 1.6rem;
  width: 2.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  padding: 0;
}
.iridis-schema-form__color-row code {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.iridis-schema-form__remove :deep(.p-button),
.iridis-schema-form__add :deep(.p-button) {
  font-size: 0.78rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}
.iridis-schema-form__add {
  margin-top: 0.2rem;
  align-self: flex-start;
}
</style>
