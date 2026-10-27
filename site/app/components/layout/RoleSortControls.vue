<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePresentationControls } from '~/composables/usePresentationControls.ts';
import { ROLE_SORT_FIELD_OPTIONS } from '~/utils/roleSortFieldOptions.ts';

/**
 * Shared multi-key sort control — every role listing (Roles table, Resolved
 * roles, Clamps) mounts this SAME component bound to the SAME sort keys held
 * by the presentation-controls store. There is exactly one sort order for
 * "the palette" at a time, not a per-card local one that can drift from its
 * neighbours.
 */
const { dispatch, readModel } = usePresentationControls();

const sortKeys = computed(() => readModel.value.roleSortKeys.map((key) => {
  const option = ROLE_SORT_FIELD_OPTIONS.find((candidate) => candidate.key === key.field);
  return { 'descending': key.direction === 'descending', 'field': key.field, 'label': option?.label ?? key.field };
}));
const addableOptions = computed(() => ROLE_SORT_FIELD_OPTIONS.filter((option) => {
  const selected = readModel.value.roleSortKeys.some((key) => key.field === option.key);
  const addable = !selected;
  return addable;
}));
const newField = ref<number | undefined>(undefined);

function replaceKeys(roleSortKeys: readonly object[]): void {
  void dispatch({ 'interaction': 'role-sort.replace', roleSortKeys });
}
function addKey(optionIndex: number): void {
  const option = addableOptions.value[optionIndex];
  if (option === undefined) return;
  // Clear BEFORE dispatching: addableOptions is derived from the stored keys, so
  // the instant the store adds this field, it drops out of :items — if newField
  // still pointed at it when that happens, AppSelect has no matching item to
  // resolve an index from and falls back to rendering the placeholder
  // instead of a stale selection.
  newField.value = undefined;
  replaceKeys([...readModel.value.roleSortKeys, { 'direction': 'ascending', 'field': option.key }]);
}
function removeKey(index: number): void {
  replaceKeys(readModel.value.roleSortKeys.filter((_, keyIndex) => keyIndex !== index));
}
function toggleKeyDirection(index: number): void {
  replaceKeys(readModel.value.roleSortKeys.map((key, keyIndex) => {
    const direction = key.direction === 'ascending' ? 'descending' : 'ascending';
    return keyIndex === index ? { 'direction': direction, 'field': key.field } : key;
  }));
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UBadge
      v-for="(key, index) in sortKeys"
      :key="key.field"
      color="neutral"
      variant="soft"
      class="flex items-center gap-1 py-1"
    >
      <span>{{ index + 1 }}. {{ key.label }}</span>
      <button
        type="button"
        class="flex items-center"
        :aria-label="`Toggle ${key.label} sort direction`"
        :aria-pressed="key.descending"
        @click="toggleKeyDirection(index)"
      >
        <UIcon :name="key.descending ? 'i-material-symbols-arrow-downward-rounded' : 'i-material-symbols-arrow-upward-rounded'" />
      </button>
      <button
        v-if="sortKeys.length > 1"
        type="button"
        class="ml-0.5 text-muted hover:text-highlighted"
        :aria-label="`Remove ${key.label} sort key`"
        @click="removeKey(index)"
      >
        ×
      </button>
    </UBadge>

    <AppSelect
      v-if="addableOptions.length > 0"
      v-model="newField"
      :items="addableOptions.map((option, index) => ({ label: option.label, value: index }))"
      placeholder="+ Add sort key"
      class="w-40"
      size="xs"
      @update:model-value="addKey"
    />
  </div>
</template>
