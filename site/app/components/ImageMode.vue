<script setup lang="ts">
import { ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Image mode. Decodes an uploaded image to pixels, runs the iridis image pipeline
 * (intake:imagePixels → gallery:histogram → gallery:extract), shows the histogram
 * and the extracted dominant colors, and themes the page from them. Only active
 * when mode === 'image'.
 */
const { extractFromImage, imageSeeds, framing, schemaName, running } = useIridis();
const preview = ref<string | null>(null);
const k = ref<number>(6);
const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];

async function onFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  preview.value = URL.createObjectURL(file);
  await extractFromImage(file, k.value);
}

async function sample(): Promise<void> {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 120;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 200, 120);
  g.addColorStop(0, '#ff5f6d'); g.addColorStop(0.3, '#ffc371');
  g.addColorStop(0.6, '#3a1c71'); g.addColorStop(0.85, '#12c2e9'); g.addColorStop(1, '#00ff87');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 200, 120);
  const url = c.toDataURL();
  preview.value = url;
  await extractFromImage(url, k.value);
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-highlighted">Extract from image</span>
        <UBadge :color="running ? 'warning' : 'success'" variant="soft">
          {{ running ? 'extracting…' : `${imageSeeds.length} colors` }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-sm text-muted">
        iridis clusters an image's pixels into {{ k }} dominant colors and themes the page from them.
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <UButton icon="i-lucide-upload" color="primary" variant="soft" size="sm" @click="($refs.file as HTMLInputElement).click()">
          Upload image
        </UButton>
        <input ref="file" type="file" accept="image/*" class="hidden" @change="onFile" >
        <UButton icon="i-lucide-sparkles" color="neutral" variant="soft" size="sm" @click="sample">Try a sample</UButton>
        <UFormField label="Colors (k)">
          <USelect v-model="k" :items="[4, 6, 8, 12]" size="sm" />
        </UFormField>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <img v-if="preview" :src="preview" alt="source" class="max-h-40 w-full rounded-lg border border-default object-cover" >
        <div v-else class="flex h-40 items-center justify-center rounded-lg border border-dashed border-default text-sm text-muted">
          No image yet
        </div>
        <div class="space-y-3">
          <Histogram />
          <div v-if="imageSeeds.length" class="space-y-1">
            <div class="text-xs font-medium text-muted">Extracted seeds</div>
            <div class="flex flex-wrap gap-1">
              <div v-for="(hex, i) in imageSeeds" :key="i" class="h-7 w-7 rounded-md border border-default" :style="{ backgroundColor: hex }" :title="hex" />
            </div>
          </div>
        </div>
      </div>

      <UFormField label="Role schema">
        <USelect v-model="schemaName" :items="schemaItems" class="w-full sm:w-56" />
      </UFormField>
    </div>
  </UCard>
</template>
