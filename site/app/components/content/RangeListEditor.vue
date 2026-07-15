<script setup lang="ts">
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
  const next = props.modelValue.map((r) => [...r] as [number, number]);
  next[index] = range;
  emit('update:modelValue', next);
}
function addRange(): void {
  emit('update:modelValue', [...props.modelValue.map((r) => [...r] as [number, number]), props.defaultRange]);
}
function removeRange(index: number): void {
  const next = props.modelValue.map((r) => [...r] as [number, number]).filter((_, i) => i !== index);
  emit('update:modelValue', next.length > 0 ? next : [props.defaultRange]);
}
</script>

<template>
  <UFormField :label="label">
    <p class="mb-2 text-xs text-muted">
      {{ help }}
    </p>
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
        <span class="w-20 shrink-0 font-mono text-xs text-muted">{{ range[0].toFixed(2) }}–{{ range[1].toFixed(2) }}</span>
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
