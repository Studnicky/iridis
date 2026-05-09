<script setup lang="ts">
/**
 * IridisPicker.vue — multi-format OKLCH-canonical picker.
 *
 * Visual controls:
 *   - L × C square (drag) at the active hue
 *   - Hue strip (drag)
 *
 * Numeric input (tabbed): HEX | RGB | HSV | CMYK | OKLCH.
 * All representations are views over a single OKLCH-canonical state. Edits
 * in any tab convert back to OKLCH and emit a fresh hex via v-model.
 */

import { computed, ref, watch } from 'vue';

import { colorRecordFactory } from '@studnicky/iridis';

const props = defineProps<{ 'modelValue': string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

// === Canonical OKLCH state ===
const l = ref(0.5);
const c = ref(0.15);
const h = ref(0);

watch(
  () => props.modelValue,
  (hex) => {
    try {
      const rec = colorRecordFactory.fromHex(hex);
      l.value = rec.oklch.l;
      c.value = rec.oklch.c;
      h.value = rec.oklch.h;
    } catch { /* keep prior */ }
  },
  { 'immediate': true },
);

const currentHex = computed(() => colorRecordFactory.fromOklch(l.value, c.value, h.value, 1).hex);
watch(currentHex, (hex) => { if (hex !== props.modelValue) emit('update:modelValue', hex); });

// === Hue strip ===
const HUE_STRIP_WIDTH  = 240;
const HUE_STRIP_HEIGHT = 16;
function hueStripBackground(): string {
  const stops: string[] = [];
  for (let i = 0; i <= 12; i++) {
    const hue = (i * 30) % 360;
    const rec = colorRecordFactory.fromOklch(0.70, 0.20, hue, 1);
    stops.push(`${rec.hex} ${(i / 12 * 100).toFixed(2)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
function onHuePointer(e: PointerEvent): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  updateHue(e, e.currentTarget as HTMLElement);
}
function onHueMove(e: PointerEvent): void {
  if (e.buttons !== 1) return;
  updateHue(e, e.currentTarget as HTMLElement);
}
function updateHue(e: PointerEvent, target: HTMLElement): void {
  const r = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
  h.value = (x / r.width) * 360;
}
const huePos = computed(() => `${(h.value / 360) * HUE_STRIP_WIDTH}px`);

// === L × C square ===
const LC_SIZE = 240;
const C_MAX  = 0.32;
const lcSquareBackground = computed(() => {
  const lowL  = colorRecordFactory.fromOklch(0.05, C_MAX, h.value, 1).hex;
  const highL = colorRecordFactory.fromOklch(0.95, C_MAX, h.value, 1).hex;
  const midGr = colorRecordFactory.fromOklch(0.50, 0,    0,        1).hex;
  const fullC = colorRecordFactory.fromOklch(0.50, C_MAX, h.value, 1).hex;
  return `
    linear-gradient(0deg, ${lowL} 0%, transparent 50%, ${highL} 100%),
    linear-gradient(90deg, ${midGr} 0%, ${fullC} 100%)
  `;
});
function onLcPointer(e: PointerEvent): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  updateLc(e, e.currentTarget as HTMLElement);
}
function onLcMove(e: PointerEvent): void {
  if (e.buttons !== 1) return;
  updateLc(e, e.currentTarget as HTMLElement);
}
function updateLc(e: PointerEvent, target: HTMLElement): void {
  const r = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(r.width,  e.clientX - r.left));
  const y = Math.max(0, Math.min(r.height, e.clientY - r.top));
  c.value = (x / r.width)  * C_MAX;
  l.value = 1 - (y / r.height);
}
const markerX = computed(() => `${(c.value / C_MAX) * LC_SIZE}px`);
const markerY = computed(() => `${(1 - l.value) * LC_SIZE}px`);

// === Format-tab views ===
type Mode = 'hex' | 'rgb' | 'hsv' | 'cmyk' | 'oklch';
const mode = ref<Mode>('hex');

// RGB view — derived from currentHex
const rgb = computed(() => {
  const rec = colorRecordFactory.fromHex(currentHex.value);
  return {
    'r': Math.round(rec.rgb.r * 255),
    'g': Math.round(rec.rgb.g * 255),
    'b': Math.round(rec.rgb.b * 255),
  };
});

function rgbToHex(r: number, g: number, b: number): string {
  const t = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}
function setRgb(channel: 'r' | 'g' | 'b', value: number): void {
  const cur = rgb.value;
  const next = { ...cur, [channel]: Math.max(0, Math.min(255, Math.round(value))) };
  emit('update:modelValue', rgbToHex(next.r, next.g, next.b));
}

// HSV view — convert RGB to HSV
function rgbToHsv(r: number, g: number, b: number): { 'h': number; 's': number; 'v': number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if      (max === rn) hue = ((gn - bn) / d) % 6;
    else if (max === gn) hue = (bn - rn) / d + 2;
    else                 hue = (rn - gn) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { 'h': hue, 's': s * 100, 'v': max * 100 };
}
function hsvToRgb(hsv: { 'h': number; 's': number; 'v': number }): { 'r': number; 'g': number; 'b': number } {
  const hh = hsv.h / 60;
  const sv = hsv.s / 100;
  const vv = hsv.v / 100;
  const i = Math.floor(hh) % 6;
  const f = hh - Math.floor(hh);
  const p = vv * (1 - sv);
  const q = vv * (1 - f * sv);
  const t = vv * (1 - (1 - f) * sv);
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0: r = vv; g = t;  b = p;  break;
    case 1: r = q;  g = vv; b = p;  break;
    case 2: r = p;  g = vv; b = t;  break;
    case 3: r = p;  g = q;  b = vv; break;
    case 4: r = t;  g = p;  b = vv; break;
    case 5: r = vv; g = p;  b = q;  break;
  }
  return { 'r': Math.round(r * 255), 'g': Math.round(g * 255), 'b': Math.round(b * 255) };
}
const hsv = computed(() => rgbToHsv(rgb.value.r, rgb.value.g, rgb.value.b));
function setHsv(field: 'h' | 's' | 'v', value: number): void {
  const next = { ...hsv.value, [field]: value };
  const r = hsvToRgb(next);
  emit('update:modelValue', rgbToHex(r.r, r.g, r.b));
}

// CMYK view — derived from RGB
function rgbToCmyk(r: number, g: number, b: number): { 'c': number; 'm': number; 'y': number; 'k': number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { 'c': 0, 'm': 0, 'y': 0, 'k': 100 };
  const cy = (1 - rn - k) / (1 - k);
  const mg = (1 - gn - k) / (1 - k);
  const ye = (1 - bn - k) / (1 - k);
  return { 'c': cy * 100, 'm': mg * 100, 'y': ye * 100, 'k': k * 100 };
}
function cmykToRgb(c: number, m: number, y: number, k: number): { 'r': number; 'g': number; 'b': number } {
  const kn = k / 100;
  return {
    'r': Math.round(255 * (1 - c / 100) * (1 - kn)),
    'g': Math.round(255 * (1 - m / 100) * (1 - kn)),
    'b': Math.round(255 * (1 - y / 100) * (1 - kn)),
  };
}
const cmyk = computed(() => rgbToCmyk(rgb.value.r, rgb.value.g, rgb.value.b));
function setCmyk(field: 'c' | 'm' | 'y' | 'k', value: number): void {
  const next = { ...cmyk.value, [field]: Math.max(0, Math.min(100, value)) };
  const r = cmykToRgb(next.c, next.m, next.y, next.k);
  emit('update:modelValue', rgbToHex(r.r, r.g, r.b));
}

// HEX
function onHexInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) emit('update:modelValue', v);
}

// OKLCH direct
function setOklch(field: 'l' | 'c' | 'h', value: number): void {
  if (field === 'l') l.value = Math.max(0, Math.min(1,    value));
  if (field === 'c') c.value = Math.max(0, Math.min(0.5,  value));
  if (field === 'h') h.value = ((value % 360) + 360) % 360;
}
</script>

<template>
  <div class="iridis-picker">
    <div
      class="iridis-picker__square"
      :style="{ background: lcSquareBackground, width: `${LC_SIZE}px`, height: `${LC_SIZE}px` }"
      @pointerdown="onLcPointer"
      @pointermove="onLcMove"
    >
      <div class="iridis-picker__marker" :style="{ left: markerX, top: markerY, background: currentHex }" />
    </div>

    <div
      class="iridis-picker__hue"
      :style="{ background: hueStripBackground(), width: `${HUE_STRIP_WIDTH}px`, height: `${HUE_STRIP_HEIGHT}px` }"
      @pointerdown="onHuePointer"
      @pointermove="onHueMove"
    >
      <div class="iridis-picker__hue-marker" :style="{ left: huePos }" />
    </div>

    <!-- Format tabs -->
    <div class="iridis-picker__tabs" role="tablist">
      <button v-for="m in (['hex','rgb','hsv','cmyk','oklch'] as Mode[])" :key="m" type="button" role="tab"
        :class="['iridis-picker__tab', { 'iridis-picker__tab--active': mode === m }]"
        :aria-selected="mode === m"
        @click="mode = m">{{ m.toUpperCase() }}</button>
    </div>

    <!-- HEX -->
    <div v-if="mode === 'hex'" class="iridis-picker__row">
      <input type="color" :value="currentHex" aria-label="System picker" @change="(e) => emit('update:modelValue', (e.target as HTMLInputElement).value)" />
      <input class="iridis-picker__hex" type="text" :value="currentHex" spellcheck="false" aria-label="Hex" @input="onHexInput" />
    </div>

    <!-- RGB -->
    <div v-else-if="mode === 'rgb'" class="iridis-picker__channels">
      <label v-for="(ch, key) in { 'R': 'r', 'G': 'g', 'B': 'b' } as const" :key="key">
        <span>{{ ch }}</span>
        <input type="number" min="0" max="255" :value="rgb[key]" @input="(e) => setRgb(key, Number((e.target as HTMLInputElement).value))" />
      </label>
    </div>

    <!-- HSV -->
    <div v-else-if="mode === 'hsv'" class="iridis-picker__channels">
      <label><span>H</span><input type="number" min="0" max="359" :value="Math.round(hsv.h)"   @input="(e) => setHsv('h', Number((e.target as HTMLInputElement).value))" /></label>
      <label><span>S</span><input type="number" min="0" max="100" :value="Math.round(hsv.s)"   @input="(e) => setHsv('s', Number((e.target as HTMLInputElement).value))" /></label>
      <label><span>V</span><input type="number" min="0" max="100" :value="Math.round(hsv.v)"   @input="(e) => setHsv('v', Number((e.target as HTMLInputElement).value))" /></label>
    </div>

    <!-- CMYK -->
    <div v-else-if="mode === 'cmyk'" class="iridis-picker__channels iridis-picker__channels--four">
      <label v-for="(ch, key) in { 'C': 'c', 'M': 'm', 'Y': 'y', 'K': 'k' } as const" :key="key">
        <span>{{ ch }}</span>
        <input type="number" min="0" max="100" :value="Math.round(cmyk[key])" @input="(e) => setCmyk(key, Number((e.target as HTMLInputElement).value))" />
      </label>
    </div>

    <!-- OKLCH -->
    <div v-else-if="mode === 'oklch'" class="iridis-picker__channels">
      <label><span>L</span><input type="number" min="0" max="1"   step="0.01" :value="l.toFixed(3)" @input="(e) => setOklch('l', Number((e.target as HTMLInputElement).value))" /></label>
      <label><span>C</span><input type="number" min="0" max="0.5" step="0.01" :value="c.toFixed(3)" @input="(e) => setOklch('c', Number((e.target as HTMLInputElement).value))" /></label>
      <label><span>H</span><input type="number" min="0" max="359" :value="Math.round(h)"           @input="(e) => setOklch('h', Number((e.target as HTMLInputElement).value))" /></label>
    </div>
  </div>
</template>

<style scoped>
.iridis-picker {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem;
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
  margin-top: -7px;
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
.iridis-picker__tabs {
  display: flex;
  gap: 0.15rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.iridis-picker__tab {
  flex: 1;
  padding: 0.3rem 0.4rem;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  cursor: pointer;
}
.iridis-picker__tab:hover { color: var(--vp-c-text-1); }
.iridis-picker__tab--active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
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
  flex: 1;
  padding: 0.3rem 0.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
}
.iridis-picker__channels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.iridis-picker__channels--four { grid-template-columns: repeat(4, 1fr); }
.iridis-picker__channels label {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-weight: 600;
}
.iridis-picker__channels label > span { letter-spacing: 0.08em; }
.iridis-picker__channels input {
  padding: 0.3rem 0.4rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  width: 100%;
}
</style>
