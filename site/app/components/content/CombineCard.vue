<script setup lang="ts">
import { computed } from 'vue';
import { IridisUiActionType } from '~/composables/types/index.ts';
import type { GalleryAlgorithmType } from '~/composables/types/galleryAlgorithm.ts';
import { ALGORITHM_HELP, ALGORITHM_ITEMS, ALGORITHM_LABELS } from '~/composables/GalleryAlgorithms.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import PaletteCandidatePicker from './PaletteCandidatePicker.vue';
import RangeListEditor from './RangeListEditor.vue';
import SchemaSelector from './SchemaSelector.vue';
import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';

/**
 * The Combine stage — final merge tuning across every uploaded image. Its own
 * top-level stage carousel card (only rendered once at least one image is
 * uploaded, see index.vue), between Upload and Refine. Every control here
 * (algorithm, histogram bits, ΔE cap, harmonize, lightness/chroma range) is a
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
  sendImageAction({
    hexes: candidate.colors.map((c) => c.hex),
    label: candidate.label,
    type: IridisUiActionType.SELECT_IMAGE_CANDIDATE
  });
}

/** Read-only reference — each uploaded image's own already-extracted palette, so it's clear what's feeding the merge below without duplicating that image's own (editable) controls, which live on its own card in Upload. */
type SelectedPaletteType = { key: string; label: string; algorithmLabel: string; hexes: readonly string[] };
const selectedPalettes = computed<SelectedPaletteType[]>(() => uploadedImages.value.map((entry) => {
  const algorithmKey = entry.selectedCandidateLabel ?? entry.algorithm;
  return {
    algorithmLabel: ALGORITHM_LABELS[algorithmKey] ?? algorithmKey,
    hexes: effectiveHexesFor(entry),
    key: entry.id,
    label: entry.name || 'Sample'
  };
}));
</script>

<template>
  <div
    v-auto-animate
    class="w-full space-y-5"
  >
    <div class="space-y-1">
      <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Combine
      </p>
      <p class="text-sm text-muted">
        These settings control the FINAL merge across every uploaded image — not any single photo's own extraction. The result feeds the Refine stage's Palette card as the hue list you refine and assign roles from.
      </p>
    </div>

    <div class="space-y-1">
      <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Per-image palettes
      </p>
      <p class="text-sm text-muted">
        Each image's own already-extracted palette — a reference for what's feeding the merge below. Adjust an image's own extraction on its card back in Upload.
      </p>
      <BalancedWrap
        :items="selectedPalettes"
        :min-width="200"
        :gap="12"
      >
        <template #default="{ item: card }">
          <div class="glass scanlines flex flex-1 max-w-xs flex-col gap-3 p-4">
            <div class="flex items-center justify-between gap-2">
              <span
                class="truncate font-display text-sm font-bold uppercase tracking-widest glow-text"
                :title="card.label"
              >{{ card.label }}</span>
              <span class="h-3 w-3 shrink-0 rounded-full pulse bg-primary" />
            </div>
            <div
              v-if="card.hexes.length === 0"
              class="text-xs text-muted italic"
            >
              None
            </div>
            <BalancedWrap
              v-else
              :items="[...card.hexes]"
              :min-width="28"
              :gap="4"
            >
              <template #default="{ item: hex }">
                <span
                  class="h-7 w-7 rounded border border-default/50"
                  :style="{ backgroundColor: hex }"
                  :title="hex"
                  role="img"
                  :aria-label="`${card.label} color ${hex}`"
                />
              </template>
            </BalancedWrap>
            <UBadge
              color="neutral"
              variant="soft"
              size="sm"
              class="self-start"
            >
              {{ card.algorithmLabel }}
            </UBadge>
          </div>
        </template>
      </BalancedWrap>
    </div>

    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-default p-3">
      <USwitch
        v-model="combineLocked"
        :icon="combineLocked ? 'i-material-symbols-lock-outline-rounded' : 'i-material-symbols-lock-open-outline-rounded'"
        label="Lock"
        :aria-label="combineLocked ? 'Combine locked' : 'Combine unlocked'"
      />
      <UButton
        icon="i-material-symbols-refresh-rounded"
        color="primary"
        variant="soft"
        size="sm"
        @click="reRunCombine"
      >
        Re-run
      </UButton>
      <p class="w-full text-xs text-muted">
        Lock to keep this palette while uploading more images — click Re-run when you're ready to recombine.
      </p>
    </div>
    <div class="space-y-4 my-6 relative">
      <!-- Spinner Overlay -->
      <div
        v-if="running"
        class="absolute inset-0 z-10 flex items-center justify-center bg-elevated/50 backdrop-blur-sm rounded-lg"
      >
        <UIcon
          name="i-material-symbols-progress-activity"
          class="size-8 animate-spin text-primary"
        />
      </div>

      <Histogram />
    </div>
    <div class="grid gap-x-6 gap-y-4 rounded-lg border border-default p-4 sm:grid-cols-2 mt-4">
      <UFormField label="Clustering algorithm">
        <USelect
          :model-value="imgAlgorithm"
          :items="ALGORITHM_ITEMS"
          value-key="value"
          class="w-full"
          @update:model-value="sendImageAction({ algorithm: $event as GalleryAlgorithmType, type: IridisUiActionType.SET_IMAGE_ALGORITHM })"
        />
        <p class="mt-1 text-xs text-muted">
          {{ ALGORITHM_HELP[imgAlgorithm] }}
        </p>
      </UFormField>
      <UFormField
        v-if="imgAlgorithm === 'delta-e'"
        :label="`ΔE cap · ${imgDeltaECap}`"
      >
        <USlider
          :model-value="imgDeltaECap"
          :min="16"
          :max="256"
          :step="8"
          @update:model-value="sendImageAction({ cap: $event as number, type: IridisUiActionType.SET_IMAGE_DELTA_E_CAP })"
        />
        <p class="mt-1 text-xs text-muted">
          Caps how many histogram bins feed the ΔE merger (it's O(n²), so this bounds the work). Lower keeps only the heaviest bins; raise it if a distinct minor color is getting dropped before it can merge.
        </p>
      </UFormField>

      <!-- Same control as "Role schema" in Schema & Compliance — image extraction's
           color count IS the schema's role count, not a second independent number.
           Moving either one moves the other, since both read/write schemaName. -->
      <UFormField
        :label="`Colors — role schema · ${schemaName}`"
        class="sm:col-span-2"
      >
        <SchemaSelector
          :model-value="schemaName"
          @update:model-value="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: $event })"
        />
        <p class="mt-1 text-xs text-muted">
          How many dominant colors to extract from the image — the same "how many roles to resolve" setting as Schema &amp; Compliance in the Refine stage, not a second independent count. Change it here or there; both move together.
        </p>
      </UFormField>

      <UFormField :label="`Histogram bits · ${imgHistogramBits}`">
        <USlider
          :model-value="imgHistogramBits"
          :min="3"
          :max="7"
          :step="1"
          @update:model-value="sendImageAction({ bits: $event as number, type: IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS })"
        />
        <p class="mt-1 text-xs text-muted">
          Bits per RGB channel when bucketing pixels before clustering. Higher keeps finer color detail but produces more bins for the clustering step to chew through; lower is faster and smooths out near-duplicate shades.
        </p>
      </UFormField>
      <UFormField :label="`Harmonize threshold · ${imgHarmonize}`">
        <USlider
          :model-value="imgHarmonize"
          :min="0"
          :max="30"
          :step="1"
          @update:model-value="sendImageAction({ threshold: $event as number, type: IridisUiActionType.SET_IMAGE_HARMONIZE })"
        />
        <p class="mt-1 text-xs text-muted">
          After clustering, hues within this ΔE distance of each other are nudged into agreement — cleans up near-duplicate colors the clustering step left slightly apart. 0 disables it.
        </p>
      </UFormField>

      <RangeListEditor
        :model-value="imgLightnessRange"
        :min="0"
        :max="1"
        :step="0.01"
        :default-range="[0, 1]"
        label="Lightness ranges"
        help="Only pixels whose OKLCH lightness falls in one of these bands are considered — use it to ignore black bars (low L) or blown-out highlights (high L). Multiple ranges are a union: add a second band to keep shadows AND highlights while still excluding the midtones between them."
        @update:model-value="sendImageAction({ range: $event, type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE })"
      />
      <RangeListEditor
        :model-value="imgChromaRange"
        :min="0"
        :max="0.5"
        :step="0.01"
        :default-range="[0, 0.5]"
        label="Chroma ranges"
        help="Only pixels whose OKLCH chroma (saturation) falls in one of these bands are considered — raise the floor to ignore a near-neutral background so the cluster budget goes toward colors the image actually cares about. Also a union of ranges."
        @update:model-value="sendImageAction({ range: $event, type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE })"
      />
    </div>

    <div class="space-y-1 mt-4">
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Extracted hues
      </div>
      <div
        v-if="imageSeeds.length === 0"
        class="text-sm text-muted italic min-h-[30px]"
      >
        None
      </div>
      <BalancedWrap
        v-else
        :items="imageSeeds"
        :min-width="28"
        :gap="4"
      >
        <template #default="{ item: seed }">
          <div
            class="h-7 w-7 rounded-md border border-default"
            :style="{ backgroundColor: seed.hex }"
            :title="seed.hex"
            role="img"
            :aria-label="`Extracted hue ${seed.hex}`"
          />
        </template>
      </BalancedWrap>
    </div>

    <PaletteCandidatePicker
      v-if="candidates.length > 0"
      :candidates="candidates"
      :selected-label="selectedCandidateLabel"
      class="mt-4"
      @select="selectCandidate"
    />
  </div>
</template>
