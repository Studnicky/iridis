<script setup lang="ts">
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';
import type { GalleryAlgorithmType } from '~/composables/types/galleryAlgorithm.ts';
import Histogram from './Histogram.vue';
import PaletteCandidatePicker from './PaletteCandidatePicker.vue';

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
  'update': [patch: Partial<Pick<UploadedImageInterfaceType, 'algorithm' | 'chromaRange' | 'deltaECap' | 'harmonizeThreshold' | 'histogramBits' | 'k' | 'lightnessRange'>>];
}>();

const algorithmItems = [
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'Wu quantize', 'value': 'wu-quantize' },
  { 'label': 'K-means', 'value': 'k-means' }
];
const kTierItems = [4, 8, 12, 16, 32];

function updateLightnessRange(index: number, range: [number, number]): void {
  const next = [...props.image.lightnessRange];
  next[index] = range;
  emit('update', { 'lightnessRange': next });
}
function addLightnessRange(): void {
  emit('update', { 'lightnessRange': [...props.image.lightnessRange, [0, 1]] });
}
function removeLightnessRange(index: number): void {
  const next = props.image.lightnessRange.filter((_, i) => i !== index);
  emit('update', { 'lightnessRange': next.length > 0 ? next : [[0, 1]] });
}
function updateChromaRange(index: number, range: [number, number]): void {
  const next = [...props.image.chromaRange];
  next[index] = range;
  emit('update', { 'chromaRange': next });
}
function addChromaRange(): void {
  emit('update', { 'chromaRange': [...props.image.chromaRange, [0, 0.5]] });
}
function removeChromaRange(index: number): void {
  const next = props.image.chromaRange.filter((_, i) => i !== index);
  emit('update', { 'chromaRange': next.length > 0 ? next : [[0, 0.5]] });
}
</script>

<template>
  <div class="relative space-y-3">
    <div
      v-if="showHeader"
      class="flex items-center gap-3"
    >
      <img
        :src="image.src"
        :alt="image.name"
        class="h-14 w-14 shrink-0 rounded-md object-cover border border-default"
      >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-highlighted">
          {{ image.name }}
        </p>
        <p class="text-xs text-muted">
          {{ image.dominantColors.length }} dominant color{{ image.dominantColors.length === 1 ? '' : 's' }}
        </p>
      </div>
      <UButton
        icon="i-material-symbols-close-rounded"
        color="error"
        variant="ghost"
        size="xs"
        :aria-label="`Remove ${image.name}`"
        @click="emit('remove')"
      />
    </div>
    <UButton
      v-else
      icon="i-material-symbols-close-rounded"
      color="error"
      variant="ghost"
      size="xs"
      class="absolute top-2 right-2 z-10"
      :aria-label="`Remove ${image.name}`"
      @click="emit('remove')"
    />

    <Histogram :bins="image.histogram" />

    <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      <UFormField label="Clustering algorithm">
        <USelect
          :model-value="image.algorithm"
          :items="algorithmItems"
          value-key="value"
          class="w-full"
          @update:model-value="emit('update', { algorithm: $event as GalleryAlgorithmType })"
        />
      </UFormField>
      <UFormField
        v-if="image.algorithm === 'delta-e'"
        :label="`ΔE cap · ${image.deltaECap}`"
      >
        <USlider
          :model-value="image.deltaECap"
          :min="16"
          :max="256"
          :step="8"
          @update:model-value="emit('update', { deltaECap: $event as number })"
        />
      </UFormField>
      <UFormField
        :label="`Colors · ${image.k}`"
        class="sm:col-span-2"
      >
        <div class="w-full space-y-2">
          <BalancedWrap
            :items="kTierItems"
            :min-width="48"
            :gap="8"
          >
            <template #default="{ item: n }">
              <button
                type="button"
                class="k-tier-pill flex-1 justify-center text-[11px] font-medium"
                :class="image.k === n ? 'text-primary font-bold' : 'text-dimmed cursor-pointer hover:text-muted'"
                :aria-pressed="image.k === n"
                @click="emit('update', { k: n })"
              >
                {{ n }}
              </button>
            </template>
          </BalancedWrap>
          <USlider
            :model-value="image.k"
            :min="2"
            :max="32"
            :step="1"
            @update:model-value="emit('update', { k: $event as number })"
          />
        </div>
      </UFormField>
      <UFormField :label="`Histogram bits · ${image.histogramBits}`">
        <USlider
          :model-value="image.histogramBits"
          :min="3"
          :max="7"
          :step="1"
          @update:model-value="emit('update', { histogramBits: $event as number })"
        />
      </UFormField>
      <UFormField :label="`Harmonize threshold · ${image.harmonizeThreshold}`">
        <USlider
          :model-value="image.harmonizeThreshold"
          :min="0"
          :max="30"
          :step="1"
          @update:model-value="emit('update', { harmonizeThreshold: $event as number })"
        />
      </UFormField>

      <UFormField
        label="Lightness ranges"
        class="sm:col-span-2"
      >
        <div class="space-y-2">
          <div
            v-for="(range, i) in image.lightnessRange"
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
              v-if="image.lightnessRange.length > 1"
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

      <UFormField
        label="Chroma ranges"
        class="sm:col-span-2"
      >
        <div class="space-y-2">
          <div
            v-for="(range, i) in image.chromaRange"
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
              v-if="image.chromaRange.length > 1"
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

    <div
      v-if="image.dominantColors.length > 0"
      class="space-y-1 mt-4"
    >
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Extracted hues
      </div>
      <BalancedWrap
        :items="image.dominantColors"
        :min-width="28"
        :gap="4"
      >
        <template #default="{ item: hex }">
          <div
            class="h-7 w-7 rounded-md border border-default"
            :style="{ backgroundColor: hex }"
            :title="hex"
            role="img"
            :aria-label="`${image.name} dominant hue ${hex}`"
          />
        </template>
      </BalancedWrap>
    </div>

    <PaletteCandidatePicker
      v-if="image.candidates.length > 0"
      :candidates="image.candidates"
      :selected-label="image.selectedCandidateLabel"
      class="mt-4"
      @select="emit('select-candidate', $event.label)"
    />
  </div>
</template>

<style scoped>
.k-tier-pill {
  display: flex;
  align-items: center;
  padding: 0.15rem 0;
  background: transparent;
  border: none;
}
</style>
