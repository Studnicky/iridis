<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Per-color space readout. Pick any resolved role and see it across the spaces
 * iridis supports — Hex, RGB, HSV, CMYK, OKLCH. OKLCH comes straight off the
 * engine record; the rest are standard conversions of its hex.
 */
const { roleViews } = useIridis();
const selected = ref<string>('brand');
const names = computed<string[]>(() => roleViews.value.map((r) => r.name));
const role = computed(() => roleViews.value.find((r) => r.name === selected.value) ?? roleViews.value.find((r) => r.name === 'brand') ?? roleViews.value[0]);

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function hsv([r, g, b]: [number, number, number]): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d !== 0) {
    h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round((max === 0 ? 0 : d / max) * 100), Math.round(max * 100)];
}
function cmyk([r, g, b]: [number, number, number]): [number, number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return [0, 0, 0, 100];
  return [Math.round(((1 - rn - k) / (1 - k)) * 100), Math.round(((1 - gn - k) / (1 - k)) * 100), Math.round(((1 - bn - k) / (1 - k)) * 100), Math.round(k * 100)];
}

const rows = computed(() => {
  const r = role.value;
  if (!r) return [];
  const c = rgb(r.hex);
  const [h, s, v] = hsv(c);
  const [cy, m, ye, k] = cmyk(c);
  return [
    { 'space': 'Hex', 'value': r.hex },
    { 'space': 'RGB', 'value': `rgb(${c[0]}, ${c[1]}, ${c[2]})` },
    { 'space': 'HSV', 'value': `${h}°, ${s}%, ${v}%` },
    { 'space': 'CMYK', 'value': `${cy}%, ${m}%, ${ye}%, ${k}%` },
    { 'space': 'OKLCH', 'value': `${r.l.toFixed(3)} ${r.c.toFixed(3)} ${r.h.toFixed(1)}°` },
  ];
});
</script>

<template>
  <UCard>
    <template #header>
      <span class="block text-center font-semibold text-highlighted">Color spaces</span>
    </template>
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div
          class="h-10 w-10 rounded-md border border-default"
          :style="{ backgroundColor: role?.hex }"
        />
        <USelect
          v-model="selected"
          :items="names"
          class="w-48"
        />
      </div>
      <div class="divide-y divide-default">
        <div
          v-for="row in rows"
          :key="row.space"
          class="flex items-center justify-between py-1.5"
        >
          <span class="text-xs font-medium text-muted">{{ row.space }}</span>
          <span class="font-mono text-xs text-highlighted">{{ row.value }}</span>
        </div>
      </div>
    </div>
  </UCard>
</template>
