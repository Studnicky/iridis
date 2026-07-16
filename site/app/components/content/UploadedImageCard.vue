<script setup lang="ts">
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';
import { UPLOADED_IMAGE_CARD_HELP_TEXT, UPLOADED_IMAGE_K_TIER_ITEMS } from './uploadedImage/buildUploadedImageCardModel.ts';

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
      :k-tier-items="UPLOADED_IMAGE_K_TIER_ITEMS"
      :delta-e-cap-help="UPLOADED_IMAGE_CARD_HELP_TEXT.deltaECapHelp"
      :histogram-help="UPLOADED_IMAGE_CARD_HELP_TEXT.histogramHelp"
      :harmonize-help="UPLOADED_IMAGE_CARD_HELP_TEXT.harmonizeHelp"
      :lightness-help="UPLOADED_IMAGE_CARD_HELP_TEXT.lightnessHelp"
      :chroma-help="UPLOADED_IMAGE_CARD_HELP_TEXT.chromaHelp"
      @update="emit('update', $event)"
      @select-candidate="emit('select-candidate', $event)"
    />
  </div>
</template>
