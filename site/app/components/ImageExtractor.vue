<script setup lang="ts">
import { ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Image → palette extraction. Decodes an uploaded image to pixels, runs the
 * iridis image pipeline (intake:imagePixels → gallery:histogram →
 * gallery:extract), and adopts the extracted dominant colors as the seeds that
 * drive the whole page.
 */
const { extractFromImage, running } = useIridis();
const preview = ref<string | null>(null);
const k = ref<number>(6);

async function onFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  preview.value = URL.createObjectURL(file);
  await extractFromImage(file, k.value);
}

/** Local synthetic sample (no CORS): a multi-stop gradient on a canvas. */
async function sample(): Promise<void> {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 100;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 160, 100);
  g.addColorStop(0, '#ff5f6d'); g.addColorStop(0.35, '#ffc371');
  g.addColorStop(0.7, '#3a1c71'); g.addColorStop(1, '#00c9ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 160, 100);
  const url = c.toDataURL();
  preview.value = url;
  await extractFromImage(url, k.value);
}
</script>

<template>
  <UCard>
    <template #header><span class="font-semibold text-highlighted">Extract from image</span></template>
    <div class="space-y-4">
      <p class="text-sm text-muted">
        Drop in an image — iridis clusters its pixels into {{ k }} dominant colors and uses them as seeds.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <UButton icon="i-lucide-upload" color="primary" variant="soft" size="sm" @click="($refs.file as HTMLInputElement).click()">
          Upload image
        </UButton>
        <input ref="file" type="file" accept="image/*" class="hidden" @change="onFile" >
        <UButton icon="i-lucide-sparkles" color="neutral" variant="soft" size="sm" @click="sample">
          Try a sample
        </UButton>
        <UFormField label="Colors (k)" class="flex items-center gap-2">
          <USelect v-model="k" :items="[4, 6, 8]" size="sm" />
        </UFormField>
        <UBadge v-if="running" color="warning" variant="soft">extracting…</UBadge>
      </div>
      <img v-if="preview" :src="preview" alt="source" class="max-h-40 rounded-lg border border-default" >
    </div>
  </UCard>
</template>
