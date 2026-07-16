<script setup lang="ts">
import {
  appendRangeListEntry,
  removeRangeListEntry,
  updateRangeListEntry
} from './buildRangeListModel.ts';

/**
 * A union-of-ranges editor: N sliders, each an independent [min,max] band,
 * with add/remove controls — always at least one range. Used for both the
 * Combine stage's lightness/chroma envelopes and each per-image card's own
 * copies of the same controls; the parent owns where the value is read from
 * and how an edit gets dispatched (FSM `send()` for the Combine stage, an
 * `update` emit for a per-image card) — this component only knows the
 * range-list editing algorithm itself.
 */
const props = defineProps<{
  'modelValue': readonly (readonly [number, number])[];
  'min': number;
  'max': number;
  'step': number;
  /** Range a freshly-added entry starts at, and what a would-be-empty list falls back to. */
  'defaultRange': [number, number];
  'label': string;
  'help': string;
}>();
const emit = defineEmits<{ 'update:modelValue': [ranges: [number, number][]] }>();

function updateRange(index: number, range: [number, number]): void {
  emit('update:modelValue', updateRangeListEntry(props.modelValue, index, range));
}
function addRange(): void {
  emit('update:modelValue', appendRangeListEntry(props.modelValue, props.defaultRange));
}
function removeRange(index: number): void {
  emit('update:modelValue', removeRangeListEntry(props.modelValue, index, props.defaultRange));
}
</script>

<template>
  <UFormField :label="label">
    <FieldHelpText class="mb-2 mt-0">
      {{ help }}
    </FieldHelpText>
    <div class="space-y-2">
      <div
        v-for="(range, i) in modelValue"
        :key="i"
        class="flex items-center gap-2"
      >
        <USlider
          :model-value="[...range]"
          :min="min"
          :max="max"
          :step="step"
          class="flex-1"
          @update:model-value="updateRange(i, $event as [number, number])"
        />
        <MutedMono class="w-20 shrink-0">
          {{ range[0].toFixed(2) }}–{{ range[1].toFixed(2) }}
        </MutedMono>
        <UButton
          v-if="modelValue.length > 1"
          icon="i-material-symbols-close-rounded"
          color="neutral"
          variant="ghost"
          size="xs"
          :aria-label="`Remove range ${i + 1}`"
          @click="removeRange(i)"
        />
      </div>
      <UButton
        icon="i-material-symbols-add-rounded"
        color="neutral"
        variant="soft"
        size="xs"
        @click="addRange"
      >
        Add range
      </UButton>
    </div>
  </UFormField>
</template>
