<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import type { HistogramBinType } from '~/composables/types/index.ts';

/**
 * The image's color histogram (gallery:histogram output). Each bar is a quantised
 * color bin from the engine, ordered by hue, height scaled to its pixel weight —
 * the spectrograph the extraction clusters over.
 *
 * `bins` is optional so per-image cards (UploadedImageCard.vue) can pass THAT
 * image's own Stage-1 histogram instead of the shared combine-stage one —
 * when omitted, falls back to the combine-stage `histogram` ref as before.
 */
const props = defineProps<{ bins?: HistogramBinType[] }>();
const { histogram } = useIridis();
const source = computed<HistogramBinType[]>(() => props.bins ?? histogram.value);

function hue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}

const bars = computed(() => {
  const bins = [...source.value].sort((a, b) => hue(a.hex) - hue(b.hex));
  const max = Math.max(1, ...bins.map((b) => b.weight));
  return bins.map((b) => ({ 'hex': b.hex, 'h': Math.max(6, Math.round((b.weight / max) * 100)) }));
});
</script>

<template>
  <UCard>
    <template #header>
      <span class="text-xs font-medium uppercase tracking-wide text-dimmed">
        Histogram · {{ bars.length }} bins
      </span>
    </template>
    <div class="flex h-24 items-end gap-px overflow-hidden rounded-lg border border-default bg-elevated/50 p-1 relative">
      <div v-if="bars.length === 0" class="absolute inset-0 flex items-center justify-center text-sm text-muted">
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
