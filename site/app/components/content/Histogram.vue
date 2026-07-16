<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import type { GalleryHistogramSlotInterfaceType } from '@studnicky/iridis-image/types';
import { buildHistogramBars } from './histogram/buildHistogramBars.ts';

/**
 * The image's color histogram (gallery:histogram output). Each bar is a quantised
 * color bin from the engine, ordered by hue, height scaled to its pixel weight —
 * the spectrograph the extraction clusters over.
 *
 * `bins` is optional so per-image cards (UploadedImageCard.vue) can pass THAT
 * image's own Stage-1 histogram instead of the shared combine-stage one —
 * when omitted, falls back to the combine-stage `histogram` ref as before.
 */
const props = defineProps<{ bins?: GalleryHistogramSlotInterfaceType['bins'] }>();
const { histogram } = useIridis();
const source = computed<GalleryHistogramSlotInterfaceType['bins']>(() => props.bins ?? histogram.value);
const bars = computed(() => buildHistogramBars(source.value));
</script>

<template>
  <UCard>
    <template #header>
      <PanelHeading
        :title="`Histogram · ${bars.length} bins`"
        as="span"
      />
    </template>
    <div class="flex h-24 items-end gap-px overflow-hidden rounded-lg border border-default bg-elevated/50 p-1 relative">
      <div
        v-if="bars.length === 0"
        class="absolute inset-0 flex items-center justify-center text-sm text-muted"
      >
        No image data
      </div>
      <div
        v-for="(bar, i) in bars"
        :key="i"
        class="flex-1 rounded-sm"
        :style="{ height: `${bar.h}%`, backgroundColor: bar.hex, minWidth: '2px' }"
        :title="bar.hex"
      />
    </div>
  </UCard>
</template>
