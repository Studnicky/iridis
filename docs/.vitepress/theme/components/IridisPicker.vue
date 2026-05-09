<script setup lang="ts">
/**
 * IridisPicker.vue
 *
 * OKLCH-aware color picker. Three controls share the same value:
 *   - Lightness × chroma square (drag to pick)
 *   - Hue strip (drag to rotate)
 *   - Hex text input + native color input (paste / type / system picker)
 *
 * Built on iridis's own colorRecordFactory primitive — no external deps.
 * Two-way bound via v-model (`modelValue` / `update:modelValue`).
 */

import { computed, ref, watch } from 'vue';

import { colorRecordFactory } from '@studnicky/iridis';

const props = defineProps<{
  'modelValue': string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// Internal OKLCH state — single source of truth while interacting.
const l = ref(0.5);
const c = ref(0.15);
const h = ref(0);

// Hydrate from incoming hex prop. Two-way: external sets ⇒ we recompute
// L/C/H; internal drag ⇒ we emit a new hex back out.
watch(
  () => props.modelValue,
  (hex) => {
    try {
      const rec = colorRecordFactory.fromHex(hex);
      l.value = rec.oklch.l;
      c.value = rec.oklch.c;
      h.value = rec.oklch.h;
    } catch { /* ignore malformed input — keep prior state */ }
  },
  { 'immediate': true },
);

const currentHex = computed(() => {
  const rec = colorRecordFactory.fromOklch(l.value, c.value, h.value, 1);
  return rec.hex;
});

watch(currentHex, (hex) => {
  if (hex !== props.modelValue) emit('update:modelValue', hex);
});

// === Hue strip ===
const HUE_STRIP_WIDTH  = 220;
const HUE_STRIP_HEIGHT = 18;

function hueStripBackground(): string {
  // 12-stop rainbow at constant L=0.7, C=0.20.
  const stops: string[] = [];
  for (let i = 0; i <= 12; i++) {
    const hue = (i * 30) % 360;
    const rec = colorRecordFactory.fromOklch(0.70, 0.20, hue, 1);
    stops.push(`${rec.hex} ${(i / 12 * 100).toFixed(2)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function onHueStripPointer(e: PointerEvent): void {
  const target = e.currentTarget as HTMLDivElement;
  target.setPointerCapture(e.pointerId);
  updateHueFromEvent(e, target);
}
function onHueStripMove(e: PointerEvent): void {
  if (e.buttons !== 1) return;
  updateHueFromEvent(e, e.currentTarget as HTMLDivElement);
}
function updateHueFromEvent(e: PointerEvent, target: HTMLDivElement): void {
  const rect = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
  h.value = (x / rect.width) * 360;
}
const huePosX = computed(() => `${(h.value / 360) * HUE_STRIP_WIDTH}px`);

// === L × C square ===
const LC_SQUARE_SIZE = 220;
const C_MAX = 0.32;

const lcSquareBackground = computed(() => {
  // The square renders the L×C plane at the current hue.
  // We approximate it with two stacked gradients: horizontal C ramp at L=0.5,
  // vertical L ramp from black to white. The intersection appears as a
  // perceptual L×C grid for the active hue. Fast and good-enough for a picker.
  const lowL  = colorRecordFactory.fromOklch(0.05, C_MAX, h.value, 1).hex;
  const highL = colorRecordFactory.fromOklch(0.95, C_MAX, h.value, 1).hex;
  const midGrey = colorRecordFactory.fromOklch(0.50, 0,    0,       1).hex;
  return `
    linear-gradient(0deg, ${lowL} 0%, transparent 50%, ${highL} 100%),
    linear-gradient(90deg, ${midGrey} 0%, ${colorRecordFactory.fromOklch(0.50, C_MAX, h.value, 1).hex} 100%)
  `;
});

function onLcSquarePointer(e: PointerEvent): void {
  const target = e.currentTarget as HTMLDivElement;
  target.setPointerCapture(e.pointerId);
  updateLcFromEvent(e, target);
}
function onLcSquareMove(e: PointerEvent): void {
  if (e.buttons !== 1) return;
  updateLcFromEvent(e, e.currentTarget as HTMLDivElement);
}
function updateLcFromEvent(e: PointerEvent, target: HTMLDivElement): void {
  const rect = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width,  e.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
  c.value = (x / rect.width) * C_MAX;
  l.value = 1 - (y / rect.height);
}
const lcMarkerX = computed(() => `${(c.value / C_MAX) * LC_SQUARE_SIZE}px`);
const lcMarkerY = computed(() => `${(1 - l.value) * LC_SQUARE_SIZE}px`);

// === Hex / native picker ===
function onHexInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    emit('update:modelValue', value);
  }
}
function onNativeChange(e: Event): void {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
}
</script>

<template>
  <div class="iridis-picker">
    <div
      class="iridis-picker__square"
      :style="{ background: lcSquareBackground, width: `${LC_SQUARE_SIZE}px`, height: `${LC_SQUARE_SIZE}px` }"
      @pointerdown="onLcSquarePointer"
      @pointermove="onLcSquareMove"
    >
      <div class="iridis-picker__marker" :style="{ left: lcMarkerX, top: lcMarkerY, background: currentHex }" />
    </div>

    <div
      class="iridis-picker__hue"
      :style="{ background: hueStripBackground(), width: `${HUE_STRIP_WIDTH}px`, height: `${HUE_STRIP_HEIGHT}px` }"
      @pointerdown="onHueStripPointer"
      @pointermove="onHueStripMove"
    >
      <div class="iridis-picker__hue-marker" :style="{ left: huePosX }" />
    </div>

    <div class="iridis-picker__row">
      <input
        type="color"
        :value="currentHex"
        aria-label="System color picker"
        @change="onNativeChange"
      />
      <input
        type="text"
        class="iridis-picker__hex"
        :value="currentHex"
        spellcheck="false"
        aria-label="Hex value"
        @input="onHexInput"
      />
      <span class="iridis-picker__oklch">
        L {{ l.toFixed(2) }} · C {{ c.toFixed(2) }} · H {{ Math.round(h) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.iridis-picker {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.65rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  width: max-content;
  max-width: 100%;
}
.iridis-picker__square {
  position: relative;
  border-radius: 4px;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}
.iridis-picker__marker {
  position: absolute;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  margin-top:  -7px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
.iridis-picker__hue {
  position: relative;
  border-radius: 4px;
  cursor: ew-resize;
  touch-action: none;
  user-select: none;
}
.iridis-picker__hue-marker {
  position: absolute;
  top: -2px;
  width: 6px;
  height: calc(100% + 4px);
  margin-left: -3px;
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6);
  pointer-events: none;
}
.iridis-picker__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.iridis-picker__row input[type="color"] {
  width: 1.7rem;
  height: 1.7rem;
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.iridis-picker__hex {
  width: 5.5rem;
  padding: 0.25rem 0.4rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 3px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  color: var(--vp-c-text-1);
}
.iridis-picker__oklch {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}
</style>
