<script setup lang="ts">
/**
 * SchemaForm.vue
 *
 * Generic JSON-Schema-driven form generator. Walks the `properties` of an
 * object schema and renders an input per property based on type/format/enum.
 *
 * Recognized property shapes:
 *   - { type: 'string', format: 'color' }     → <input type="color">
 *   - { type: 'string', enum: [...] }         → <select>
 *   - { type: 'number', minimum, maximum }    → <input type="range">
 *   - { type: 'boolean' }                     → <input type="checkbox">
 *   - { type: 'array', items: { format: 'color' } } → repeatable color row
 *
 * Two-way bound to a target reactive object via v-model. The schema is
 * read-only; the target mutates in place. No JSON Schema validation here —
 * the schema is the form definition, not a runtime gate.
 */

import { computed } from 'vue';

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
  // Mutate the target reactive object. Vue picks up the change via reactivity.
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
        :value="modelValue[key]"
        @input="update(key, ($event.target as HTMLInputElement).value)"
      />

      <!-- enum -->
      <select
        v-else-if="inputKindFor(prop) === 'enum'"
        :id="`f-${key}`"
        :value="modelValue[key]"
        @change="update(key, ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="opt in prop.enum" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <!-- range -->
      <input
        v-else-if="inputKindFor(prop) === 'range'"
        :id="`f-${key}`"
        type="range"
        :min="prop.minimum"
        :max="prop.maximum"
        :value="modelValue[key]"
        @input="update(key, Number(($event.target as HTMLInputElement).value))"
      />

      <!-- boolean -->
      <input
        v-else-if="inputKindFor(prop) === 'boolean'"
        :id="`f-${key}`"
        type="checkbox"
        :checked="modelValue[key] as boolean"
        @change="update(key, ($event.target as HTMLInputElement).checked)"
      />

      <!-- color array -->
      <div v-else-if="inputKindFor(prop) === 'colorArray'" class="iridis-schema-form__color-array">
        <div v-for="(color, idx) in arrayValue(key)" :key="idx" class="iridis-schema-form__color-row">
          <input
            type="color"
            :value="color"
            @input="setArrayItem(key, idx, ($event.target as HTMLInputElement).value)"
          />
          <code>{{ color }}</code>
          <button
            type="button"
            class="iridis-schema-form__remove"
            :disabled="arrayValue(key).length <= (prop.minItems ?? 0)"
            @click="removeArrayItem(key, idx)"
          >×</button>
        </div>
        <button
          type="button"
          class="iridis-schema-form__add"
          :disabled="arrayValue(key).length >= (prop.maxItems ?? Infinity)"
          @click="pushArrayItem(key)"
        >+ add</button>
      </div>

      <!-- fallback text -->
      <input
        v-else
        :id="`f-${key}`"
        type="text"
        :value="modelValue[key]"
        @input="update(key, ($event.target as HTMLInputElement).value)"
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
.iridis-schema-form input[type="color"] {
  width: 100%;
  height: 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  padding: 0;
}
.iridis-schema-form select {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
}
.iridis-schema-form input[type="range"] {
  width: 100%;
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
.iridis-schema-form__color-row input[type="color"] {
  height: 1.6rem;
  width: 2.25rem;
}
.iridis-schema-form__color-row code {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.iridis-schema-form__remove,
.iridis-schema-form__add {
  font-size: 0.78rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  cursor: pointer;
}
.iridis-schema-form__remove:disabled,
.iridis-schema-form__add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.iridis-schema-form__add {
  margin-top: 0.2rem;
  align-self: flex-start;
}
</style>
