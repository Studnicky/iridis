<script setup lang="ts">
import type { HueAlgorithmType } from '~/composables/types/colorDerivation.ts';
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

defineProps<{
  algorithmOptions: readonly { label: string; value: HueAlgorithmType }[];
  role: RoleMathEntryType;
  variantItems: readonly { label: string; value: number }[];
  variantLabel: string;
}>();

const emit = defineEmits<{
  'algorithm-change': [algorithm: HueAlgorithmType];
  'freeform-offset-change': [offset: number];
  'variant-change': [variantIndex: number];
}>();
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 rounded border border-default/40 p-2">
    <span
      class="inline-block h-3 w-3 flex-none rounded-full ring-1 ring-default/50"
      :style="{ background: role.hex }"
    />
    <span class="w-24 flex-none truncate text-xs font-medium text-highlighted">{{ role.name }}</span>
    <AppSelect
      :model-value="role.algorithmInfo?.hueAlgorithm ?? 'monochromatic'"
      :items="algorithmOptions"
      size="xs"
      class="w-32 flex-none"
      @update:model-value="($event) => emit('algorithm-change', $event)"
    />
    <AppSelect
      v-if="role.algorithmInfo && role.algorithmInfo.hueAlgorithm !== 'freeform'"
      :model-value="role.algorithmInfo.hueVariantIndex"
      :items="variantItems"
      size="xs"
      class="w-24 flex-none"
      @update:model-value="($event) => emit('variant-change', $event)"
    />
    <UInput
      v-else
      type="number"
      :model-value="role.algorithmInfo?.freeformOffset ?? 0"
      size="xs"
      class="w-16 flex-none"
      @update:model-value="($event) => emit('freeform-offset-change', Number($event))"
    />
    <span class="flex-none text-xs text-dimmed">{{ variantLabel }}</span>
  </div>
</template>
