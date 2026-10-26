<script setup lang="ts">
/**
 * Ambient page backdrop: starfield + perspective grid + a canvas-painted
 * "lava lamp" wash of drifting glows, layered behind all content. The canvas
 * is painted from the living-background drift frames, so the colours drift
 * continuously without writing CSS variables to the document root; the stars
 * and grid read the committed engine tokens (--ui-primary, ...). `aria-hidden` +
 * `pointer-events:none` keep it out of the a11y tree and away from the
 * carousel's drag handling. The whole thing is `position:fixed`, so it is
 * always fully painted behind whatever the user has scrolled to — there is
 * no seam, because there is only ever one continuous viewport-sized canvas,
 * never a clipped or duplicated one.
 */

import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

import type { LivingBackgroundFrameInterface } from '~/composables/interfaces/LivingBackgroundFrameInterface.ts';

import { drawColorStream } from '~/components/content/colorStream/drawColorStream.ts';
import { useLivingBackground } from '~/composables/useLivingBackground.ts';
import { useThemePreset } from '~/composables/useThemePreset.ts';
import { randomPlacement } from '~/theme/particles/randomPlacement.ts';

import { AmbientFieldPainter } from './ambient/AmbientFieldPainter.ts';
import type { AmbientStarLayerInterface } from './ambient/AmbientStarLayerInterface.ts';
import { AmbientStarfieldPainter } from './ambient/AmbientStarfieldPainter.ts';

/**
 * Ambient params come from the active theme's `ambient` config
 * (useThemePreset()). Each theme supplies its selected particle renderer,
 * so this component renders that implementation without resolving a shape token.
 */
const { 'activeAmbient': activeAmbient } = useThemePreset();
const particleCounts = computed(() => activeAmbient.value.particleCounts);
/** Keep all themes under a practical animation budget so a single dense preset
 *  (like the default `futuristic`) cannot trigger a DOM/paint collapse. */
const MAX_PARTICLE_COUNT = 430;
/** Limits the glows painted per frame. */
const MAX_BLOB_COUNT = 12;

/**
 * Proportionally downscale a theme's requested particle profile so the total
 * stays under `MAX_PARTICLE_COUNT`, preserving density relationships across
 * layers and themes.
 */
function budgetParticleCounts(requested: readonly number[]): number[] {
  const total = requested.reduce((acc, count) => acc + Math.max(count, 0), 0);
  if (total <= MAX_PARTICLE_COUNT) {return requested.slice(0, 5);}

  const scale = MAX_PARTICLE_COUNT / total;
  const scaled = requested.map((count) => Math.max(0, Math.floor(count * scale)));
  const fractions = requested
    .map((count, index) => ({ 'index': index, 'fraction': (count * scale) - (scaled[index] ?? 0) }))
    .sort((left, right) => right.fraction - left.fraction);
  let used = scaled.reduce((acc, count) => acc + count, 0);

  if (fractions.length === 0) {
    return scaled.slice(0, 5);
  }

  let i = 0;
  while (used < MAX_PARTICLE_COUNT) {
    const fractionCandidate = fractions[i % fractions.length];
    if (fractionCandidate === undefined) {break;}
    const index = fractionCandidate.index;
    scaled[index] = (scaled[index] ?? 0) + 1;
    used += 1;
    i += 1;
  }

  return scaled.slice(0, 5);
}

const cappedParticleCounts = computed(() => budgetParticleCounts(particleCounts.value));
const cappedBlobCount = computed(() => Math.min(activeAmbient.value.blobCount, MAX_BLOB_COUNT));

/**
 * Approximate hero-text bounding box, in the same vw/vh scale
 * randomPlacement() itself uses — the logo, "iridis" wordmark, and tagline
 * (see HeroBanner.vue) all sit centered near the very top of the page.
 * Wired through every star-layer roll below so no dot re-seeds inside the
 * hero's own letterforms; the hero's own scrim behind that text is
 * HeroBanner.vue's separate concern.
 */
const HERO_TEXT_EXCLUSION = { 'xMax': 88, 'xMin': 12, 'yMax': 36, 'yMin': 0 };

function renderLayer(count: number, colorVar: string, sizePx: number, blur: string) {
  const renderer = activeAmbient.value.particleRenderer;
  randomPlacement.setExclusion(HERO_TEXT_EXCLUSION);
  const layer = renderer.render({ 'blur': blur, 'colorVar': colorVar, 'count': count, 'sizePx': sizePx });
  randomPlacement.setExclusion(null);
  return layer;
}

/**
 * The five starfield layers. A dots-surface renderer is painted on the star
 * canvas using the timing below; an elements-surface renderer is drawn as DOM
 * nodes whose twinkle/rotate timing lives in AmbientParticleLayer.vue.
 */
interface StarLayerSpecInterface {
  readonly 'blur': string;
  readonly 'colorVar': string;
  readonly 'diameterPx': number;
  readonly 'layerClass': string;
  readonly 'rotateSeconds': number;
  readonly 'sizePx': number;
  readonly 'twinkleDelaySeconds': number;
  readonly 'twinkleSeconds': number;
}

const STAR_LAYER_SPECS: readonly StarLayerSpecInterface[] = [
  { 'blur': '0', 'colorVar': 'color-mix(in oklch, var(--ui-primary) 70%, transparent)', 'diameterPx': 1.5, 'layerClass': 'star-layer star-far-1', 'rotateSeconds': 200, 'sizePx': 6, 'twinkleDelaySeconds': 0, 'twinkleSeconds': 4 },
  { 'blur': '0', 'colorVar': 'color-mix(in oklch, var(--ui-info) 70%, transparent)', 'diameterPx': 1.5, 'layerClass': 'star-layer star-far-2', 'rotateSeconds': -300, 'sizePx': 6, 'twinkleDelaySeconds': 2, 'twinkleSeconds': 5 },
  { 'blur': '0', 'colorVar': 'color-mix(in oklch, var(--ui-success) 70%, transparent)', 'diameterPx': 1.5, 'layerClass': 'star-layer star-far-3', 'rotateSeconds': 400, 'sizePx': 6, 'twinkleDelaySeconds': 1, 'twinkleSeconds': 6 },
  { 'blur': '1px', 'colorVar': 'color-mix(in oklch, var(--ui-warning) 85%, transparent)', 'diameterPx': 3, 'layerClass': 'star-layer star-near-1', 'rotateSeconds': -150, 'sizePx': 9, 'twinkleDelaySeconds': 0, 'twinkleSeconds': 3.5 },
  { 'blur': '1px', 'colorVar': 'color-mix(in oklch, var(--ui-error) 85%, transparent)', 'diameterPx': 3, 'layerClass': 'star-layer star-near-2', 'rotateSeconds': 250, 'sizePx': 9, 'twinkleDelaySeconds': 1.5, 'twinkleSeconds': 4.5 }
];

const starOutputs = computed(() => STAR_LAYER_SPECS.map((spec, index) => {
  const output = renderLayer(cappedParticleCounts.value[index] ?? 100, spec.colorVar, spec.sizePx, spec.blur);
  return { 'output': output, 'spec': spec };
}));

const elementLayers = computed(() => starOutputs.value.flatMap(({ output, spec }) => {
  const rendering = output.rendering;
  return rendering.surface === 'elements' ? [{ 'elements': rendering.elements, 'layerClass': spec.layerClass }] : [];
}));

const blobField = computed(() => AmbientFieldPainter.buildBlobs(cappedBlobCount.value));
const gridStyle = computed(() => ({ 'display': activeAmbient.value.gridDisplay }));
/** Inherited by every ambient child via CSS custom property inheritance — grid and star keyframe durations divide by this. */
const ambientStyle = computed(() => ({ '--iridis-ambient-speed': String(activeAmbient.value.speedMultiplier) }));

/** The canvas bitmap is a fraction of the viewport; the glows are soft, so the CSS-scaled result stays smooth. */
const CANVAS_SCALE = 0.25;

const canvasElement = shallowRef<HTMLCanvasElement | null>(null);
/** The glows drift over tens of seconds, so the field repaints at a low rate. */
const FIELD_FRAME_MS = 1000 / 10;
let lastFieldPaintAt = Number.NEGATIVE_INFINITY;
let lastFrame: LivingBackgroundFrameInterface | null = null;
let resizeObserver: ResizeObserver | null = null;

function paintLastFrame(): void {
  const canvas = canvasElement.value;
  const context = canvas?.getContext('2d') ?? null;
  if (canvas !== null && context !== null && lastFrame !== null) {
    AmbientFieldPainter.paint(
      context,
      canvas.width,
      canvas.height,
      lastFrame.tokens,
      lastFrame.animationMs * activeAmbient.value.speedMultiplier,
      blobField.value,
      activeAmbient.value.gooBlurPx * CANVAS_SCALE
    );
  }
}

function fitCanvas(): void {
  const canvas = canvasElement.value;
  if (canvas !== null) {
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * CANVAS_SCALE));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * CANVAS_SCALE));
    paintLastFrame();
  }
}

function canvasRef(element: unknown): void {
  resizeObserver?.disconnect();
  canvasElement.value = drawColorStream.resolveCanvasElement(element);
  if (canvasElement.value !== null) {
    resizeObserver = new ResizeObserver(fitCanvas);
    resizeObserver.observe(canvasElement.value);
  }
}

function onFrame(frame: LivingBackgroundFrameInterface): void {
  lastFrame = frame;
  const now = performance.now();
  if (now - lastFieldPaintAt >= FIELD_FRAME_MS) {
    lastFieldPaintAt = now;
    paintLastFrame();
  }
}

/** Starfield redraw cadence; the field turns over minutes and twinkles over seconds, so a low rate reads as continuous. */
const STAR_FRAME_MS = 1000 / 15;
/** Resolved star colours are re-read at this cadence so a committed palette change lands without a style read per frame. */
const STAR_COLOR_REFRESH_MS = 1000;
const STAR_MAX_PIXEL_RATIO = 1.5;

const starCanvas = shallowRef<HTMLCanvasElement | null>(null);
const starRoot = ref<HTMLElement | null>(null);
let starFrame: number | null = null;
let starResizeObserver: ResizeObserver | null = null;
let starColors: string[] = [];
let starColorsAt = Number.NEGATIVE_INFINITY;
let starLastPaintAt = Number.NEGATIVE_INFINITY;
let isReducedMotion = false;
const starEpoch = performance.now();

function resolveStarColors(now: number): void {
  const root = starRoot.value;
  if (root !== null && now - starColorsAt >= STAR_COLOR_REFRESH_MS) {
    starColorsAt = now;
    const probe = root.ownerDocument.createElement('span');
    root.appendChild(probe);
    starColors = STAR_LAYER_SPECS.map((spec) => {
      probe.style.color = spec.colorVar;
      return getComputedStyle(probe).color;
    });
    probe.remove();
  }
}

function starLayers(): AmbientStarLayerInterface[] {
  const result: AmbientStarLayerInterface[] = [];
  starOutputs.value.forEach(({ output, spec }, index) => {
    const rendering = output.rendering;
    if (rendering.surface === 'dots') {
      result.push({
        'blurPx': rendering.blurPx,
        'color': starColors[index] ?? 'transparent',
        'diameterPx': spec.diameterPx,
        'dots': rendering.dots,
        'rotateSeconds': spec.rotateSeconds,
        'twinkleDelaySeconds': spec.twinkleDelaySeconds,
        'twinkleSeconds': spec.twinkleSeconds
      });
    }
  });
  return result;
}

function paintStars(now: number): void {
  const canvas = starCanvas.value;
  const context = canvas?.getContext('2d') ?? null;
  if (canvas !== null && context !== null) {
    starLastPaintAt = now;
    resolveStarColors(now);
    const elapsed = isReducedMotion ? 0 : now - starEpoch;
    AmbientStarfieldPainter.paint(context, canvas.width, canvas.height, starLayers(), elapsed, activeAmbient.value.speedMultiplier);
  }
}

function starTick(now: number): void {
  starFrame = requestAnimationFrame(starTick);
  if (now - starLastPaintAt >= STAR_FRAME_MS) {
    paintStars(now);
  }
}

function stopStars(): void {
  if (starFrame !== null) {
    cancelAnimationFrame(starFrame);
    starFrame = null;
  }
}

function startStars(): void {
  if (starFrame === null && !isReducedMotion && document.visibilityState === 'visible') {
    starFrame = requestAnimationFrame(starTick);
  }
}

function fitStars(): void {
  const canvas = starCanvas.value;
  if (canvas !== null) {
    const ratio = Math.min(window.devicePixelRatio, STAR_MAX_PIXEL_RATIO);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    paintStars(performance.now());
  }
}

function starCanvasRef(element: unknown): void {
  starResizeObserver?.disconnect();
  starCanvas.value = drawColorStream.resolveCanvasElement(element);
  if (starCanvas.value !== null) {
    starResizeObserver = new ResizeObserver(fitStars);
    starResizeObserver.observe(starCanvas.value);
  }
}

function onStarVisibility(): void {
  if (document.visibilityState === 'visible') {
    startStars();
  } else {
    stopStars();
  }
}

onMounted(() => {
  isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('visibilitychange', onStarVisibility);
  startStars();
});
watch(starOutputs, () => { paintStars(performance.now()); });

useLivingBackground(onFrame);
watch(blobField, paintLastFrame);
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  starResizeObserver?.disconnect();
  stopStars();
  document.removeEventListener('visibilitychange', onStarVisibility);
});
</script>

<template>
  <div
    ref="starRoot"
    class="ambient"
    aria-hidden="true"
    :style="ambientStyle"
  >
    <!--
      The grid is base/shared markup — every theme gets the same node. Its
      selected display implementation keeps the DOM shape identical between
      server and client, so a persisted theme can update visibility after
      hydration without a node mismatch.
    -->
    <div
      class="ambient-grid"
      :style="gridStyle"
    >
      <div class="ambient-grid-lines" />
    </div>

    <ClientOnly>
      <canvas
        :ref="canvasRef"
        class="ambient-field"
      />

      <canvas
        :ref="starCanvasRef"
        class="ambient-stars"
      />
      <AmbientParticleLayer
        v-for="layer in elementLayers"
        :key="layer.layerClass"
        :layer-class="layer.layerClass"
        :elements="layer.elements"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
.ambient {
  position: fixed;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  /* Per-theme color TONE — every particle/blob still reads the live engine
     palette (--ui-primary etc.), never a hardcoded hue, but how VIVID that
     palette looks in the background is a theme knob: an executive theme
     wants muted/desaturated, an arcade/streamer theme wants punchy and
     saturated. Set per-theme in site/app/theme/presets/<key>.css; 1/1 here
     is the neutral (futuristic) default. */
  filter: saturate(var(--iridis-ambient-saturate)) contrast(var(--iridis-ambient-contrast));
}

/* ─── perspective grid floor ─── */
.ambient-grid {
  position: absolute;
  inset: -50% 0 0 0;
  overflow: hidden;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, var(--glow) 10%, transparent 70%);
  opacity: 0.1;
}
/* The lattice pans one tile period in one-pixel steps, so the masked layer redraws a few times a second. */
.ambient-grid-lines {
  position: absolute;
  inset: -44px 0 0 -44px;
  background-image:
    linear-gradient(color-mix(in oklch, var(--ui-primary) 22%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--ui-primary) 22%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  animation: ambient-grid-pan calc(18s / var(--iridis-ambient-speed)) steps(44) infinite;
}

/* ─── drifting colour field ─── */
.ambient-field {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.11;
  mix-blend-mode: screen;
  /* fades the field to zero alpha before it reaches a viewport edge. */
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, var(--glow) 0%, transparent 92%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, var(--glow) 0%, transparent 92%);
}

/* ─── starfield (dots surface) ─── */
.ambient-stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

@keyframes ambient-grid-pan { to { transform: translate(44px, 44px); } }

@media (prefers-reduced-motion: reduce) {
  .ambient-grid-lines {
    animation: none !important;
  }
}
</style>
