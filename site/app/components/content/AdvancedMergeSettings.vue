<script setup lang="ts">
import { ref } from 'vue';
import type { GalleryAlgorithmType } from '@studnicky/iridis-image/types';

defineProps<{
  algorithm: GalleryAlgorithmType;
  deltaECap: number;
  histogramBits: number;
  harmonizeThreshold: number;
  lightnessRange: readonly [number, number][];
  chromaRange: readonly [number, number][];
  deltaECapHelp: string;
  histogramHelp: string;
  harmonizeHelp: string;
  lightnessHelp: string;
  chromaHelp: string;
}>();

const emit = defineEmits<{
  'update:algorithm': [algorithm: GalleryAlgorithmType];
  'update:delta-e-cap': [cap: number];
  'update:histogram-bits': [bits: number];
  'update:harmonize-threshold': [threshold: number];
  'update:lightness-range': [range: [number, number][]];
  'update:chroma-range': [range: [number, number][]];
}>();

const open = ref(false);
</script>

<template>
  <UCollapsible v-model:open="open">
    <UButton
      block
      color="neutral"
      variant="soft"
      icon="i-material-symbols-tune-rounded"
      :trailing-icon="open ? 'i-material-symbols-keyboard-arrow-up-rounded' : 'i-material-symbols-keyboard-arrow-down-rounded'"
    >
      {{ open ? 'Hide advanced merge settings' : 'Show advanced merge settings' }}
    </UButton>
    <template #content>
      <ControlPlane
        label="Advanced merge settings"
        help="How each image's pixels get clustered and merged into the final palette. The defaults work well for most images."
        class="mt-3"
      >
        <ImageTuningFields
          :algorithm="algorithm"
          :delta-e-cap="deltaECap"
          :histogram-bits="histogramBits"
          :harmonize-threshold="harmonizeThreshold"
          :lightness-range="lightnessRange"
          :chroma-range="chromaRange"
          :delta-e-cap-help="deltaECapHelp"
          :histogram-help="histogramHelp"
          :harmonize-help="harmonizeHelp"
          :lightness-help="lightnessHelp"
          :chroma-help="chromaHelp"
          :show-algorithm-help="true"
          @update:algorithm="emit('update:algorithm', $event)"
          @update:delta-e-cap="emit('update:delta-e-cap', $event)"
          @update:histogram-bits="emit('update:histogram-bits', $event)"
          @update:harmonize-threshold="emit('update:harmonize-threshold', $event)"
          @update:lightness-range="emit('update:lightness-range', $event)"
          @update:chroma-range="emit('update:chroma-range', $event)"
        />
      </ControlPlane>
    </template>
  </UCollapsible>
</template>
