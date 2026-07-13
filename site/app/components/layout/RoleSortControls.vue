<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';
import { ROLE_SORT_FIELD_OPTIONS, roleSortFieldLabel } from '~/utils/roleSort.ts';
import type { RoleSortField } from '~/utils/roleSort.ts';

/**
 * Shared multi-key sort control — every role listing (Roles table, Resolved
 * roles, Clamps) mounts this SAME component bound to the SAME roleSortKeys
 * state, dispatched through SET_ROLE_SORT. There is exactly one sort order
 * for "the palette" at a time, not a per-card local one that can drift from
 * its neighbours.
 */
const { roleSortKeys } = useIridis();
const { send } = useIridisUiMachine();

const addableOptions = computed(() => ROLE_SORT_FIELD_OPTIONS.filter((o) => !roleSortKeys.value.some((k) => k.field === o.value)));
const newField = ref<RoleSortField | undefined>(undefined);

function addKey(): void {
  if (newField.value === undefined) return;
  const field = newField.value;
  // Clear BEFORE dispatching: addableOptions is derived from roleSortKeys, so
  // the instant the FSM adds this field, it drops out of :items — if newField
  // still pointed at it when that happens, USelect has no matching item to
  // resolve a label from and falls back to rendering the raw value ("h")
  // instead of the placeholder.
  newField.value = undefined;
  send({ 'keys': [...roleSortKeys.value, { 'desc': false, field }], 'type': IridisUiActionType.SET_ROLE_SORT });
}
function removeKey(index: number): void {
  send({ 'keys': roleSortKeys.value.filter((_, i) => i !== index), 'type': IridisUiActionType.SET_ROLE_SORT });
}
function toggleKeyDesc(index: number): void {
  const next = roleSortKeys.value.map((k, i) => (i === index ? { ...k, 'desc': !k.desc } : k));
  send({ 'keys': next, 'type': IridisUiActionType.SET_ROLE_SORT });
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UBadge
      v-for="(key, index) in roleSortKeys"
      :key="key.field"
      color="neutral"
      variant="soft"
      class="flex items-center gap-1 py-1"
    >
      <span>{{ index + 1 }}. {{ roleSortFieldLabel(key.field) }}</span>
      <button
        type="button"
        class="flex items-center"
        :aria-label="`Toggle ${roleSortFieldLabel(key.field)} sort direction`"
        :aria-pressed="key.desc"
        @click="toggleKeyDesc(index)"
      >
        <UIcon :name="key.desc ? 'i-material-symbols-arrow-downward-rounded' : 'i-material-symbols-arrow-upward-rounded'" />
      </button>
      <button
        v-if="roleSortKeys.length > 1"
        type="button"
        class="ml-0.5 text-muted hover:text-highlighted"
        :aria-label="`Remove ${roleSortFieldLabel(key.field)} sort key`"
        @click="removeKey(index)"
      >
        ×
      </button>
    </UBadge>

    <USelect
      v-if="addableOptions.length > 0"
      v-model="newField"
      :items="addableOptions"
      value-key="value"
      placeholder="+ Add sort key"
      class="w-40"
      size="xs"
      @update:model-value="addKey"
    />
  </div>
</template>
