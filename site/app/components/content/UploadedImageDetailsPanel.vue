<script setup lang="ts">
import type { UploadedImage } from '~/composables/types/index.ts';
import { buildUploadedImagePatchModel } from './uploadedImage/buildUploadedImagePatchModel.ts';

defineProps<{
  image: UploadedImage;
  kTierItems: readonly { label: string; value: number }[];
  deltaECapHelp: string;
  histogramHelp: string;
  harmonizeHelp: string;
  lightnessHelp: string;
  chromaHelp: string;
}>();

const emit = defineEmits<{
  'select-candidate': [label: string];
  'update': [patch: UploadedImage];
}>();
</script>

<template>
  <div class="space-y-3">
    <Histogram :bins="image.histogram" />

    <ImageTuningFields
      :strategy="image.strategy"
      :delta-e-cap="image.deltaECap"
      :histogram-bits="image.histogramBits"
      :harmonize-threshold="image.harmonizeThreshold"
      :lightness-range="image.lightnessRange"
      :chroma-range="image.chromaRange"
      :delta-e-cap-help="deltaECapHelp"
      :histogram-help="histogramHelp"
      :harmonize-help="harmonizeHelp"
      :lightness-help="lightnessHelp"
      :chroma-help="chromaHelp"
      @update:strategy="emit('update', buildUploadedImagePatchModel.buildStrategy(image, $event))"
      @update:delta-e-cap="emit('update', buildUploadedImagePatchModel.buildDeltaECap(image, $event))"
      @update:histogram-bits="emit('update', buildUploadedImagePatchModel.buildHistogramBits(image, $event))"
      @update:harmonize-threshold="emit('update', buildUploadedImagePatchModel.buildHarmonizeThreshold(image, $event))"
      @update:lightness-range="emit('update', buildUploadedImagePatchModel.buildLightnessRange(image, $event))"
      @update:chroma-range="emit('update', buildUploadedImagePatchModel.buildChromaRange(image, $event))"
    >
      <template #beforeHistogramBits>
        <UFormField
          :label="`Colors · ${image.k}`"
          class="sm:col-span-2"
        >
          <SegmentedSlider
            :items="kTierItems"
            :model-value="image.k"
            :min-width="48"
            :gap="8"
            @update:model-value="emit('update', buildUploadedImagePatchModel.buildK(image, $event))"
          />
        </UFormField>
      </template>
    </ImageTuningFields>

    <SwatchList
      v-if="image.dominantColorRecords.length > 0"
      title="Extracted hues"
      :swatches="image.dominantColorRecords.map((record) => record.hex)"
      :aria-label-prefix="`${image.name} dominant hue`"
      class="mt-4"
    />

    <PaletteCandidatePicker
      v-if="image.candidates.length > 0"
      :candidates="image.candidates"
      :selected-label="image.selectedCandidateLabel"
      class="mt-4"
      @select="emit('select-candidate', $event.label)"
    />
  </div>
</template>
