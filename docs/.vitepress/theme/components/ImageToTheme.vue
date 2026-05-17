<script setup lang="ts">
/**
 * ImageToTheme.vue
 *
 * End-to-end image → theme generator. Decodes a user-supplied image to
 * pixel data, runs the engine pipeline `intake:imagePixels →
 * gallery:histogram → gallery:extract → gallery:assignRoles →
 * gallery:harmonize → enforce:contrast → emit:json`, renders the
 * spectrograph + resolved gallery palette, and offers a "Copy CSS
 * variables" affordance.
 *
 * Tunable extraction config (K, histogram bits, delta-E input cap,
 * harmonize threshold, lightness range, chroma range) is exposed via
 * a slider form so callers can A/B parameter sweeps without dropping
 * to code.
 *
 * Two clustering algorithms are exposed via a SelectButton: 'median-cut'
 * (weighted; fast) and 'delta-e' (agglomerative deltaE2000; visually
 * faithful, slower).
 *
 * The component is ClientOnly because all of its decoding/engine work
 * relies on browser APIs (canvas, FileReader, drag-and-drop).
 */

import { computed, onMounted, ref, watch } from 'vue';

import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin }    from '@studnicky/iridis-contrast';
import {
  imagePlugin,
  type GalleryAlgorithmType,
} from '@studnicky/iridis-image';
import type {
  ColorRecordInterface,
  PaletteStateInterface,
} from '@studnicky/iridis/model';

import SelectButton from 'primevue/selectbutton';
import Button       from 'primevue/button';
import Slider       from 'primevue/slider';

import BuildImageOptionsGuide from './BuildImageOptionsGuide.vue';

import { configStore }      from '../stores/configStore.ts';
import { roleSchemaByName } from '../schemas/roleSchemas.ts';

const IMAGE_MAX_EDGE     = 512;
const HISTOGRAM_HUE_BINS = 36;
const STRIP_MAX_CLUSTERS = 24;

interface SpectrographDataInterface {
  readonly clusters:    readonly { readonly hex: string; readonly weight: number }[];
  readonly hueBars:     readonly { readonly hex: string; readonly weight: number; readonly angle: number }[];
  readonly totalWeight: number;
}

const algorithm = ref<GalleryAlgorithmType>('median-cut');
const status    = ref<string>('Drop an image, paste a URL, or pick a preset.');
const error     = ref<string | null>(null);
const isWorking = ref<boolean>(false);
const fileUrl   = ref<string | null>(null);
const urlInput  = ref<string>('');
const state     = ref<PaletteStateInterface | null>(null);
const elapsedMs = ref<number | null>(null);

const fileInput = ref<HTMLInputElement | null>(null);

/* Slider-bound config. Defaults match the previous hard-coded values
   so the first paint matches the prior baseline; the form lets users
   sweep parameters without dropping into code. */
const cfgK                  = ref<number>(8);
const cfgHistogramBits      = ref<number>(5);
const cfgDeltaECap          = ref<number>(128);
const cfgHarmonizeThreshold = ref<number>(10);
const cfgLightnessRange     = ref<[number, number]>([0, 1]);
const cfgChromaRange        = ref<[number, number]>([0, 0.5]);

/* Engine reuse: one instance, two pipelines. The engine doesn't carry
   state between runs so swapping algorithms only needs the pipeline
   re-set, not a fresh registry. */
const engine = new Engine();
for (const t of coreTasks) engine.tasks.register(t);
engine.adopt(contrastPlugin);
engine.adopt(imagePlugin);

/* Image pipeline. `gallery:histogram` + `gallery:extract` reduce raw
   pixels to K dominant colors; those flow through the canonical
   `resolve:roles` task against the user's active configStore schema. */
const PIPELINE: readonly string[] = [
  'intake:imagePixels',
  'gallery:histogram',
  'gallery:extract',
  'resolve:roles',
  'enforce:contrast',
  'derive:variant',
  'emit:json',
];

async function decodeImageToPixels(src: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload  = () => resolve();
    img.onerror = () => reject(new Error('Image load failed (possible CORS or 404)'));
    img.src = src;
  });
  const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge > IMAGE_MAX_EDGE ? IMAGE_MAX_EDGE / longEdge : 1;
  const w = Math.max(1, Math.round(img.naturalWidth  * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { 'willReadFrequently': true });
  if (ctx === null) throw new Error('Unable to acquire 2D canvas context');
  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  return { 'data': imageData.data, 'width': w, 'height': h };
}

interface PendingRunInterface {
  readonly src:   string;
  readonly label: string;
}
let pendingRun: PendingRunInterface | null = null;

async function runForUrl(src: string, label: string): Promise<void> {
  if (isWorking.value) {
    pendingRun = { 'src': src, 'label': label };
    status.value = `Queued ${label} (${algorithm.value}) — finishing current run…`;
    return;
  }
  error.value = null;
  isWorking.value = true;
  status.value = `Decoding ${label}…`;
  const t0 = performance.now();
  try {
    fileUrl.value = src;
    const pixels = await decodeImageToPixels(src);
    status.value = `Running pipeline (${algorithm.value}, k=${cfgK.value})…`;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    engine.pipeline(PIPELINE);
    /* Use the user's active role schema + framing so the resolved
       roles match what the rest of the docs see. The image pipeline
       is just a different intake — same downstream resolution. */
    const pair   = roleSchemaByName[configStore.roleSchema] ?? roleSchemaByName['iridis-32']!;
    const schema = pair[configStore.framing];
    const result = await engine.run({
      'colors':   [pixels],
      'roles':    schema,
      'contrast': { 'level': configStore.contrastLevel, 'algorithm': configStore.contrastAlgorithm },
      'runtime':  { 'framing':  configStore.framing,    'colorSpace': configStore.colorSpace },
      'metadata': {
        'gallery': {
          'k':                  cfgK.value,
          'algorithm':          algorithm.value,
          'histogramBits':      cfgHistogramBits.value,
          'deltaECap':          cfgDeltaECap.value,
          'harmonizeThreshold': cfgHarmonizeThreshold.value,
          'lightnessRange':     [...cfgLightnessRange.value] as readonly [number, number],
          'chromaRange':        [...cfgChromaRange.value]    as readonly [number, number],
        },
      },
    });
    state.value = result;
    elapsedMs.value = Math.round(performance.now() - t0);
    /* Publish the image-derived seeds into the canonical SPA store so
       every other page re-themes from this image. The active role schema
       (default iridis-16) re-resolves them through the normal docs
       projector — we don't fork to a separate cascade.
       Capped at 8 because docsConfigSchema enforces maxItems: 8 on
       paletteColors. */
    const dominant = (result.metadata['gallery'] as { 'dominantColors'?: readonly ColorRecordInterface[] } | undefined)?.dominantColors ?? [];
    const seeds = dominant
      .slice(0, 8)
      .map((c) => c.hex)
      .filter((hex) => /^#[0-9a-fA-F]{6}$/.test(hex));
    if (seeds.length > 0) {
      configStore.paletteColors = seeds;
    }
    status.value = `Theme generated from ${label} in ${elapsedMs.value} ms — applied to docs.`;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    state.value = null;
    status.value = 'Failed.';
  } finally {
    isWorking.value = false;
    if (pendingRun !== null) {
      const next = pendingRun;
      pendingRun = null;
      void runForUrl(next.src, next.label);
    }
  }
}

function rerunIfLoaded(): void {
  if (fileUrl.value !== null) {
    void runForUrl(fileUrl.value, 'current image');
  }
}

function onDrop(ev: DragEvent): void {
  ev.preventDefault();
  const f = ev.dataTransfer?.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  void runForUrl(url, f.name);
}

function onDragOver(ev: DragEvent): void {
  ev.preventDefault();
}

function onFilePick(ev: Event): void {
  const target = ev.target as HTMLInputElement;
  const f = target.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  void runForUrl(url, f.name);
}

function onUrlSubmit(): void {
  if (urlInput.value.trim().length === 0) return;
  void runForUrl(urlInput.value.trim(), 'URL');
}

/* Famous public-domain photographs hosted on Wikimedia Commons. Every
   URL targets the `upload.wikimedia.org` CDN at a thumbnail-sized
   render (≤ 1280px on the long edge) — small enough to decode quickly,
   large enough to expose meaningful palette structure. Wikimedia serves
   these with `Access-Control-Allow-Origin: *` so the canvas decoder
   does not taint when the image lands. The hosting is about as stable
   as anything on the public internet: every URL has a permanent stable
   path under `/wikipedia/commons/thumb/<hash>/<filename>/<size>px-...`
   and Wikimedia commits to never breaking these. The iridis logo stays
   first as the project's own reference frame. */
interface PresetInterface {
  readonly 'label':  string;
  readonly 'src':    string;
  readonly 'credit': string;
}
const PRESETS_RAW: readonly PresetInterface[] = [
  {
    'label':  'iridis logo',
    'src':    '/iridis/logo.png',
    'credit': 'iridis',
  },
  {
    'label':  'Great Wave',
    'src':    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Great_Wave_off_Kanagawa.jpg/1280px-The_Great_Wave_off_Kanagawa.jpg',
    'credit': 'Katsushika Hokusai, c. 1831 — public domain (Wikimedia Commons)',
  },
  {
    'label':  'Starry Night',
    'src':    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1280px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
    'credit': 'Vincent van Gogh, 1889 — public domain (Wikimedia Commons)',
  },
  {
    'label':  'Earthrise',
    'src':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/NASA-Apollo8-Dec24-Earthrise.jpg/1280px-NASA-Apollo8-Dec24-Earthrise.jpg',
    'credit': 'William Anders / NASA Apollo 8, 1968 — public domain',
  },
  {
    'label':  'Blue Marble',
    'src':    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/1024px-The_Earth_seen_from_Apollo_17.jpg',
    'credit': 'NASA Apollo 17, 1972 — public domain',
  },
  {
    'label':  'Pillars of Creation',
    'src':    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pillars_2014_HST_WFC3-UVIS_full-res_denoised.jpg/1280px-Pillars_2014_HST_WFC3-UVIS_full-res_denoised.jpg',
    'credit': 'NASA/ESA Hubble, 2014 — public domain',
  },
  {
    'label':  'Carina Nebula',
    'src':    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Cosmic_Cliffs_in_Carina_%28NIRCam_Image%29.jpg/1280px-Cosmic_Cliffs_in_Carina_%28NIRCam_Image%29.jpg',
    'credit': 'NASA/ESA/CSA JWST, 2022 — public domain',
  },
];

/* Availability-filtered preset list. The mount-time probe (below)
   removes any URL that fails to load in the user's browser — a
   broken CDN, a corporate firewall, an extension blocking the host,
   or Wikimedia's hash path changing. The fallback is silent at the
   UI layer (the chip just disappears) and loud at the console
   (`[iridis] preset unavailable: ...`) so misconfiguration surfaces
   in dev-tools without breaking the page. */
const availablePresets = ref<readonly PresetInterface[]>(PRESETS_RAW);

function probePreset(preset: PresetInterface): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') { resolve(true); return; }
    const img    = new Image();
    img.crossOrigin = 'anonymous';
    const timer  = setTimeout(() => { resolve(false); }, 8000);
    img.onload   = (): void => { clearTimeout(timer); resolve(true);  };
    img.onerror  = (): void => { clearTimeout(timer); resolve(false); };
    img.src      = preset.src;
  });
}

async function refreshPresetAvailability(): Promise<void> {
  if (typeof window === 'undefined') return;
  const results = await Promise.all(PRESETS_RAW.map(async (p) => ({
    'preset':    p,
    'available': await probePreset(p),
  })));
  const kept: PresetInterface[] = [];
  for (const r of results) {
    if (r.available) {
      kept.push(r.preset);
    } else if (typeof console !== 'undefined') {
      console.warn(`[iridis] preset unavailable: ${r.preset.label} (${r.preset.src})`);
    }
  }
  availablePresets.value = kept;
}

function onPreset(src: string, label: string): void {
  urlInput.value = src;
  void runForUrl(src, label);
}

watch(algorithm, rerunIfLoaded);
watch([
  cfgK,
  cfgHistogramBits,
  cfgDeltaECap,
  cfgHarmonizeThreshold,
  () => [...cfgLightnessRange.value],
  () => [...cfgChromaRange.value],
], rerunIfLoaded, { 'deep': true });

onMounted(() => {
  void runForUrl('/iridis/logo.png', 'iridis logo');
  void refreshPresetAvailability();
});

/* Empty-histogram fallback: when the current pipeline produced no
   clusters (degenerate slider config, all pixels filtered out, etc),
   return a zero-weight structure so the SVG frame stays mounted and
   the layout doesn't jump. Only the bars are empty — the panel,
   legend, and axes all remain visible. */
const EMPTY_SPECTROGRAPH: SpectrographDataInterface = {
  'clusters':    [],
  'hueBars':     Array.from({ length: HISTOGRAM_HUE_BINS }, (_, i) => ({
    'hex':    '#222',
    'weight': 0,
    'angle':  (i / HISTOGRAM_HUE_BINS) * 360,
  })),
  'totalWeight': 0,
};

const spectrograph = computed<SpectrographDataInterface>(() => {
  if (state.value === null) return EMPTY_SPECTROGRAPH;
  const dominant = (state.value.metadata['gallery'] as { 'dominantColors'?: readonly ColorRecordInterface[] } | undefined)?.dominantColors ?? [];
  const histogram = (state.value.metadata['gallery'] as { 'histogram'?: { 'bins': readonly { 'hex': string; 'weight': number }[]; 'totalPixels': number } } | undefined)?.histogram;
  if (dominant.length === 0 || histogram === undefined) return EMPTY_SPECTROGRAPH;
  const strip = [...dominant]
    .map((d) => ({ 'hex': d.hex, 'weight': d.hints?.weight ?? 1 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, STRIP_MAX_CLUSTERS);
  const hueBuckets: { rSum: number; gSum: number; bSum: number; weight: number }[] =
    Array.from({ length: HISTOGRAM_HUE_BINS }, () => ({ 'rSum': 0, 'gSum': 0, 'bSum': 0, 'weight': 0 }));
  for (const bin of histogram.bins) {
    const r = parseInt(bin.hex.slice(1, 3), 16) / 255;
    const g = parseInt(bin.hex.slice(3, 5), 16) / 255;
    const b = parseInt(bin.hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta < 0.02) continue;
    let hue = 0;
    if (max === r)      hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else                hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
    const bucketIdx = Math.min(HISTOGRAM_HUE_BINS - 1, Math.floor((hue / 360) * HISTOGRAM_HUE_BINS));
    const bucket = hueBuckets[bucketIdx];
    if (bucket !== undefined) {
      bucket.rSum   += r * bin.weight;
      bucket.gSum   += g * bin.weight;
      bucket.bSum   += b * bin.weight;
      bucket.weight += bin.weight;
    }
  }
  const hueBars = hueBuckets.map((bucket, i) => {
    if (bucket.weight === 0) return { 'hex': '#222', 'weight': 0, 'angle': (i / HISTOGRAM_HUE_BINS) * 360 };
    const rr = Math.round((bucket.rSum / bucket.weight) * 255);
    const gg = Math.round((bucket.gSum / bucket.weight) * 255);
    const bb = Math.round((bucket.bSum / bucket.weight) * 255);
    const hex = `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
    return { 'hex': hex, 'weight': bucket.weight, 'angle': (i / HISTOGRAM_HUE_BINS) * 360 };
  });
  return { 'clusters': strip, 'hueBars': hueBars, 'totalWeight': histogram.totalPixels };
});

const stripGeometry = computed(() => {
  const sg = spectrograph.value;
  const total = sg.clusters.reduce((s, c) => s + c.weight, 0);
  if (total === 0) return [];
  let x = 0;
  return sg.clusters.map((c) => {
    const w = (c.weight / total) * 100;
    const seg = { 'hex': c.hex, 'x': x, 'w': w };
    x += w;
    return seg;
  });
});

const huePeakWeight = computed(() => {
  let peak = 1;
  for (const b of spectrograph.value.hueBars) if (b.weight > peak) peak = b.weight;
  return peak;
});

const algorithmOptions: readonly { label: string; value: GalleryAlgorithmType; }[] = [
  { 'label': 'Median-cut',  'value': 'median-cut' },
  { 'label': 'Delta-E',     'value': 'delta-e'    },
];

/* Source-mode SelectButton — mirrors the OKLCH picker's format-mode
   SelectButton pattern (hex / rgb / hsv / cmyk / oklch). Only one
   input control is visible at a time, picked by `sourceMode`. */
type SourceMode = 'file' | 'url' | 'preset';
const sourceModeOptions: readonly { label: string; value: SourceMode }[] = [
  { 'label': 'File',   'value': 'file'   },
  { 'label': 'URL',    'value': 'url'    },
  { 'label': 'Preset', 'value': 'preset' },
];
const sourceMode = ref<SourceMode>('file');
</script>

<template>
  <ClientOnly>
    <section class="image-to-theme">
      <div class="image-to-theme__grid">
        <!-- LEFT — Image input column. Mirrors IridisPicker:
               1. Drop zone / preview      (visual surface — like SV square)
               2. Source SelectButton      (mode tabs — like format tabs)
               3. Mode-specific input row  (per-mode editor — like channel inputs)
             One column, stacked, with the input row swapping content
             based on the active source mode. -->
        <div class="image-to-theme__col image-to-theme__col--source">
          <div class="image-to-theme__col-head">
            <span class="image-to-theme__label">Image</span>
            <span class="image-to-theme__hint">drop · paste · pick</span>
          </div>
          <div
            class="image-to-theme__drop"
            @drop="onDrop"
            @dragover="onDragOver"
          >
            <div v-if="fileUrl" class="image-to-theme__preview">
              <img :src="fileUrl" alt="" />
            </div>
            <div v-else class="image-to-theme__drop-empty">
              <span class="image-to-theme__drop-emoji" aria-hidden="true">⤓</span>
              <span>Drop an image here</span>
            </div>
          </div>

          <!-- Source mode SelectButton — same slot as the OKLCH picker's
               format-mode tabs. Only the input row for the active mode
               renders below. -->
          <SelectButton
            v-model="sourceMode"
            :options="sourceModeOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            class="image-to-theme__mode-tabs"
          />

          <div class="image-to-theme__source-row">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              hidden
              @change="onFilePick"
            />
            <Button
              v-if="sourceMode === 'file'"
              type="button"
              size="small"
              severity="secondary"
              label="Choose file…"
              class="image-to-theme__source-file"
              @click="fileInput?.click()"
            />
            <template v-else-if="sourceMode === 'url'">
              <input
                v-model="urlInput"
                type="url"
                class="image-to-theme__url-input"
                placeholder="https://example.com/photo.jpg"
                @keydown.enter="onUrlSubmit"
              />
              <Button
                type="button"
                size="small"
                label="Load"
                :disabled="urlInput.trim().length === 0"
                @click="onUrlSubmit"
              />
            </template>
            <div v-else-if="sourceMode === 'preset'" class="image-to-theme__presets">
              <button
                v-for="p in availablePresets"
                :key="p.src"
                type="button"
                class="image-to-theme__preset"
                :title="p.credit"
                @click="onPreset(p.src, p.label)"
              >{{ p.label }}</button>
            </div>
          </div>
        </div>

        <!-- RIGHT — Options column. Per the IridisDemo pattern (picker on
             left, swatches on right), the right column owns the OUTPUT
             configuration knobs:
               1. Histogram     (visual read-out of the extracted palette)
               2. Status        (elapsed time / error surface)
               3. Algorithm     (which clustering math runs)
               4. Sliders       (K, histogram bpc, ΔE cap, harmonize, envelopes)
             The algorithm SelectButton stays on this side — it's a
             configuration knob (which math runs against the image), not a
             source-mode picker. -->
        <div class="image-to-theme__col image-to-theme__col--output">
          <div class="image-to-theme__col-head">
            <span class="image-to-theme__label">Options</span>
            <span
              v-if="elapsedMs !== null && !isWorking && error === null"
              class="image-to-theme__hint"
            >{{ elapsedMs }} ms</span>
            <span v-else class="image-to-theme__hint">algorithm · config</span>
          </div>

          <div class="image-to-theme__histogram" aria-label="Color histogram">
            <svg viewBox="0 0 100 22" preserveAspectRatio="none" class="image-to-theme__svg">
              <g>
                <rect
                  v-for="(seg, i) in stripGeometry"
                  :key="`strip-${i}`"
                  :x="seg.x"
                  y="0"
                  :width="seg.w"
                  height="8"
                  :fill="seg.hex"
                />
              </g>
              <g>
                <rect
                  v-for="(bar, i) in spectrograph.hueBars"
                  :key="`hue-${i}`"
                  :x="(i / spectrograph.hueBars.length) * 100"
                  :y="22 - (bar.weight / huePeakWeight) * 12"
                  :width="100 / spectrograph.hueBars.length"
                  :height="(bar.weight / huePeakWeight) * 12"
                  :fill="bar.hex"
                  :opacity="bar.weight === 0 ? 0 : 1"
                />
              </g>
            </svg>
            <div class="image-to-theme__histogram-legend">
              <span>palette ribbon · {{ stripGeometry.length }} clusters</span>
              <span>hue histogram · 0° — 360°</span>
            </div>
          </div>

          <div
            class="image-to-theme__status"
            :class="{ 'image-to-theme__status--error': error !== null }"
          >
            <span>{{ error ?? status }}</span>
          </div>

          <!-- Help + config sub-grid. Histogram above spans both
               sub-columns; below, a narrow help column pairs with the
               algorithm SelectButton + slider stack. Mirrors the
               Role-schema tab's [guide][editor] layout so the two
               surfaces read as one design system. -->
          <div class="image-to-theme__options-grid">
            <BuildImageOptionsGuide class="image-to-theme__options-guide" />

            <div class="image-to-theme__options-controls">
              <!-- Algorithm SelectButton — output configuration, not
                   input source. Selects which clustering math runs
                   against the image data. -->
              <SelectButton
                v-model="algorithm"
                :options="algorithmOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                class="image-to-theme__mode-tabs"
                title="median-cut: weighted Heckbert variant — fast O(N log N). delta-e: agglomerative ΔE2000 — visually faithful, O(N² log N)."
              />

              <!-- Slider channels — one knob per extraction parameter.
                   Each label carries a title-tooltip with the same
                   short explanation surfaced inline by the guide
                   panel beside it. -->
              <div class="image-to-theme__config">
                <label
                  class="image-to-theme__slider"
                  title="Number of dominant colours the extractor returns. Lower K = broader strokes; higher K = finer-grained palette."
                >
                  <span class="image-to-theme__slider-name">Palette size</span>
                  <span class="image-to-theme__slider-readout">K = {{ cfgK }}</span>
                  <Slider v-model="cfgK" :min="2" :max="16" :step="1" />
                </label>

                <label
                  class="image-to-theme__slider"
                  title="Bits per channel for the upstream pixel histogram. 5 bpc = 32 768 bins (default). Lower bpc = coarser, faster; higher bpc = finer, slower."
                >
                  <span class="image-to-theme__slider-name">Histogram bpc</span>
                  <span class="image-to-theme__slider-readout">{{ cfgHistogramBits }} · {{ (1 << (cfgHistogramBits * 3)).toLocaleString() }} bins</span>
                  <Slider v-model="cfgHistogramBits" :min="3" :max="7" :step="1" />
                </label>

                <label
                  class="image-to-theme__slider"
                  :class="{ 'image-to-theme__slider--disabled': algorithm !== 'delta-e' }"
                  title="Max records fed into the agglomerative ΔE reducer. Active only for the delta-e algorithm. Pre-trims by descending weight to bound the O(N²) reducer."
                >
                  <span class="image-to-theme__slider-name">Δ-E input cap</span>
                  <span class="image-to-theme__slider-readout">{{ cfgDeltaECap }}</span>
                  <Slider v-model="cfgDeltaECap" :min="16" :max="256" :step="8" :disabled="algorithm !== 'delta-e'" />
                </label>

                <label
                  class="image-to-theme__slider"
                  title="Min ΔE distance the accent must keep from the frame. gallery:harmonize shifts the accent's OKLCH hue if it lands within this distance. Zero disables; ten is the perceptual 'noticeably different' threshold."
                >
                  <span class="image-to-theme__slider-name">Harmonize</span>
                  <span class="image-to-theme__slider-readout">Δ-E &lt; {{ cfgHarmonizeThreshold }}</span>
                  <Slider v-model="cfgHarmonizeThreshold" :min="0" :max="30" :step="1" />
                </label>

                <label
                  class="image-to-theme__slider"
                  title="OKLCH L envelope the extractor clamps clusters into. Drops blown-out highlights (cap max < 0.95) and shadow noise (raise min > 0.05) when the image has long dynamic range."
                >
                  <span class="image-to-theme__slider-name">Lightness</span>
                  <span class="image-to-theme__slider-readout">{{ cfgLightnessRange[0].toFixed(2) }} – {{ cfgLightnessRange[1].toFixed(2) }}</span>
                  <Slider v-model="cfgLightnessRange" :min="0" :max="1" :step="0.01" range />
                </label>

                <label
                  class="image-to-theme__slider"
                  title="OKLCH C envelope the extractor clamps clusters into. Raise min above 0 to drop near-neutral pixels; cap max below 0.5 to drop super-saturated outliers."
                >
                  <span class="image-to-theme__slider-name">Chroma</span>
                  <span class="image-to-theme__slider-readout">{{ cfgChromaRange[0].toFixed(2) }} – {{ cfgChromaRange[1].toFixed(2) }}</span>
                  <Slider v-model="cfgChromaRange" :min="0" :max="0.5" :step="0.01" range />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </ClientOnly>
</template>

<style scoped>
.image-to-theme {
  container-type: inline-size;
  container-name: image-to-theme;
}
.image-to-theme__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
@container image-to-theme (min-width: 720px) {
  .image-to-theme__grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
.image-to-theme__col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
/* Right-column sub-grid: histogram (above) spans both sub-columns;
   below, a narrow guide column pairs with the controls stack. */
.image-to-theme__options-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;
}
@container image-to-theme (min-width: 720px) {
  .image-to-theme__options-grid {
    grid-template-columns: minmax(180px, 0.42fr) minmax(0, 1fr);
  }
}
.image-to-theme__options-guide {
  min-width: 0;
}
.image-to-theme__options-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.image-to-theme__col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.75rem;
}
.image-to-theme__hint {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.image-to-theme__mode-tabs {
  width: 100%;
}
.image-to-theme__mode-tabs :deep(.p-togglebutton) {
  flex: 1 1 0;
  min-width: 0;
}
.image-to-theme__source-row {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex-wrap: wrap;
}
.image-to-theme__source-file :deep(.p-button) {
  width: 100%;
}
.image-to-theme__drop {
  border: 1.5px dashed color-mix(in oklch, var(--vp-c-divider) 60%, var(--iridis-brand, currentColor) 40%);
  border-radius: var(--iridis-radius-md, 8px);
  background: var(--vp-c-bg);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  width: 100%;
}
.image-to-theme__preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklch, var(--vp-c-bg-alt) 50%, transparent);
  border-radius: 4px;
  overflow: hidden;
}
.image-to-theme__preview img {
  display: block;
  width: 100%;
  max-width: 100%;
  /* Letter the long axis: the image fills the column width and uses
     its native aspect ratio for height, capped at a viewport-relative
     ceiling so portrait images still have a reasonable footprint. */
  max-height: min(60vh, 480px);
  height: auto;
  object-fit: contain;
}
.image-to-theme__drop-empty {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
  min-height: 180px;
}
.image-to-theme__drop-emoji {
  font-size: 1.8rem;
  line-height: 1;
}
.image-to-theme__url-input {
  flex: 1 1 0;
  min-width: 0;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
.image-to-theme__presets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.image-to-theme__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.image-to-theme__elapsed {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.image-to-theme__preset {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 3px;
  cursor: pointer;
}
.image-to-theme__preset:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

/* Slider form — one row per knob, label and monospace readout on the
   first line, slider on the second. Form chrome lifted: no fieldset
   border, just generous spacing and quiet dividers. */
.image-to-theme__config {
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  padding: 0.25rem 0.1rem;
}
.image-to-theme__slider {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 0.55rem 0.75rem;
}
.image-to-theme__slider--disabled {
  opacity: 0.55;
}
.image-to-theme__slider-name {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  letter-spacing: -0.005em;
}
.image-to-theme__slider-readout {
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.image-to-theme__slider :deep(.p-slider) {
  grid-column: 1 / -1;
  margin-top: 0.15rem;
}
.image-to-theme__slider :deep(.p-slider-handle) {
  width: 14px;
  height: 14px;
  margin-top: -6px;
}

.image-to-theme__output {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}
.image-to-theme__status {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  padding: 0.55rem 0.75rem;
  background: color-mix(in oklch, var(--vp-c-bg) 92%, var(--iridis-brand) 8%);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
}
.image-to-theme__status--error {
  background: color-mix(in oklch, var(--iridis-error, var(--vp-c-text-1)) 10%, transparent);
  border-color: color-mix(in oklch, var(--iridis-error, var(--vp-c-text-1)) 40%, transparent);
  color: var(--iridis-error, var(--vp-c-text-1));
}
.image-to-theme__tabs :deep(.p-tablist) {
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0.45rem 0.6rem 0;
}
.image-to-theme__tabs :deep(.p-tab) {
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.4rem 0.8rem;
  color: var(--vp-c-text-2);
}
.image-to-theme__tabs :deep(.p-tab[aria-selected="true"]) {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}
.image-to-theme__tabs :deep(.p-tabpanels),
.image-to-theme__tabs :deep(.p-tabpanel) {
  background: transparent;
  padding: 0.9rem 0 0;
}
.image-to-theme__roles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.5rem;
}
.image-to-theme__empty {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  padding: 0.85rem;
}
.image-to-theme__histogram {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.5rem;
}
.image-to-theme__svg {
  display: block;
  width: 100%;
  height: 132px;
}
.image-to-theme__histogram-legend {
  display: flex;
  justify-content: space-between;
  font-size: 0.66rem;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
  margin-top: 0.3rem;
}
.image-to-theme__code {
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: auto;
  max-height: 360px;
}
.image-to-theme__code code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.76rem;
  color: var(--vp-c-text-2);
  line-height: 1.45;
  white-space: pre;
}
.image-to-theme__code-actions {
  margin-top: 0.55rem;
  display: flex;
  gap: 0.5rem;
}
.image-to-theme__css {
  margin-top: 0.85rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.55rem 0.7rem;
}
.image-to-theme__css summary {
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  font-weight: 600;
}
.image-to-theme__css pre {
  margin: 0.5rem 0 0;
  padding: 0.65rem 0.85rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  overflow: auto;
}
.image-to-theme__css code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
</style>
