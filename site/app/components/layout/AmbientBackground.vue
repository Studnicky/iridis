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

import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';

import type { LivingBackgroundFrameInterface } from '~/composables/interfaces/LivingBackgroundFrameInterface.ts';

import { drawColorStream } from '~/components/content/colorStream/drawColorStream.ts';
import { useLivingBackground } from '~/composables/useLivingBackground.ts';
import { useThemePreset } from '~/composables/useThemePreset.ts';
import { randomPlacement } from '~/theme/particles/randomPlacement.ts';

import { AmbientFieldPainter } from './ambient/AmbientFieldPainter.ts';

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

const layerFar1 = computed(() => renderLayer(cappedParticleCounts.value[0] ?? 200, 'color-mix(in oklch, var(--ui-primary) 70%, transparent)', 6, '0'));
const layerFar2 = computed(() => renderLayer(cappedParticleCounts.value[1] ?? 200, 'color-mix(in oklch, var(--ui-info) 70%, transparent)', 6, '0'));
const layerFar3 = computed(() => renderLayer(cappedParticleCounts.value[2] ?? 200, 'color-mix(in oklch, var(--ui-success) 70%, transparent)', 6, '0'));

const layerNear1 = computed(() => renderLayer(cappedParticleCounts.value[3] ?? 100, 'color-mix(in oklch, var(--ui-warning) 85%, transparent)', 9, '1px'));
const layerNear2 = computed(() => renderLayer(cappedParticleCounts.value[4] ?? 100, 'color-mix(in oklch, var(--ui-error) 85%, transparent)', 9, '1px'));

const blobField = computed(() => AmbientFieldPainter.buildBlobs(cappedBlobCount.value));
const gridStyle = computed(() => ({ 'display': activeAmbient.value.gridDisplay }));
const canvasStyle = computed(() => ({ 'filter': activeAmbient.value.gooFilter }));
/** Inherited by every ambient child via CSS custom property inheritance — grid and star keyframe durations divide by this. */
const ambientStyle = computed(() => ({ '--iridis-ambient-speed': String(activeAmbient.value.speedMultiplier) }));

/** The canvas bitmap is a fraction of the viewport; the glows are soft, so the CSS-scaled result stays smooth. */
const CANVAS_SCALE = 0.25;

const canvasElement = shallowRef<HTMLCanvasElement | null>(null);
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
      blobField.value
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
  paintLastFrame();
}

useLivingBackground(onFrame);
watch(blobField, paintLastFrame);
onBeforeUnmount(() => { resizeObserver?.disconnect(); });
</script>

<template>
  <div
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
    />

    <ClientOnly>
      <canvas
        :ref="canvasRef"
        class="ambient-field"
        :style="canvasStyle"
      />

      <AmbientParticleLayer
        layer-class="star-layer star-far-1"
        :layer="layerFar1"
      />
      <AmbientParticleLayer
        layer-class="star-layer star-far-2"
        :layer="layerFar2"
      />
      <AmbientParticleLayer
        layer-class="star-layer star-far-3"
        :layer="layerFar3"
      />

      <AmbientParticleLayer
        layer-class="star-layer star-near-1"
        :layer="layerNear1"
      />
      <AmbientParticleLayer
        layer-class="star-layer star-near-2"
        :layer="layerNear2"
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
  background-image:
    linear-gradient(color-mix(in oklch, var(--ui-primary) 22%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--ui-primary) 22%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, var(--glow) 10%, transparent 70%);
  opacity: 0.1;
  animation: ambient-grid-pan calc(18s / var(--iridis-ambient-speed)) linear infinite;
}

/* ─── drifting colour field (the selected theme filter applies inline) ─── */
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

@keyframes ambient-grid-pan { to { background-position: 0 44px, 44px 0; } }

@media (prefers-reduced-motion: reduce) {
  .ambient-grid {
    animation: none !important;
  }
}
</style>
