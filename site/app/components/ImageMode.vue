<script setup lang="ts">
import { ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Image mode. Decodes an uploaded image, runs the iridis image pipeline
 * (intake:imagePixels → gallery:histogram → gallery:extract → gallery:harmonize),
 * and themes the page from the extracted colors. Exposes the engine's full
 * gallery config as live controls; changing any re-runs the extraction.
 */
const {
  extractFromImage, imageSeeds, framing, schemaName, running,
  imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange,
} = useIridis();

const preview = ref<string | null>(null);
const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const algorithmItems = [
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
];

async function onFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  preview.value = URL.createObjectURL(file);
  await extractFromImage(file);
}

async function sample(): Promise<void> {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 120;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 200, 120);
  g.addColorStop(0, '#ff5f6d'); g.addColorStop(0.3, '#ffc371');
  g.addColorStop(0.6, '#3a1c71'); g.addColorStop(0.85, '#12c2e9'); g.addColorStop(1, '#00ff87');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 200, 120);
  preview.value = c.toDataURL();
  await extractFromImage(preview.value);
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-highlighted">Extract from image</span>
        <UBadge
          :color="running ? 'warning' : 'success'"
          variant="soft"
        >
          {{ running ? 'extracting…' : `${imageSeeds.length} colors` }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          icon="i-material-symbols-upload-rounded"
          color="primary"
          variant="soft"
          size="sm"
          @click="($refs.file as HTMLInputElement).click()"
        >
          Upload image
        </UButton>
        <input
          ref="file"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onFile"
        >
        <UButton
          icon="i-material-symbols-auto-awesome-rounded"
          color="neutral"
          variant="soft"
          size="sm"
          @click="sample"
        >
          Try a sample
        </UButton>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <img
          v-if="preview"
          :src="preview"
          alt="source"
          class="max-h-40 w-full rounded-lg border border-default object-cover"
        >
        <div
          v-else
          class="flex h-40 items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted"
        >
          No image yet
        </div>
        <div class="space-y-3">
          <Histogram />
          <div
            v-if="imageSeeds.length"
            class="space-y-1"
          >
            <div class="text-xs font-medium text-muted">
              Extracted seeds
            </div>
            <div class="flex flex-wrap gap-1">
              <div
                v-for="(hex, i) in imageSeeds"
                :key="i"
                class="h-7 w-7 rounded-md border border-default"
                :style="{ backgroundColor: hex }"
                :title="hex"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Extraction controls: every knob the gallery pipeline reads. -->
      <div class="grid gap-x-6 gap-y-4 rounded-lg border border-default p-4 sm:grid-cols-2">
        <UFormField label="Clustering algorithm">
          <USelect
            v-model="imgAlgorithm"
            :items="algorithmItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Role schema">
          <USelect
            v-model="schemaName"
            :items="schemaItems"
            class="w-full"
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
