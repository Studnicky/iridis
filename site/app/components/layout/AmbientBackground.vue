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

/** One box-shadow entry per star: a viewport-relative dot so the field scales with the window instead of clipping on a fixed px canvas. */
function starField(count: number, colorVar: string, blur: string = '0'): string {
  const dots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() * 100).toFixed(2);
    const y = (Math.random() * 100).toFixed(2);
    dots.push(`${x}vw ${y}vh ${blur} ${colorVar}`);
  }
  return dots.join(',');
}

const starsFar1 = starField(120, 'color-mix(in oklch, var(--ui-text) 75%, transparent)', '0');
const starsFar2 = starField(120, 'color-mix(in oklch, var(--ui-text) 60%, transparent)', '0');
const starsFar3 = starField(120, 'color-mix(in oklch, var(--ui-text) 85%, transparent)', '0');

const starsNear1 = starField(70, 'color-mix(in oklch, var(--ui-primary) 95%, transparent)', '1px');
const starsNear2 = starField(70, 'color-mix(in oklch, var(--ui-primary) 80%, transparent)', '1px');

/** Engine roles the lava blobs cycle through — each blob blends two adjacent roles. */
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
function lavaBlobs(count: number): LavaBlobType[] {
  const blobs: LavaBlobType[] = [];
  for (let i = 0; i < count; i += 1) {
    const roleA = LAVA_ROLES[i % LAVA_ROLES.length];
    const roleB = LAVA_ROLES[(i + 2) % LAVA_ROLES.length];
    const size = 4 + Math.random() * 5; // vw — small discrete globs, not a wash
    const sway = i % 2 === 0;
    blobs.push({
      'id': `lava-${i}`,
      'style': {
        'top': `${55 + Math.random() * 40}%`,
        'left': `${Math.random() * 92}%`,
        'width': `${size}vw`,
        'height': `${size}vw`,
        'animationDuration': `${18 + Math.random() * 12}s, 16s`,
        'animationDelay': `-${Math.random() * 20}s, -${Math.random() * 16}s`,
        'animationDirection': `${i % 2 === 0 ? 'alternate' : 'alternate-reverse'}, alternate`,
        '--lava-sway-amt': sway ? `${14 + Math.random() * 14}px` : '0px',
        'background': `linear-gradient(160deg, var(--ui-color-${roleA}-500) 0%, var(--ui-color-${roleB}-500) 100%)`,
      },
    });
  }
  return blobs;
}

const lavaBlobField = lavaBlobs(18);
</script>

<template>
  <div
    class="ambient"
    aria-hidden="true"
  >
    <div class="ambient-grid" />

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
      <div class="ambient-lava">
        <div
          v-for="b in lavaBlobField"
          :key="b.id"
          class="lava-blob"
          :style="b.style"
        />
      </div>

      <div class="star-layer star-far-1" :style="{ boxShadow: starsFar1 }" />
      <div class="star-layer star-far-2" :style="{ boxShadow: starsFar2 }" />
      <div class="star-layer star-far-3" :style="{ boxShadow: starsFar3 }" />

      <div class="star-layer star-near-1" :style="{ boxShadow: starsNear1 }" />
      <div class="star-layer star-near-2" :style="{ boxShadow: starsNear2 }" />
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
}

/* ─── perspective grid floor ─── */
.ambient-grid {
  position: absolute;
  inset: -50% 0 0 0;
  background-image:
    linear-gradient(color-mix(in oklch, var(--ui-primary) 22%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in oklch, var(--ui-primary) 22%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, #000 10%, transparent 70%);
  opacity: 0.1;
  animation: ambient-grid-pan 18s linear infinite;
}

/* ─── gooey lava-lamp metaball wash ─── */
.ambient-goo-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.ambient-lava {
  position: absolute;
  inset: 0;
  filter: url('#iridis-goo');
  opacity: 0.11;
  mix-blend-mode: screen;
  /* belt-and-suspenders: even if any residual filter edge survives at the
     very fringe of the viewport, this guarantees it fades to zero alpha
     before it ever reaches a boundary. */
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 0%, transparent 92%);
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 0%, transparent 92%);
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

/* ─── twinkling starfield ─── */
.star-layer {
  position: absolute;
  top: 0; left: 0;
  width: 1.5px; height: 1.5px;
  background: transparent;
  border-radius: 50%;
  transform-origin: 50vw 50vh;
}
.star-far-1 { animation: ambient-twinkle 6s ease-in-out infinite, star-rotate 400s linear infinite; }
.star-far-2 { animation: ambient-twinkle 8s ease-in-out infinite 3s, star-rotate 500s linear infinite reverse; }
.star-far-3 { animation: ambient-twinkle 10s ease-in-out infinite 1s, star-rotate 600s linear infinite; }

.star-near-1 { width: 2.5px; height: 2.5px; animation: ambient-twinkle 5s ease-in-out infinite reverse, star-rotate 250s linear infinite reverse; }
.star-near-2 { width: 2.5px; height: 2.5px; animation: ambient-twinkle 7s ease-in-out infinite reverse 2s, star-rotate 350s linear infinite; }

@keyframes ambient-grid-pan { to { background-position: 0 44px, 44px 0; } }
@keyframes ambient-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
@keyframes star-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
  .ambient-grid, .lava-blob, .star-far-1, .star-far-2, .star-far-3, .star-near-1, .star-near-2 {
    animation: none !important;
  }
}
</style>
