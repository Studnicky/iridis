<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import type { GalleryAlgorithmType } from '~/composables/types/galleryAlgorithm.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import PaletteCandidatePicker from './PaletteCandidatePicker.vue';
import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';

/**
 * The Combine stage — final merge tuning across every uploaded image. Its own
 * top-level stage carousel card (only rendered once at least one image is
 * uploaded, see index.vue), between Upload and Refine.
 */
const {
  schemaName, mode, imageSeeds, running,
  imgAlgorithm, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange,
  candidates, selectedCandidateLabel,
  combineLocked, reRunCombine
} = useIridis();
const { send } = useIridisUiMachine();

const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const algorithmItems = [
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'Wu quantize', 'value': 'wu-quantize' },
  { 'label': 'K-means', 'value': 'k-means' }
];
/** One-line "what is this and when would I pick it" for each clustering algorithm — shown under the select so the choice isn't just four unexplained names. */
const algorithmHelp: Record<string, string> = {
  'delta-e':     'Agglomerative merging by perceptual color difference (ΔE2000). Tends to keep small but visually distinct colors that box-splitting algorithms merge away.',
  'median-cut':  'Recursive box splitting at the median of the widest channel. Fast, one-shot, the long-standing default — but a median split can bisect a small distinct cluster.',
  'wu-quantize': 'Recursive box splitting like median cut, but each split lands where it minimizes total clustering error instead of at the median. One-shot, usually a better split than median cut for similar cost.',
  'k-means':     'Iteratively refines K centroids in OKLCH space until they stop moving. Often finds the lowest-error partition of the four, at the cost of being iterative rather than a single pass.'
};

/** Image extraction/upload/sampling implies the engine should theme from the extracted image. */
function sendImageAction(action: Parameters<typeof send>[0]): void {
  if (mode.value !== 'image') mode.value = 'image';
  send(action);
}

function selectCandidate(candidate: GalleryCandidateInterfaceType): void {
  sendImageAction({
    hexes: candidate.colors.map((c) => c.hex),
    label: candidate.label,
    type: IridisUiActionType.SELECT_IMAGE_CANDIDATE
  });
}

/** Each envelope (lightness/chroma) is a UNION of ranges, not one continuous span — these helpers add/edit/remove entries in that list, always sending the whole array back through the same FSM action the single-range slider used to send. */
function updateLightnessRange(index: number, range: [number, number]): void {
  const next = [...imgLightnessRange.value];
  next[index] = range;
  sendImageAction({ range: next, type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE });
}
function addLightnessRange(): void {
  sendImageAction({ range: [...imgLightnessRange.value, [0, 1]], type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE });
}
function removeLightnessRange(index: number): void {
  const next = imgLightnessRange.value.filter((_, i) => i !== index);
  sendImageAction({ range: next.length > 0 ? next : [[0, 1]], type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE });
}
function updateChromaRange(index: number, range: [number, number]): void {
  const next = [...imgChromaRange.value];
  next[index] = range;
  sendImageAction({ range: next, type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE });
}
function addChromaRange(): void {
  sendImageAction({ range: [...imgChromaRange.value, [0, 0.5]], type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE });
}
function removeChromaRange(index: number): void {
  const next = imgChromaRange.value.filter((_, i) => i !== index);
  sendImageAction({ range: next.length > 0 ? next : [[0, 0.5]], type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE });
}
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
          :items="algorithmItems"
          value-key="value"
          class="w-full"
          @update:model-value="sendImageAction({ algorithm: $event as GalleryAlgorithmType, type: IridisUiActionType.SET_IMAGE_ALGORITHM })"
        />
        <p class="mt-1 text-xs text-muted">
          {{ algorithmHelp[imgAlgorithm] }}
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
        <div class="w-full space-y-2">
          <BalancedWrap
            :items="schemaItems"
            :min-width="48"
            :gap="8"
          >
            <template #default="{ item: s }">
              <button
                type="button"
                class="schema-pill flex-1 justify-center text-[11px] font-medium"
                :class="schemaName === s ? 'text-primary font-bold' : 'text-dimmed cursor-pointer hover:text-muted'"
                :aria-pressed="schemaName === s"
                @click="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: s })"
              >
                {{ s.replace('iridis-', '') }}
              </button>
            </template>
          </BalancedWrap>
          <USlider
            :model-value="Math.max(0, schemaItems.indexOf(schemaName))"
            :min="0"
            :max="schemaItems.length - 1"
            :step="1"
            @update:model-value="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: schemaItems[Number($event)] || 'iridis-32' })"
          />
        </div>
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

      <UFormField label="Lightness ranges">
        <p class="mb-2 text-xs text-muted">
          Only pixels whose OKLCH lightness falls in one of these bands are considered — use it to ignore black bars (low L) or blown-out highlights (high L). Multiple ranges are a union: add a second band to keep shadows AND highlights while still excluding the midtones between them.
        </p>
        <div class="space-y-2">
          <div
            v-for="(range, i) in imgLightnessRange"
            :key="i"
            class="flex items-center gap-2"
          >
            <USlider
              :model-value="range"
              :min="0"
              :max="1"
              :step="0.01"
              class="flex-1"
              @update:model-value="updateLightnessRange(i, $event as [number, number])"
            />
            <span class="w-20 shrink-0 font-mono text-xs text-muted">{{ range[0].toFixed(2) }}–{{ range[1].toFixed(2) }}</span>
            <UButton
              v-if="imgLightnessRange.length > 1"
              icon="i-material-symbols-close-rounded"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Remove lightness range ${i + 1}`"
              @click="removeLightnessRange(i)"
            />
          </div>
          <UButton
            icon="i-material-symbols-add-rounded"
            color="neutral"
            variant="soft"
            size="xs"
            @click="addLightnessRange"
          >
            Add range
          </UButton>
        </div>
      </UFormField>
      <UFormField label="Chroma ranges">
        <p class="mb-2 text-xs text-muted">
          Only pixels whose OKLCH chroma (saturation) falls in one of these bands are considered — raise the floor to ignore a near-neutral background so the cluster budget goes toward colors the image actually cares about. Also a union of ranges.
        </p>
        <div class="space-y-2">
          <div
            v-for="(range, i) in imgChromaRange"
            :key="i"
            class="flex items-center gap-2"
          >
            <USlider
              :model-value="range"
              :min="0"
              :max="0.5"
              :step="0.01"
              class="flex-1"
              @update:model-value="updateChromaRange(i, $event as [number, number])"
            />
            <span class="w-20 shrink-0 font-mono text-xs text-muted">{{ range[0].toFixed(2) }}–{{ range[1].toFixed(2) }}</span>
            <UButton
              v-if="imgChromaRange.length > 1"
              icon="i-material-symbols-close-rounded"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Remove chroma range ${i + 1}`"
              @click="removeChromaRange(i)"
            />
          </div>
          <UButton
            icon="i-material-symbols-add-rounded"
            color="neutral"
            variant="soft"
            size="xs"
            @click="addChromaRange"
          >
            Add range
          </UButton>
        </div>
      </UFormField>
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
        <template #default="{ item: hex }">
          <div
            class="h-7 w-7 rounded-md border border-default"
            :style="{ backgroundColor: hex }"
            :title="hex"
            role="img"
            :aria-label="`Extracted hue ${hex}`"
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

<style scoped>
.schema-pill {
  display: flex;
  align-items: center;
  padding: 0.15rem 0;
  background: transparent;
  border: none;
}
</style>
