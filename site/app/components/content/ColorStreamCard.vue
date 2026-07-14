<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

import { scaleChromaToY, sampleIndexToX } from '../../composables/colorStreamAxis.ts';
import { colorStreamComparison } from '../../composables/colorStreamComparison.ts';
import type { RoleViewType } from '../../composables/types/index.ts';
import { useIridis } from '../../composables/useIridis.ts';
import { DECORATIVE_ALIASES, useColorStreamHistory, useLivingBackground, type ColorSampleType } from '../../composables/useLivingBackground.ts';
import { capitalize } from '../../utils/capitalize.ts';

/** Role display order for the seismograph stack, derived from useLivingBackground.ts's own DECORATIVE_ALIASES — the alias/roleName pairing has exactly one source, this just adds the display label. */
const ROLES: { alias: string; label: string; roleName: string }[] = Object.entries(DECORATIVE_ALIASES).map(([alias, roleName]) => ({
  'alias':    alias,
  'label':    capitalize(alias),
  'roleName': roleName
}));

/** Number of samples in each static comparison band — shares the same 0..1 progress axis for both interpolation methods. */
const COMPARISON_SAMPLE_COUNT = 48;

const histories = useColorStreamHistory();
const reducedMotion = ref<boolean>(false);
/** Plain (non-reactive) DOM handle arrays — read imperatively by the draw loop, never rendered, so they don't need to be Vue refs. */
const canvasRefs: (HTMLCanvasElement | null)[] = [];
const naiveCanvasRefs: (HTMLCanvasElement | null)[] = [];
const engineCanvasRefs: (HTMLCanvasElement | null)[] = [];
let rafId: number | null = null;

/** Narrows a template ref to an HTMLCanvasElement by tag name rather than `instanceof` — this component can render inside a carousel face whose canvas elements come from a different window realm, where `instanceof HTMLCanvasElement` against the outer realm's constructor would incorrectly return false. */
function asCanvasElement(el: unknown): HTMLCanvasElement | null {
  return el !== null && typeof el === 'object' && 'tagName' in el && (el as HTMLElement).tagName === 'CANVAS' ? el as HTMLCanvasElement : null;
}

/** Draws a static comparison band (either the naive RGB lerp or the OKLCH lerp) as evenly-spaced color segments. */
function drawBand(canvas: HTMLCanvasElement, colors: readonly string[]): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) { return; }

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const segmentWidth = width / colors.length;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i]!;
    ctx.fillRect(i * segmentWidth, 0, segmentWidth + 1, height);
  }
}

/**
 * Draws the naive-vs-engine comparison pair for every role. The `from`
 * endpoint is each role's actual current OKLCH color; `to` is the same
 * lightness/chroma rotated 180° in hue — a complementary swing chosen so the
 * naive RGB lerp's muddy midpoint (opposite hues average toward neutral gray
 * in RGB space) is reliably visible next to the engine's OKLCH lerp, which
 * stays vibrant throughout. Called whenever roleViews changes since the
 * engine's initial palette resolves asynchronously (image extraction) —
 * it's likely still empty at mount time.
 */
function drawComparisonBands(views: RoleViewType[]): void {
  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i]!;
    const view = views.find((v) => v.name === role.roleName);
    if (view === undefined) { continue; }

    const toH = (view.h + 180) % 360;
    const bands = colorStreamComparison.buildComparisonBands(view.l, view.c, view.h, view.l, view.c, toH, COMPARISON_SAMPLE_COUNT);

    const naiveCanvas = naiveCanvasRefs[i];
    if (naiveCanvas) { drawBand(naiveCanvas, bands.naive); }

    const engineCanvas = engineCanvasRefs[i];
    if (engineCanvas) { drawBand(engineCanvas, bands.engine); }
  }
}

function drawStrip(canvas: HTMLCanvasElement, samples: ReadonlyArray<ColorSampleType>): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) { return; }

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (samples.length < 2) { return; }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const sample of samples) {
    if (sample.chroma < min) { min = sample.chroma; }
    if (sample.chroma > max) { max = sample.chroma; }
  }

  let prevX = sampleIndexToX(0, samples.length, width);
  let prevY = scaleChromaToY(samples[0]!.chroma, min, max, height);

  for (let i = 1; i < samples.length; i++) {
    const sample = samples[i]!;
    const x = sampleIndexToX(i, samples.length, width);
    const y = scaleChromaToY(sample.chroma, min, max, height);

    ctx.strokeStyle = sample.hex;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    prevX = x;
    prevY = y;
  }
}

function drawAllStrips(): void {
  for (const { alias } of ROLES) {
    const index = ROLES.findIndex((r) => r.alias === alias);
    const canvas = canvasRefs[index];
    if (!canvas) { continue; }
    drawStrip(canvas, histories[alias] ?? []);
  }
}

function loop(): void {
  drawAllStrips();
  rafId = window.requestAnimationFrame(loop);
}

onMounted(() => {
  useLivingBackground();
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { roleViews } = useIridis();
  watch(roleViews, (views) => { drawComparisonBands(views); }, { 'immediate': true });
  if (reducedMotion.value) {
    drawAllStrips();
    return;
  }
  rafId = window.requestAnimationFrame(loop);
});

onUnmounted(() => {
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
});
</script>

<template>
  <UCard>
    <UBadge
      v-if="reducedMotion"
      color="warning"
      variant="soft"
      class="mb-3"
    >
      prefers-reduced-motion is on
    </UBadge>

    <div class="space-y-3">
      <p class="text-sm text-muted">
        Six independent seismograph strips — one per decorative role — tracing that role's live chroma
        drift, oldest at the left, newest at the right, each segment colored by its own computed hex.
        Beneath each, a static comparison: a naive RGB channel lerp against the engine's OKLCH lerp,
        both spanning the same complementary hue swing — the naive band often dips through a muddy,
        desaturated midpoint that the OKLCH band avoids.
      </p>

      <p class="text-xs text-muted">
        This is <strong class="text-highlighted">Living Color</strong> in motion — see
        <a href="#living-color" class="text-primary hover:underline">Living Color</a> for the palette-vector
        math and curve-evaluation packages behind the drift you're watching.
      </p>

      <div class="space-y-4">
        <div
          v-for="(role, i) in ROLES"
          :key="role.alias"
          class="space-y-1"
        >
          <div class="text-[11px] font-mono text-dimmed">
            {{ role.label }} — engine-driven (live)
          </div>
          <canvas
            :ref="(el) => { canvasRefs[i] = asCanvasElement(el); }"
            width="640"
            height="48"
            class="w-full rounded border border-default"
            style="height: 48px;"
          />

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="space-y-1">
              <div class="text-[11px] font-mono text-dimmed">
                CSS lerp (naive RGB)
              </div>
              <canvas
                :ref="(el) => { naiveCanvasRefs[i] = asCanvasElement(el); }"
                width="320"
                height="24"
                class="w-full rounded border border-default"
                style="height: 24px;"
              />
            </div>
            <div class="space-y-1">
              <div class="text-[11px] font-mono text-dimmed">
                OKLCH engine
              </div>
              <canvas
                :ref="(el) => { engineCanvasRefs[i] = asCanvasElement(el); }"
                width="320"
                height="24"
                class="w-full rounded border border-default"
                style="height: 24px;"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
