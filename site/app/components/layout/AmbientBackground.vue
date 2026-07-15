<script setup lang="ts">
/**
 * Ambient page backdrop: starfield + perspective grid + a gooey "lava lamp"
 * metaball wash, layered behind all content. Every color reads a live engine
 * token (--ui-primary, --ui-color-*) so the scene recolors instantly when the
 * palette changes — nothing here is a literal hex. `aria-hidden` +
 * `pointer-events:none` keep it out of the a11y tree and away from the
 * carousel's drag handling. The whole thing is `position:fixed`, so it is
 * always fully painted behind whatever the user has scrolled to — there is
 * no seam, because there is only ever one continuous viewport-sized canvas,
 * never a clipped or duplicated one.
 */

import { computed } from 'vue';

import { useLivingBackground } from '~/composables/useLivingBackground.ts';
import { useThemePreset } from '~/composables/useThemePreset.ts';
import { PARTICLE_RENDERERS } from '~/theme/particles/index.ts';

useLivingBackground();

/**
 * Ambient params come from the active theme's `ambient` config
 * (useThemePreset()). The particle SHAPE is dispatched to its own renderer
 * module via PARTICLE_RENDERERS — a lookup map, not a branch — so adding a
 * new shape never touches this component.
 */
const { 'activeAmbient': activeAmbient } = useThemePreset();
const particleCounts = computed(() => activeAmbient.value.particleCounts);

function renderLayer(count: number, colorVar: string, sizePx: number, blur: string) {
  const renderer = PARTICLE_RENDERERS[activeAmbient.value.particleShape] ?? PARTICLE_RENDERERS['dot']!;
  return renderer({ 'blur': blur, 'colorVar': colorVar, 'count': count, 'sizePx': sizePx });
}

const layerFar1 = computed(() => renderLayer(particleCounts.value[0] ?? 200, 'color-mix(in oklch, var(--ui-primary) 70%, transparent)', 6, '0'));
const layerFar2 = computed(() => renderLayer(particleCounts.value[1] ?? 200, 'color-mix(in oklch, var(--ui-info) 70%, transparent)', 6, '0'));
const layerFar3 = computed(() => renderLayer(particleCounts.value[2] ?? 200, 'color-mix(in oklch, var(--ui-success) 70%, transparent)', 6, '0'));

const layerNear1 = computed(() => renderLayer(particleCounts.value[3] ?? 100, 'color-mix(in oklch, var(--ui-warning) 85%, transparent)', 9, '1px'));
const layerNear2 = computed(() => renderLayer(particleCounts.value[4] ?? 100, 'color-mix(in oklch, var(--ui-error) 85%, transparent)', 9, '1px'));

/** Engine roles the lava blobs cycle through — each blob blends two adjacent
 * roles (roleA at index i, roleB at index i+2, see lavaBlobs() below). This
 * order is NOT the same list as Tokens.ALIAS_COLOR_NAMES on purpose — it's a
 * deliberately chosen pairing sequence for which two roles blend into each
 * blob, so it can't be derived from the canonical display order without
 * changing which colors blend together. */
const LAVA_ROLES = ['primary', 'info', 'secondary', 'success', 'warning', 'error'];

interface LavaBlobType { id: string; style: Record<string, string>; }

/**
 * Generates the metaball field: many SMALL discrete globs (not a handful of
 * huge ones) so each reads as an individual blob rising/sinking through the
 * page, per the LofiLamp reference (github.com/Saganaki22/LofiLamp) — base
 * motion is a vertical rise-scale-fall (`lava-rise`), roughly half the blobs
 * add a slow horizontal sway (`lava-sway`) on top, and speed/delay/direction
 * are all per-blob so none of them move in lockstep.
 */
function lavaBlobs(count: number, speedMultiplier: number): LavaBlobType[] {
  const blobs: LavaBlobType[] = [];
  for (let i = 0; i < count; i += 1) {
    const roleA = LAVA_ROLES[i % LAVA_ROLES.length];
    const roleB = LAVA_ROLES[(i + 2) % LAVA_ROLES.length];
    const size = 4 + Math.random() * 5; // vw — small discrete globs, not a wash
    const sway = i % 2 === 0;
    const riseDuration = (18 + Math.random() * 12) / speedMultiplier;
    const swayDuration = 16 / speedMultiplier;
    blobs.push({
      'id': `lava-${i}`,
      'style': {
        'top': `${55 + Math.random() * 40}%`,
        'left': `${Math.random() * 92}%`,
        'width': `${size}vw`,
        'height': `${size}vw`,
        'animationDuration': `${riseDuration}s, ${swayDuration}s`,
        'animationDelay': `-${Math.random() * 20}s, -${Math.random() * 16}s`,
        'animationDirection': `${i % 2 === 0 ? 'alternate' : 'alternate-reverse'}, alternate`,
        '--lava-sway-amt': sway ? `${14 + Math.random() * 14}px` : '0px',
        'background': `linear-gradient(160deg, var(--ui-color-${roleA}-500) 0%, var(--ui-color-${roleB}-500) 100%)`,
      },
    });
  }
  return blobs;
}

const lavaBlobField = computed(() => lavaBlobs(activeAmbient.value.blobCount, activeAmbient.value.speedMultiplier));
const gooEnabled = computed(() => activeAmbient.value.gooEnabled);
const gridEnabled = computed(() => activeAmbient.value.gridEnabled);
/** Inherited by every ambient child via CSS custom property inheritance — grid/star/lava keyframe durations divide by this so 1 reproduces today's exact speeds. */
const ambientStyle = computed(() => ({ '--iridis-ambient-speed': String(activeAmbient.value.speedMultiplier) }));
</script>

<template>
  <div
    class="ambient"
    aria-hidden="true"
    :style="ambientStyle"
  >
    <!--
      The grid is base/shared markup — every theme gets the same node;
      `gridEnabled` (a per-theme knob) only toggles its visibility. `v-show`
      keeps DOM shape identical between server and client (it only ever
      flips `display`), so a persisted theme that disagrees with the
      prerendered default never produces a hydration node mismatch — the
      visibility just updates reactively once the real theme is known.
    -->
    <div
      v-show="gridEnabled"
      class="ambient-grid"
    />

    <!-- gooey lava-lamp wash: heavy blur + a contrast-boosted color matrix
         snaps soft blurred edges back to hard alpha, so overlapping blobs
         visually fuse into one shape instead of just alpha-blending. -->
    <svg
      class="ambient-goo-defs"
      aria-hidden="true"
    >
      <defs>
        <filter
          id="iridis-goo"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="16"
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 16 -6"
            result="goo"
          />
          <!-- blend the contrast-boosted goo result back with the original
               blur so blob edges stay soft, per the LofiLamp reference —
               pure goo output alone over-sharpens at this scale. -->
          <feBlend
            in="SourceGraphic"
            in2="goo"
          />
        </filter>
      </defs>
    </svg>
    <ClientOnly>
      <div
        class="ambient-lava"
        :style="{ filter: gooEnabled ? 'url(#iridis-goo)' : 'none' }"
      >
        <div
          v-for="b in lavaBlobField"
          :key="b.id"
          class="lava-blob"
          :style="b.style"
        />
      </div>

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
  filter: saturate(var(--iridis-ambient-saturate, 1)) contrast(var(--iridis-ambient-contrast, 1));
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
  animation: ambient-grid-pan calc(18s / var(--iridis-ambient-speed, 1)) linear infinite;
}

/* ─── gooey lava-lamp metaball wash (filter applied inline so gooEnabled can toggle it) ─── */
.ambient-goo-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.ambient-lava {
  position: absolute;
  inset: 0;
  opacity: 0.11;
  mix-blend-mode: screen;
  /* belt-and-suspenders: even if any residual filter edge survives at the
     very fringe of the viewport, this guarantees it fades to zero alpha
     before it ever reaches a boundary. */
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, var(--glow) 0%, transparent 92%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, var(--glow) 0%, transparent 92%);
}
/* Small discrete globs that rise/scale/fall through the viewport (primary
   motion) with an optional slow horizontal sway layered on top — the
   LofiLamp motion signature, not just a spinning/drifting wash. */
.lava-blob {
  position: absolute;
  border-radius: 46%;
  animation-name: lava-rise, lava-sway;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform;
}

@keyframes ambient-grid-pan { to { background-position: 0 44px, 44px 0; } }
/* Primary lava-lamp motion: rise from below the viewport, swell at the
   midpoint, keep rising off the top, then reverse (animation-direction is
   set per-blob to alternate/alternate-reverse so they don't all rise in
   sync). Expressed in vh so the travel distance scales with the actual
   viewport instead of the blob's own (tiny) box. */
@keyframes lava-rise {
  0%   { translate: 0 60vh; scale: 1; }
  50%  { translate: 0 -30vh; scale: 1.1; }
  100% { translate: 0 -90vh; scale: 1; }
}
/* Secondary slow horizontal sway, amplitude set per-blob via --lava-sway-amt
   (0px for blobs that shouldn't sway) — layered on top of the rise via a
   second `translate`-independent property (CSS `translate` is its own
   property, separate from `transform`, so the two animations compose). */
@keyframes lava-sway {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(var(--lava-sway-amt)); }
  75%      { transform: translateX(calc(var(--lava-sway-amt) * -1)); }
}

@media (prefers-reduced-motion: reduce) {
  .ambient-grid, .lava-blob {
    animation: none !important;
  }
}
</style>
