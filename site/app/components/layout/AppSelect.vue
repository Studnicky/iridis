<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';

/**
 * Leak-free native <select> drop-in for Nuxt UI's `USelect`. Reka's USelect
 * re-mounts ~12 collection-item components (each with pointer/focus/drag
 * handlers) on every open and does not tear them down on close, leaking
 * ~200 listeners per open/close cycle — after a few opens every
 * scroll/pointer event fires hundreds of stale handlers and the page
 * crawls. A native `<select>` carries exactly one change handler, styled
 * from the same engine tokens as the rest of the chrome.
 *
 * Options render by POSITION (`String(index)` as the option value) so the
 * emitted `update:modelValue` payload can look the matching entry back up
 * in `normalizedItems` and emit its ORIGINAL typed `value` — never the raw
 * string a native `<select>` would otherwise hand back. This is what lets
 * number-valued items (e.g. a hue-variant index) round-trip as numbers.
 *
 * Generic over the value type `T` so `v-model` call sites get a precisely
 * typed `modelValue`/`update:modelValue` (e.g. `number` for a hue-variant
 * index, a string literal union for an algorithm key) inferred straight
 * from `items`/`modelValue`, with no cast needed at the call site.
 */
type AppSelectItemType<V> = { label: string; value: V };

const props = defineProps<{
  items: readonly (AppSelectItemType<T> | T)[];
  modelValue?: T;
  placeholder?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: T] }>();

/** Plain-value items (`readonly T[]`, e.g. `readonly string[]`) become `{label: String(v), value: v}` pairs, same shape as explicit `{label, value}` items. */
const normalizedItems = computed<AppSelectItemType<T>[]>(
  () => props.items.map((item) => (typeof item === 'object' ? item : { 'label': String(item), 'value': item }))
);

/** Index of the item whose (typed) value matches modelValue — -1 when modelValue is undefined or matches nothing, which is when the placeholder (if any) renders. */
const selectedIndex = computed<number>(() => {
  if (props.modelValue === undefined) return -1;
  return normalizedItems.value.findIndex((item) => item.value === props.modelValue);
});

const showPlaceholder = computed<boolean>(() => props.placeholder !== undefined && selectedIndex.value === -1);

function onChange(event: Event): void {
  const raw = (event.target as HTMLSelectElement).value;
  if (raw === '') return;
  const item = normalizedItems.value[Number(raw)];
  if (item === undefined) return;
  emit('update:modelValue', item.value);
}
</script>

<template>
  <div
    class="app-select-wrap"
    :class="`app-select-wrap--${size ?? 'md'}`"
  >
    <select
      class="app-select"
      :value="selectedIndex >= 0 ? String(selectedIndex) : ''"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @change="onChange"
    >
      <option
        v-if="showPlaceholder"
        value=""
        disabled
        selected
      >
        {{ placeholder }}
      </option>
      <option
        v-for="(item, index) in normalizedItems"
        :key="index"
        :value="String(index)"
      >
        {{ item.label }}
      </option>
    </select>
    <UIcon
      name="i-lucide-chevron-down"
      class="app-select-chevron"
    />
  </div>
</template>

<style scoped>
/* Every color is an engine `--ui-*` token so this stays inside the systemic
   contrast gate in both framings, same as the theme picker this generalizes. */
.app-select-wrap {
  position: relative;
  display: inline-flex;
  width: 100%;
  align-items: center;
}
.app-select {
  appearance: none;
  width: 100%;
  color: var(--ui-text);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: var(--iridis-radius-md, 0.5rem);
  cursor: pointer;
}
.app-select:hover { border-color: var(--ui-border-accented); }
.app-select:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.app-select:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 1px;
}
.app-select-chevron {
  position: absolute;
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
  pointer-events: none;
}
.app-select-wrap--md .app-select {
  padding: 0.3rem 2rem 0.3rem 0.75rem;
  font-size: 0.8rem;
  line-height: 1.4;
}
.app-select-wrap--md .app-select-chevron { right: 0.55rem; }

.app-select-wrap--sm .app-select {
  padding: 0.3rem 1.85rem 0.3rem 0.65rem;
  font-size: 0.75rem;
  line-height: 1.4;
}
.app-select-wrap--sm .app-select-chevron {
  right: 0.5rem;
  width: 0.9rem;
  height: 0.9rem;
}

.app-select-wrap--xs .app-select {
  padding: 0.2rem 1.6rem 0.2rem 0.5rem;
  font-size: 0.7rem;
  line-height: 1.3;
}
.app-select-wrap--xs .app-select-chevron {
  right: 0.4rem;
  width: 0.8rem;
  height: 0.8rem;
}
</style>
