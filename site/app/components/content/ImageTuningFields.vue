<script setup lang="ts">
import type { ClusterStrategyInterface } from '@studnicky/iridis-image';

import { ALGORITHM_HELP } from '~/composables/algorithmHelp.ts';
import { ALGORITHM_ITEMS } from '~/composables/algorithmItems.ts';

defineProps<{
  strategy: ClusterStrategyInterface;
  deltaECap: number;
  histogramBits: number;
  harmonizeThreshold: number;
  lightnessRange: readonly [number, number][];
  chromaRange: readonly [number, number][];
  deltaECapHelp: string;
  harmonizeHelp: string;
  histogramHelp?: string;
  lightnessHelp: string;
  chromaHelp: string;
  showAlgorithmHelp?: boolean;
  includeKSelector?: boolean;
}>();

const emit = defineEmits<{
  'update:strategy': [value: ClusterStrategyInterface];
  'update:deltaECap': [value: number];
  'update:histogramBits': [value: number];
  'update:harmonizeThreshold': [value: number];
  'update:lightnessRange': [value: [number, number][]];
  'update:chromaRange': [value: [number, number][]];
}>();

const algorithmItems = ALGORITHM_ITEMS.map((item) => {
  const result = { 'label': item.label, 'value': item.strategy.serializeAlgorithm() };
  return result;
});

function selectedAlgorithm(strategy: ClusterStrategyInterface): string {
  const result = strategy.serializeAlgorithm();
  return result;
}

function selectStrategy(algorithm: string): void {
  for (const item of ALGORITHM_ITEMS) {
    if (item.strategy.serializeAlgorithm() === algorithm) {
      emit('update:strategy', item.strategy);
      return;
    }
  }
  throw new RangeError(`Unsupported clustering algorithm: ${algorithm}`);
}
</script>

<template>
  <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
    <UFormField label="Clustering algorithm">
      <AppSelect
        :model-value="selectedAlgorithm(strategy)"
        :items="algorithmItems"
        class="w-full"
        @update:model-value="selectStrategy"
      />
      <FieldHelpText
        v-if="showAlgorithmHelp"
      >
        {{ ALGORITHM_HELP[strategy.serializeAlgorithm()] }}
      </FieldHelpText>
    </UFormField>

    <UFormField
      v-if="strategy.serializeAlgorithm() === 'delta-e'"
      :label="`Merge input cap · ${deltaECap}`"
    >
      <USlider
        :model-value="deltaECap"
        :min="16"
        :max="256"
        :step="8"
        @update:model-value="emit('update:deltaECap', $event as number)"
      />
      <FieldHelpText>
        {{ deltaECapHelp }}
      </FieldHelpText>
    </UFormField>

    <slot name="beforeHistogramBits" />

    <UFormField :label="`Histogram bits · ${histogramBits}`">
      <USlider
        :model-value="histogramBits"
        :min="3"
        :max="7"
        :step="1"
        @update:model-value="emit('update:histogramBits', $event as number)"
      />
      <FieldHelpText
        v-if="histogramHelp"
      >
        {{ histogramHelp }}
      </FieldHelpText>
    </UFormField>

    <UFormField :label="`Harmonize threshold · ${harmonizeThreshold}`">
      <USlider
        :model-value="harmonizeThreshold"
        :min="0"
        :max="30"
        :step="1"
        @update:model-value="emit('update:harmonizeThreshold', $event as number)"
      />
      <FieldHelpText>
        {{ harmonizeHelp }}
      </FieldHelpText>
    </UFormField>

    <RangeListEditor
      :model-value="lightnessRange"
      :min="0"
      :max="1"
      :step="0.01"
      :default-range="[0, 1]"
      label="Lightness ranges"
      :help="lightnessHelp"
      class="sm:col-span-2"
      @update:model-value="emit('update:lightnessRange', $event)"
    />

    <RangeListEditor
      :model-value="chromaRange"
      :min="0"
      :max="0.5"
      :step="0.01"
      :default-range="[0, 0.5]"
      label="Chroma ranges"
      :help="chromaHelp"
      class="sm:col-span-2"
      @update:model-value="emit('update:chromaRange', $event)"
    />
  </div>
</template>
