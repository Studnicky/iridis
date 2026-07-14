<script setup lang="ts">
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';
import type { GalleryAlgorithmType } from '~/composables/types/galleryAlgorithm.ts';
import { ALGORITHM_ITEMS } from '~/composables/GalleryAlgorithms.ts';
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

const kTierItems = [4, 8, 12, 16, 32];
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
          {{ image.dominantColorRecords.length }} dominant color{{ image.dominantColorRecords.length === 1 ? '' : 's' }}
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
          :items="ALGORITHM_ITEMS"
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

      <RangeListEditor
        :model-value="image.lightnessRange"
        :min="0"
        :max="1"
        :step="0.01"
        :default-range="[0, 1]"
        label="Lightness ranges"
        help="Union of ranges — add a second band to keep shadows AND highlights while still excluding the midtones between them."
        class="sm:col-span-2"
        @update:model-value="emit('update', { 'lightnessRange': $event })"
      />

      <RangeListEditor
        :model-value="image.chromaRange"
        :min="0"
        :max="0.5"
        :step="0.01"
        :default-range="[0, 0.5]"
        label="Chroma ranges"
        help="Restricts which chroma band the image's own budget goes toward colors the image actually cares about. Also a union of ranges."
        class="sm:col-span-2"
        @update:model-value="emit('update', { 'chromaRange': $event })"
      />
    </div>

    <div
      v-if="image.dominantColorRecords.length > 0"
      class="space-y-1 mt-4"
    >
      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Extracted hues
      </div>
      <BalancedWrap
        :items="image.dominantColorRecords"
        :min-width="28"
        :gap="4"
      >
        <template #default="{ item: record }">
          <div
            class="h-7 w-7 rounded-md border border-default"
            :style="{ backgroundColor: record.hex }"
            :title="record.hex"
            role="img"
            :aria-label="`${image.name} dominant hue ${record.hex}`"
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
