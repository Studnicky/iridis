<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';

/**
 * The image-extraction pipeline as a live, tunable output: histogram +
 * dominant-color swatches from whatever image PaletteControls last loaded,
 * plus every knob the gallery pipeline reads. Dragging a slider re-runs
 * gallery:histogram → gallery:extract → gallery:harmonize immediately — this
 * card demonstrates the pipeline, it doesn't own the upload action itself
 * (that lives in PaletteControls, above the carousel).
 */
const {
  imageSeeds, running,
  imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange
} = useIridis();
const { send } = useIridisUiMachine();

const algorithmItems = [
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' }
];
</script>

<template>
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="text-center font-semibold text-highlighted">Histogram</span>
        <UBadge
          :color="running ? 'warning' : imageSeeds.length ? 'success' : 'neutral'"
          variant="soft"
          class="justify-self-end"
        >
          {{ running ? 'extracting…' : `${imageSeeds.length} colors` }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-5">
      <p class="text-sm text-muted">
        Every knob the gallery pipeline reads — gallery:histogram → gallery:extract →
        gallery:harmonize. Drag one and the extraction re-runs live.
      </p>

      <div
        v-if="imageSeeds.length === 0 && !running"
        class="flex h-32 items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted"
      >
        Upload an image above to see the extraction pipeline in action.
      </div>
      <template v-else>
        <Histogram />
        <div class="space-y-1">
          <div class="text-xs font-medium text-muted">
            Extracted seeds
          </div>
          <div
            v-auto-animate
            class="flex flex-wrap gap-1"
          >
            <div
              v-for="(hex, i) in imageSeeds"
              :key="i"
              class="h-7 w-7 rounded-md border border-default"
              :style="{ backgroundColor: hex }"
              :title="hex"
            />
          </div>
        </div>
      </template>

      <div class="grid gap-x-6 gap-y-4 rounded-lg border border-default p-4 sm:grid-cols-2">
        <UFormField label="Clustering algorithm">
          <USelect
            :model-value="imgAlgorithm"
            :items="algorithmItems"
            value-key="value"
            class="w-full"
            @update:model-value="send({ algorithm: $event as 'median-cut' | 'delta-e', type: 'SET_IMAGE_ALGORITHM' })"
          />
        </UFormField>
        <UFormField :label="`Colors (k) · ${imgK}`">
          <USlider
            v-model="imgK"
            :min="2"
            :max="16"
            :step="1"
          />
        </UFormField>
        <UFormField :label="`Histogram bits · ${imgHistogramBits}`">
          <USlider
            v-model="imgHistogramBits"
            :min="3"
            :max="7"
            :step="1"
          />
        </UFormField>
        <UFormField :label="`ΔE cap · ${imgDeltaECap}${imgAlgorithm !== 'delta-e' ? ' (delta-e only)' : ''}`">
          <USlider
            v-model="imgDeltaECap"
            :min="16"
            :max="256"
            :step="8"
            :disabled="imgAlgorithm !== 'delta-e'"
          />
        </UFormField>
        <UFormField :label="`Harmonize threshold · ${imgHarmonize}`">
          <USlider
            v-model="imgHarmonize"
            :min="0"
            :max="30"
            :step="1"
          />
        </UFormField>
        <UFormField :label="`Lightness range · ${imgLightnessRange[0].toFixed(2)}–${imgLightnessRange[1].toFixed(2)}`">
          <USlider
            v-model="imgLightnessRange"
            :min="0"
            :max="1"
            :step="0.01"
          />
        </UFormField>
        <UFormField :label="`Chroma range · ${imgChromaRange[0].toFixed(2)}–${imgChromaRange[1].toFixed(2)}`">
          <USlider
            v-model="imgChromaRange"
            :min="0"
            :max="0.5"
            :step="0.01"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
