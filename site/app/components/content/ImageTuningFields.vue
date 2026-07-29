<script setup lang="ts">
import { ALGORITHM_HELP } from '~/composables/algorithmHelp.ts';
import { ALGORITHM_ITEMS } from '~/composables/algorithmItems.ts';
import type { GalleryAlgorithmType } from '@studnicky/iridis-image/types';

defineProps<{
  algorithm: GalleryAlgorithmType;
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
  'update:algorithm': [value: GalleryAlgorithmType];
  'update:deltaECap': [value: number];
  'update:histogramBits': [value: number];
  'update:harmonizeThreshold': [value: number];
  'update:lightnessRange': [value: [number, number][]];
  'update:chromaRange': [value: [number, number][]];
}>();
</script>

<template>
  <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
    <UFormField label="Clustering algorithm">
      <AppSelect
        :model-value="algorithm"
        :items="ALGORITHM_ITEMS"
        class="w-full"
        @update:model-value="emit('update:algorithm', $event as GalleryAlgorithmType)"
      />
      <FieldHelpText
        v-if="showAlgorithmHelp"
      >
        {{ ALGORITHM_HELP[algorithm] }}
      </FieldHelpText>
    </UFormField>

    <UFormField
      v-if="algorithm === 'delta-e'"
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
