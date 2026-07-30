<script setup lang="ts">
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';
import { buildUploadedImageCardModel } from './uploadedImage/buildUploadedImageCardModel.ts';

/**
 * One uploaded image's own extraction card — thumbnail, filename, a remove
 * button, and that image's own algorithm/k/histogramBits/deltaECap/harmonize/
 * lightness+chroma range controls plus its own histogram preview. Editing any
 * control here re-runs ONLY this image's Stage-1 extraction (via the `update`
 * emit), never any other uploaded image's.
 */
const props = withDefaults(defineProps<{ image: UploadedImageInterfaceType; showHeader?: boolean }>(), {
  showHeader: true
});
const emit = defineEmits<{
  'remove': [];
  'select-candidate': [label: string];
  'update': [patch: UploadedImageInterfaceType];
}>();
const cardModel = buildUploadedImageCardModel.build();
</script>

<template>
  <div class="relative space-y-3">
    <UploadedImageHeader
      :name="image.name"
      :src="image.src"
      :dominant-color-count="image.dominantColorRecords.length"
      :show-header="showHeader"
      @remove="emit('remove')"
    />

    <UploadedImageDetailsPanel
      :image="image"
      :k-tier-items="cardModel.kTierItems"
      :delta-e-cap-help="cardModel.helpText.deltaECapHelp"
      :histogram-help="cardModel.helpText.histogramHelp"
      :harmonize-help="cardModel.helpText.harmonizeHelp"
      :lightness-help="cardModel.helpText.lightnessHelp"
      :chroma-help="cardModel.helpText.chromaHelp"
      @update="emit('update', $event)"
      @select-candidate="emit('select-candidate', $event)"
    />
  </div>
</template>
