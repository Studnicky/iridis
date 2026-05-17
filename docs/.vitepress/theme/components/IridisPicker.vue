<script setup lang="ts">
/**
 * IridisPicker.vue — HSV-canonical visual picker, multi-format I/O.
 *
 * Visual controls:
 *   - S × V square (drag) at the active hue. Saturation = horizontal,
 *     Value = vertical. Background composes hue base + white-to-transparent
 *     (saturation) + black-to-transparent (value). Standard picker recipe
 *     used by Photoshop, Figma, giacomohuang/colorpicker, etc.
 *   - Hue strip (drag).
 *
 * Numeric I/O tabs: HEX | RGB | HSV | CMYK | OKLCH. All five compose around
 * the same H/S/V refs. Edits in any tab convert through HSV → RGB → hex
 * and emit a fresh modelValue. The visual square's drag updates the
 * canonical refs directly so every tab's numbers reflect the new value.
 */

import { computed, ref, watch } from 'vue';

import SelectButton from 'primevue/selectbutton';
import InputText    from 'primevue/inputtext';
import InputNumber  from 'primevue/inputnumber';

import FormField from './FormField.vue';

import { colorRecordFactory } from '@studnicky/iridis';

const props = defineProps<{ 'modelValue': string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

// === Canonical HSV state ===
const hue = ref(270);  // 0..360
const sat = ref(80);   // 0..100
const val = ref(60);   // 0..100

// === Conversions ===
function hsvToRgb(h: number, s: number, v: number): { 'r': number; 'g': number; 'b': number } {
  const hh = (((h % 360) + 360) % 360) / 60;
  const sv = s / 100;
  const vv = v / 100;
  const i  = Math.floor(hh) % 6;
  const f  = hh - Math.floor(hh);
  const p  = vv * (1 - sv);
  const q  = vv * (1 - f * sv);
  const t  = vv * (1 - (1 - f) * sv);
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

function rgbToHsv(r: number, g: number, b: number): { 'h': number; 's': number; 'v': number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if      (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else                 h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { 'h': h, 's': s * 100, 'v': max * 100 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const t = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${t(r)}${t(g)}${t(b)}`;
}
function hexToRgb(hex: string): { 'r': number; 'g': number; 'b': number } | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { 'r': (n >> 16) & 0xff, 'g': (n >> 8) & 0xff, 'b': n & 0xff };
}

// === Hex round-trip ===
const currentRgb = computed(() => hsvToRgb(hue.value, sat.value, val.value));
const currentHex = computed(() => rgbToHex(currentRgb.value.r, currentRgb.value.g, currentRgb.value.b));

// External → internal: parse incoming hex into HSV. Skip if it would
// produce essentially the same HSV (avoid feedback loops).
let suppressEmit = false;
watch(
  () => props.modelValue,
  (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    if (
      Math.abs(hsv.h - hue.value) < 0.5 &&
      Math.abs(hsv.s - sat.value) < 0.5 &&
      Math.abs(hsv.v - val.value) < 0.5
    ) return;
    suppressEmit = true;
    // Preserve hue when saturation collapses (hue is undefined at S=0).
    if (hsv.s > 0.5) hue.value = hsv.h;
    sat.value = hsv.s;
    val.value = hsv.v;
    queueMicrotask(() => { suppressEmit = false; });
  },
  { 'immediate': true },
);

// Internal → external: emit fresh hex on any HSV change.
watch(currentHex, (hex) => {
  if (suppressEmit) return;
  if (hex !== props.modelValue) emit('update:modelValue', hex);
});

// === S × V square ===
// Sized by CSS (container-aware, fluid). Markers use percentages so they
// track the rendered box at any pixel size. Pointer handlers compute
// sat/val from getBoundingClientRect, so they're already size-independent.
const svSquareBackground = computed(() => {
  const baseRgb = hsvToRgb(hue.value, 100, 100);
  const baseHex = rgbToHex(baseRgb.r, baseRgb.g, baseRgb.b);
  // Standard picker recipe: hue base + white-to-transparent overlay
  // (saturation grows left→right) + black-to-transparent overlay
  // (value grows bottom→top).
  return `
    linear-gradient(to top, #000, transparent),
    linear-gradient(to right, #fff, transparent),
    ${baseHex}
  `;
});
function onSvPointer(e: PointerEvent): void {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  updateSv(e, e.currentTarget as HTMLElement);
}
function onSvMove(e: PointerEvent): void {
  if (e.buttons !== 1) return;
  updateSv(e, e.currentTarget as HTMLElement);
}
function updateSv(e: PointerEvent, target: HTMLElement): void {
  const r = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(r.width,  e.clientX - r.left));
  const y = Math.max(0, Math.min(r.height, e.clientY - r.top));
  sat.value = (x / r.width)  * 100;
  val.value = (1 - y / r.height) * 100;
}
const svMarkerX = computed(() => `${sat.value}%`);
const svMarkerY = computed(() => `${100 - val.value}%`);

// === Hue strip ===
// Sized by CSS (full width of container, fixed thin height). Marker
// positioned by percentage of hue / 360.
const hueStripBackground = computed((): string => {
  const stops: string[] = [];
  for (let i = 0; i <= 12; i++) {
    const h = (i * 30) % 360;
    const rgb = hsvToRgb(h, 100, 100);
    stops.push(`${rgbToHex(rgb.r, rgb.g, rgb.b)} ${(i / 12 * 100).toFixed(2)}%`);
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
});
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
  hue.value = (x / r.width) * 360;
}
const hueMarkerX = computed(() => `${(hue.value / 360) * 100}%`);

// === Format tabs ===
type Mode = 'hex' | 'rgb' | 'hsv' | 'cmyk' | 'oklch';
const mode = ref<Mode>('hex');

function setHex(v: string): void {
  const rgb = hexToRgb(v);
  if (!rgb) return;
  emit('update:modelValue', rgbToHex(rgb.r, rgb.g, rgb.b));
}

function setRgb(channel: 'r' | 'g' | 'b', value: number): void {
  const cur = currentRgb.value;
  const next = { ...cur, [channel]: Math.max(0, Math.min(255, Math.round(value))) };
  emit('update:modelValue', rgbToHex(next.r, next.g, next.b));
}

function setHsv(field: 'h' | 's' | 'v', value: number): void {
  if (field === 'h') hue.value = ((value % 360) + 360) % 360;
  if (field === 's') sat.value = Math.max(0, Math.min(100, value));
  if (field === 'v') val.value = Math.max(0, Math.min(100, value));
}

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
const cmyk = computed(() => rgbToCmyk(currentRgb.value.r, currentRgb.value.g, currentRgb.value.b));
function setCmyk(field: 'c' | 'm' | 'y' | 'k', value: number): void {
  const next = { ...cmyk.value, [field]: Math.max(0, Math.min(100, value)) };
  const r = cmykToRgb(next.c, next.m, next.y, next.k);
  emit('update:modelValue', rgbToHex(r.r, r.g, r.b));
}

const oklch = computed(() => {
  const rec = colorRecordFactory.fromHex(currentHex.value);
  return { 'l': rec.oklch.l, 'c': rec.oklch.c, 'h': rec.oklch.h };
});
function setOklch(field: 'l' | 'c' | 'h', value: number): void {
  const cur = oklch.value;
  const next = { ...cur, [field]: value };
  if (field === 'l') next.l = Math.max(0, Math.min(1, value));
  if (field === 'c') next.c = Math.max(0, Math.min(0.5, value));
  if (field === 'h') next.h = ((value % 360) + 360) % 360;
  const rec = colorRecordFactory.fromOklch(next.l, next.c, next.h, 1);
  emit('update:modelValue', rec.hex);
}

const hsvView = computed(() => ({ 'h': hue.value, 's': sat.value, 'v': val.value }));

/** Format selector options for PrimeVue SelectButton. */
const modeOptions: readonly { 'label': string; 'value': Mode }[] = [
  { 'label': 'HEX',   'value': 'hex'   },
  { 'label': 'RGB',   'value': 'rgb'   },
  { 'label': 'HSV',   'value': 'hsv'   },
  { 'label': 'CMYK',  'value': 'cmyk'  },
  { 'label': 'OKLCH', 'value': 'oklch' },
];
</script>

<template>
  <div class="iridis-picker">
    <!-- S × V square -->
    <div
      class="iridis-picker__square"
      :style="{ background: svSquareBackground }"
      title="Saturation × Value. Horizontal axis is saturation (left = grey, right = full chroma); vertical is value (top = bright, bottom = black). Drag to pick."
      @pointerdown="onSvPointer"
      @pointermove="onSvMove"
    >
      <div class="iridis-picker__marker" :style="{ left: svMarkerX, top: svMarkerY, background: currentHex }" />
    </div>

    <!-- Hue strip -->
    <div
      class="iridis-picker__hue"
      :style="{ background: hueStripBackground }"
      title="Hue strip — 0° red, 60° yellow, 120° green, 180° cyan, 240° blue, 300° magenta. Drag to pick."
      @pointerdown="onHuePointer"
      @pointermove="onHueMove"
    >
      <div class="iridis-picker__hue-marker" :style="{ left: hueMarkerX }" />
    </div>

    <!-- Format selector — PrimeVue SelectButton paints with iridis tokens. -->
    <SelectButton
      :model-value="mode"
      :options="modeOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      class="iridis-picker__tabs"
      title="Numeric I/O format. All five tabs read/write the same underlying HSV state; pick whichever matches how you author colors."
      @update:model-value="(v) => mode = (v ?? 'hex') as Mode"
    />

    <!-- HEX -->
    <div v-if="mode === 'hex'" class="iridis-picker__row">
      <input
        type="color"
        :value="currentHex"
        aria-label="System picker"
        class="iridis-picker__color-swatch"
        title="Native OS color picker. Opens whatever color-picker dialog your platform provides."
        @change="(e) => setHex((e.target as HTMLInputElement).value)"
      />
      <InputText
        :model-value="currentHex"
        spellcheck="false"
        aria-label="Hex"
        size="small"
        class="iridis-picker__hex"
        title="Hex color literal. Six lowercase hex digits prefixed with #, e.g. #5b21b6. Drives every other input field below."
        @update:model-value="(v) => setHex(v ?? '')"
      />
    </div>

    <!-- RGB -->
    <div v-else-if="mode === 'rgb'" class="iridis-picker__channels">
      <FormField orientation="column" compact leg="R" tooltip="Red channel — sRGB byte value, 0 (no red) to 255 (full red).">
        <InputNumber :model-value="currentRgb.r" :min="0" :max="255" :show-buttons="false" size="small" @update:model-value="(v) => setRgb('r', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="G" tooltip="Green channel — sRGB byte value, 0 (no green) to 255 (full green).">
        <InputNumber :model-value="currentRgb.g" :min="0" :max="255" :show-buttons="false" size="small" @update:model-value="(v) => setRgb('g', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="B" tooltip="Blue channel — sRGB byte value, 0 (no blue) to 255 (full blue).">
        <InputNumber :model-value="currentRgb.b" :min="0" :max="255" :show-buttons="false" size="small" @update:model-value="(v) => setRgb('b', Number(v ?? 0))" />
      </FormField>
    </div>

    <!-- HSV -->
    <div v-else-if="mode === 'hsv'" class="iridis-picker__channels">
      <FormField orientation="column" compact leg="H" tooltip="Hue in degrees, 0–359. Same axis as the hue strip above.">
        <InputNumber :model-value="Math.round(hsvView.h)" :min="0" :max="359" :show-buttons="false" size="small" @update:model-value="(v) => setHsv('h', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="S" tooltip="Saturation as a percentage, 0–100. 0 collapses to a grey at the current value.">
        <InputNumber :model-value="Math.round(hsvView.s)" :min="0" :max="100" :show-buttons="false" size="small" @update:model-value="(v) => setHsv('s', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="V" tooltip="Value as a percentage, 0–100. 0 forces black regardless of hue or saturation.">
        <InputNumber :model-value="Math.round(hsvView.v)" :min="0" :max="100" :show-buttons="false" size="small" @update:model-value="(v) => setHsv('v', Number(v ?? 0))" />
      </FormField>
    </div>

    <!-- CMYK -->
    <div v-else-if="mode === 'cmyk'" class="iridis-picker__channels iridis-picker__channels--four">
      <FormField orientation="column" compact leg="C" tooltip="Cyan ink percentage, 0–100 (subtractive model — useful for print-target conversion only; screens display sRGB).">
        <InputNumber :model-value="Math.round(cmyk.c)" :min="0" :max="100" :show-buttons="false" size="small" @update:model-value="(v) => setCmyk('c', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="M" tooltip="Magenta ink percentage, 0–100.">
        <InputNumber :model-value="Math.round(cmyk.m)" :min="0" :max="100" :show-buttons="false" size="small" @update:model-value="(v) => setCmyk('m', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="Y" tooltip="Yellow ink percentage, 0–100.">
        <InputNumber :model-value="Math.round(cmyk.y)" :min="0" :max="100" :show-buttons="false" size="small" @update:model-value="(v) => setCmyk('y', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="K" tooltip="Black (Key) ink percentage, 0–100.">
        <InputNumber :model-value="Math.round(cmyk.k)" :min="0" :max="100" :show-buttons="false" size="small" @update:model-value="(v) => setCmyk('k', Number(v ?? 0))" />
      </FormField>
    </div>

    <!-- OKLCH -->
    <div v-else-if="mode === 'oklch'" class="iridis-picker__channels">
      <FormField orientation="column" compact leg="L" tooltip="OKLCH lightness, 0 (black) to 1 (white). Perceptually uniform: 0.5 looks half-bright regardless of hue, unlike HSV's V.">
        <InputNumber :model-value="oklch.l" :min="0" :max="1"   :step="0.01" :max-fraction-digits="3" :show-buttons="false" size="small" @update:model-value="(v) => setOklch('l', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="C" tooltip="OKLCH chroma, 0 (fully grey) to ~0.4 (maximally saturated for the input hue/lightness).">
        <InputNumber :model-value="oklch.c" :min="0" :max="0.5" :step="0.01" :max-fraction-digits="3" :show-buttons="false" size="small" @update:model-value="(v) => setOklch('c', Number(v ?? 0))" />
      </FormField>
      <FormField orientation="column" compact leg="H" tooltip="OKLCH hue in degrees, 0–359. Same convention as HSV's H but perceptually uniform.">
        <InputNumber :model-value="Math.round(oklch.h)" :min="0" :max="359" :show-buttons="false" size="small" @update:model-value="(v) => setOklch('h', Number(v ?? 0))" />
      </FormField>
    </div>
  </div>
</template>

<style scoped>
.iridis-picker {
  container-type: inline-size;
  container-name: picker;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.7rem;
  background: var(--vp-c-bg);
  border: var(--iridis-border-soft);
  border-radius: var(--iridis-radius-md);
  width: 100%;
  /* Enough width for the five-mode SelectButton labels (HEX, RGB, HSV,
     CMYK, OKLCH) to render unclipped at the 0.7rem font size below. */
  min-width: 260px;
  max-width: 360px;
  box-shadow: var(--iridis-shadow-felt);
}
.iridis-picker__square {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  /* Cap to container width, stay square. The inline width/height set
     SV_SIZE as a target; max-width clamps it to whatever the parent
     panel allows so the picker can never overflow a narrow panel.
     aspect-ratio holds the square shape when width is the limiting factor. */
  max-width: 100%;
  aspect-ratio: 1;
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
  width: 100%;
  height: 1rem;
  border-radius: 4px;
  cursor: ew-resize;
  touch-action: none;
  user-select: none;
  /* Same container clamp as the SV square. */
  max-width: 100%;
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
/* PrimeVue SelectButton styled as the format-mode tab strip. */
.iridis-picker__tabs {
  display: flex;
  border-bottom: 1px solid var(--vp-c-divider);
}
.iridis-picker__tabs :deep(.p-selectbutton) {
  display: flex;
  gap: 0.15rem;
  width: 100%;
}
/* Picker's format-mode tab strip — visual tabs with an underline on
   the active item, NOT filled pills. Colors bind to the engine-
   enforced iridis text token so contrast against the picker bg is
   the same ratio the role schema declares for text/background. */
.iridis-picker__tabs :deep(.p-togglebutton) {
  flex: 1 1 0;
  min-width: 0;
  padding: 0.3rem 0.2rem;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--iridis-muted, var(--iridis-text));
  cursor: pointer;
  box-shadow: none;
  white-space: nowrap;
  text-align: center;
}
.iridis-picker__tabs :deep(.p-togglebutton-content) {
  background: transparent;
  color: inherit;
}
.iridis-picker__tabs :deep(.p-togglebutton-label) {
  overflow: visible;
  text-overflow: clip;
  color: inherit;
}
.iridis-picker__tabs :deep(.p-togglebutton:hover),
.iridis-picker__tabs :deep(.p-togglebutton:hover) .p-togglebutton-content,
.iridis-picker__tabs :deep(.p-togglebutton:hover) .p-togglebutton-label {
  color: var(--iridis-text);
  background: transparent;
}
.iridis-picker__tabs :deep(.p-togglebutton.p-togglebutton-checked),
.iridis-picker__tabs :deep(.p-togglebutton.p-togglebutton-checked) .p-togglebutton-content,
.iridis-picker__tabs :deep(.p-togglebutton.p-togglebutton-checked) .p-togglebutton-label {
  color: var(--iridis-text);
  background: transparent;
}
.iridis-picker__tabs :deep(.p-togglebutton.p-togglebutton-checked) {
  border-bottom-color: var(--iridis-brand);
}

.iridis-picker__row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.iridis-picker__color-swatch {
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
}
.iridis-picker__hex :deep(.p-inputtext) {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
}
.iridis-picker__channels {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}
.iridis-picker__channels--four { grid-template-columns: repeat(4, 1fr); }
.iridis-picker__channels :deep(.p-inputnumber-input) {
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
}
</style>
