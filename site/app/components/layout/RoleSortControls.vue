<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { IridisUiEvent } from '~/composables/types/index.ts';
import { RoleSortBehavior } from '~/utils/roleSortBehavior.ts';
import { ROLE_SORT_FIELD_OPTIONS } from '~/utils/roleSortFieldOptions.ts';

/**
 * Shared multi-key sort control — every role listing (Roles table, Resolved
 * roles, Clamps) mounts this SAME component bound to the SAME roleSortKeys
 * state, dispatched through SET_ROLE_SORT. There is exactly one sort order
 * for "the palette" at a time, not a per-card local one that can drift from
 * its neighbours.
 */
const { roleSortKeys } = useIridis();
const { send } = useIridisUiMachine();

const addableOptions = computed(() => ROLE_SORT_FIELD_OPTIONS.filter((option) => {
  const selected = roleSortKeys.value.some((key) => {
    const matches = key.behavior.matches(option.value);
    return matches;
  });
  const addable = !selected;
  return addable;
}));
const newField = ref<number | undefined>(undefined);

function addKey(optionIndex: number): void {
  const option = addableOptions.value[optionIndex];
  if (option === undefined) return;
  const field = option.value;
  // Clear BEFORE dispatching: addableOptions is derived from roleSortKeys, so
  // the instant the FSM adds this field, it drops out of :items — if newField
  // still pointed at it when that happens, AppSelect has no matching item to
  // resolve an index from and falls back to rendering the placeholder
  // instead of a stale selection.
  newField.value = undefined;
  const behavior = RoleSortBehavior.ascending(field);
  send(IridisUiEvent.setRoleSort([...roleSortKeys.value, { behavior }]));
}
function removeKey(index: number): void {
  send(IridisUiEvent.setRoleSort(roleSortKeys.value.filter((_, keyIndex) => keyIndex !== index)));
}
function toggleKeyDirection(index: number): void {
  const next = roleSortKeys.value.map((key, keyIndex) => {
    const behavior = keyIndex === index ? key.behavior.toggleDirection() : key.behavior;
    const result = { behavior };
    return result;
  });
  send(IridisUiEvent.setRoleSort(next));
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UBadge
      v-for="(key, index) in roleSortKeys"
      :key="key.behavior.label"
      color="neutral"
      variant="soft"
      class="flex items-center gap-1 py-1"
    >
      <span>{{ index + 1 }}. {{ key.behavior.label }}</span>
      <button
        type="button"
        class="flex items-center"
        :aria-label="`Toggle ${key.behavior.label} sort direction`"
        :aria-pressed="key.behavior.isDescending()"
        @click="toggleKeyDirection(index)"
      >
        <UIcon :name="key.behavior.isDescending() ? 'i-material-symbols-arrow-downward-rounded' : 'i-material-symbols-arrow-upward-rounded'" />
      </button>
      <button
        v-if="roleSortKeys.length > 1"
        type="button"
        class="ml-0.5 text-muted hover:text-highlighted"
        :aria-label="`Remove ${key.behavior.label} sort key`"
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
