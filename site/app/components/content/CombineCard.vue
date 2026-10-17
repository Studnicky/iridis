<script setup lang="ts">
import { computed } from 'vue';
import { IridisUiEvent } from '~/composables/types/index.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { UseModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import { buildCombineStageModel } from './combine/buildCombineStageModel.ts';
import PaletteCandidatePicker from './PaletteCandidatePicker.vue';
import type { ClusterStrategyInterface, GalleryCandidateOutputEntity } from '@studnicky/iridis-image';

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
  schemaName, imageSeeds, running, uploadedImages, effectiveHexesFor,
  imgStrategy, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange,
  candidates, selectedCandidateLabel,
  combineLocked, reRunCombine
} = useIridis();
const { send } = useIridisUiMachine();

/** Image extraction/upload/sampling implies the engine should theme from the extracted image. */
const sendImageAction = UseModeGuardedSend.image(send);

function selectCandidate(candidate: GalleryCandidateOutputEntity.Type): void {
  sendImageAction(buildCombineStageModel.buildCandidateSelectionEvent(candidate));
}

class ImageAlgorithmEventResolver {
  static resolve(strategy: ClusterStrategyInterface): IridisUiEvent {
    const algorithm = strategy.serializeAlgorithm();
    const factories = new Map<string, () => IridisUiEvent>([
      ['delta-e', IridisUiEvent.setDeltaEImageAlgorithm],
      ['k-means', IridisUiEvent.setKMeansImageAlgorithm],
      ['median-cut', IridisUiEvent.setMedianCutImageAlgorithm],
      ['wu-quantize', IridisUiEvent.setWuQuantizeImageAlgorithm]
    ]);
    const factory = factories.get(algorithm);
    if (factory === undefined) {
      throw new RangeError(`Unsupported image algorithm: ${algorithm}`);
    }
    const result = factory();
    return result;
  }
}

function updateImageStrategy(strategy: ClusterStrategyInterface): void {
  sendImageAction(ImageAlgorithmEventResolver.resolve(strategy));
}

/** Read-only reference — each uploaded image's own already-extracted palette, so it's clear what's feeding the merge below without duplicating that image's own (editable) controls, which live on its own card in Upload. */
const selectedPalettes = computed(() => buildCombineStageModel.buildSelectedPalettes(uploadedImages.value, effectiveHexesFor));
const extractedHueHexes = computed(() => buildCombineStageModel.buildImageSeedHexes(imageSeeds.value));
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
      :strategy="imgStrategy"
      :delta-e-cap="imgDeltaECap"
      :histogram-bits="imgHistogramBits"
      :harmonize-threshold="imgHarmonize"
      :lightness-range="imgLightnessRange"
      :chroma-range="imgChromaRange"
      :delta-e-cap-help="buildCombineStageModel.helpText.deltaECapHelp"
      :histogram-help="buildCombineStageModel.helpText.histogramHelp"
      :harmonize-help="buildCombineStageModel.helpText.harmonizeHelp"
      :lightness-help="buildCombineStageModel.helpText.lightnessHelp"
      :chroma-help="buildCombineStageModel.helpText.chromaHelp"
      @rerun="reRunCombine"
      @update:combine-locked="combineLocked = $event"
      @update:schema-name="send(IridisUiEvent.setSchema($event))"
      @update:strategy="updateImageStrategy"
      @update:delta-e-cap="sendImageAction(IridisUiEvent.setImageDeltaECap($event))"
      @update:histogram-bits="sendImageAction(IridisUiEvent.setImageHistogramBits($event))"
      @update:harmonize-threshold="sendImageAction(IridisUiEvent.setImageHarmonize($event))"
      @update:lightness-range="sendImageAction(IridisUiEvent.setImageLightnessRange($event))"
      @update:chroma-range="sendImageAction(IridisUiEvent.setImageChromaRange($event))"
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
