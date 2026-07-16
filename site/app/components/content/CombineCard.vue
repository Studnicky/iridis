<script setup lang="ts">
import { computed } from 'vue';
import { IridisUiActionType } from '~/composables/types/index.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import {
  buildCombineCandidateSelectionEvent,
  buildImageSeedHexes,
  buildSelectedPalettes,
  COMBINE_STAGE_HELP_TEXT
} from './combine/buildCombineStageModel.ts';
import PaletteCandidatePicker from './PaletteCandidatePicker.vue';
import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';

/**
 * The Combine stage — final merge tuning across every uploaded image. Its own
 * top-level stage carousel card (only rendered once at least one image is
 * uploaded, see index.vue), between Upload and Refine. Every control here
 * (algorithm, histogram bits, merge input cap, harmonize, lightness/chroma range) is a
 * SEPARATE set of settings from any single image's own extraction controls
 * (those live on that image's own card in Upload) — this stage's controls
 * feed a second, independent re-cluster pass over the merged/weighted
 * histogram across every image, not any one photo's own reduction.
 */
const {
  schemaName, mode, imageSeeds, running, uploadedImages, effectiveHexesFor,
  imgAlgorithm, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange,
  candidates, selectedCandidateLabel,
  combineLocked, reRunCombine
} = useIridis();
const { send } = useIridisUiMachine();

/** Image extraction/upload/sampling implies the engine should theme from the extracted image. */
const sendImageAction = useModeGuardedSend(mode, send, 'image');

function selectCandidate(candidate: GalleryCandidateInterfaceType): void {
  sendImageAction(buildCombineCandidateSelectionEvent(candidate));
}

/** Read-only reference — each uploaded image's own already-extracted palette, so it's clear what's feeding the merge below without duplicating that image's own (editable) controls, which live on its own card in Upload. */
const selectedPalettes = computed(() => buildSelectedPalettes(uploadedImages.value, effectiveHexesFor));
const extractedHueHexes = computed(() => buildImageSeedHexes(imageSeeds.value));
</script>

<template>
  <div
    v-auto-animate
    class="w-full space-y-5"
  >
    <SectionIntro
      title="Combine"
      body="These settings control the FINAL merge across every uploaded image — not any single photo's own extraction. The result feeds the Refine stage's Palette card as the hue list you refine and assign roles from."
    />

    <SectionIntro
      title="Per-image palettes"
      body="Each image's own already-extracted palette — a reference for what's feeding the merge below. Adjust an image's own extraction on its card back in Upload."
    >
      <BalancedWrap
        :items="selectedPalettes"
        :min-width="200"
        :gap="12"
      >
        <template #default="{ item: card }">
          <SelectedPaletteCard
            :label="card.label"
            :algorithm-label="card.algorithmLabel"
            :hexes="card.hexes"
          />
        </template>
      </BalancedWrap>
    </SectionIntro>

    <CombineControlsPanel
      :running="running"
      :combine-locked="combineLocked"
      :schema-name="schemaName"
      :algorithm="imgAlgorithm"
      :delta-e-cap="imgDeltaECap"
      :histogram-bits="imgHistogramBits"
      :harmonize-threshold="imgHarmonize"
      :lightness-range="imgLightnessRange"
      :chroma-range="imgChromaRange"
      :delta-e-cap-help="COMBINE_STAGE_HELP_TEXT.deltaECapHelp"
      :histogram-help="COMBINE_STAGE_HELP_TEXT.histogramHelp"
      :harmonize-help="COMBINE_STAGE_HELP_TEXT.harmonizeHelp"
      :lightness-help="COMBINE_STAGE_HELP_TEXT.lightnessHelp"
      :chroma-help="COMBINE_STAGE_HELP_TEXT.chromaHelp"
      @rerun="reRunCombine"
      @update:combine-locked="combineLocked = $event"
      @update:schema-name="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: $event })"
      @update:algorithm="sendImageAction({ algorithm: $event, type: IridisUiActionType.SET_IMAGE_ALGORITHM })"
      @update:delta-e-cap="sendImageAction({ cap: $event, type: IridisUiActionType.SET_IMAGE_DELTA_E_CAP })"
      @update:histogram-bits="sendImageAction({ bits: $event, type: IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS })"
      @update:harmonize-threshold="sendImageAction({ threshold: $event, type: IridisUiActionType.SET_IMAGE_HARMONIZE })"
      @update:lightness-range="sendImageAction({ range: $event, type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE })"
      @update:chroma-range="sendImageAction({ range: $event, type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE })"
    />

    <SwatchList
      class="mt-4"
      title="Extracted hues"
      :swatches="extractedHueHexes"
      empty-label="None"
      aria-label-prefix="Extracted hue"
    />

    <PaletteCandidatePicker
      v-if="candidates.length > 0"
      :candidates="candidates"
      :selected-label="selectedCandidateLabel"
      class="mt-4"
      @select="selectCandidate"
    />
  </div>
</template>
