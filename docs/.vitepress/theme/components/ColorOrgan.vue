<script setup lang="ts">
/**
 * ColorOrgan.vue
 *
 * Aurora-borealis-style background painted from the resolved palette.
 * Vertical curtains of color emanate from the page's central content
 * column and sway outward, heavily blurred so they read as ambient
 * light rather than discrete shapes. Position is fixed full-viewport
 * behind every page chrome layer.
 *
 * Visual recipe (no library, no canvas, no JS animation loop):
 *   - Five tall radial-gradient ribbons positioned around centre x.
 *   - Each ribbon's primary stop is `var(--iridis-{role})` so the
 *     curtain colors track the engine output. Background-coloured
 *     roles (background, bg-soft, surface, divider) are skipped so
 *     ribbons stay visible against the page bg.
 *   - Each ribbon animates on its own translate3d + skew + opacity
 *     timeline at offset phases so the overall field undulates.
 *   - Heavy blur (90–140px) plus `mix-blend-mode: screen` (light
 *     mode) or `lighten` (dark mode) for additive hue mixing where
 *     ribbons overlap.
 *   - Whole layer opacity 0.32 so it's a faint chromatic wash, not a
 *     wallpaper.
 *
 * Respects `prefers-reduced-motion` by suspending the keyframe motion
 * (ribbons remain visible, just stationary). `aria-hidden` because the
 * effect is purely decorative.
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { themeStore } from '../stores/themeDispatcher.ts';

interface RibbonInterface {
  readonly 'roleName': string;
  readonly 'cssVar':   string;
  readonly 'index':    number;
}

/* Skip roles whose color is the page background OR the page foreground
   text — both produce dark/light smudges instead of glowing curtains.
   Aurora ribbons should be chromatic. */
const SKIP_ROLES = new Set([
  'background',
  'bg-soft',
  'surface',
  'divider',
  'on-brand',
  'text',
]);

const projectorVersion = ref<number>(0);

function readResolvedRoles(): string[] {
  if (typeof document === 'undefined') return [];
  const root = document.documentElement;
  const names: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const prop = root.style[i];
    if (prop === undefined || !prop.startsWith('--iridis-')) continue;
    const name = prop.slice('--iridis-'.length);
    if (SKIP_ROLES.has(name)) continue;
    /* Cheap colour-ish check — the projector only writes hex strings
       on iridis-* properties, but a future plugin might publish a
       non-color into the same namespace. Guard against it. */
    const value = root.style.getPropertyValue(prop).trim();
    if (!/^#[0-9a-fA-F]{3,8}$/.test(value)) continue;
    names.push(name);
  }
  return names;
}

watch(
  () => [themeStore.paletteColors, themeStore.framing, themeStore.roleSchema, themeStore.contrastLevel],
  () => {
    requestAnimationFrame(() => { projectorVersion.value += 1; });
  },
  { 'deep': true },
);

onMounted(() => { projectorVersion.value += 1; });

const ribbons = computed<readonly RibbonInterface[]>(() => {
  void projectorVersion.value;
  const roles = readResolvedRoles();
  if (roles.length === 0) return [];
  /* Five ribbons is the sweet spot — enough to feel like a chromatic
     field without becoming a rainbow soup. Picked at evenly-spaced
     offsets so they sample across the role list (so a 16-role schema
     uses ~roles 0, 3, 6, 10, 13). */
  const N = Math.min(5, roles.length);
  const out: RibbonInterface[] = [];
  for (let i = 0; i < N; i++) {
    const roleIdx = Math.min(roles.length - 1, Math.round((i / Math.max(1, N - 1)) * (roles.length - 1)));
    const name = roles[roleIdx] ?? roles[0]!;
    out.push({ 'roleName': name, 'cssVar': `var(--iridis-${name})`, 'index': i });
  }
  return out;
});

/* Listen for the user's reduced-motion preference and pause animation
   if requested. Doesn't unmount — the static ribbons stay visible. */
const reduceMotion = ref<boolean>(false);
let mql: MediaQueryList | null = null;
function syncReduce(): void {
  reduceMotion.value = mql?.matches ?? false;
}
onMounted(() => {
  if (typeof window === 'undefined') return;
  mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  syncReduce();
  mql.addEventListener('change', syncReduce);
});
onUnmounted(() => {
  if (mql) mql.removeEventListener('change', syncReduce);
});
</script>

<template>
  <ClientOnly>
    <div class="color-organ" :class="{ 'color-organ--still': reduceMotion }" aria-hidden="true">
      <div
        v-for="r in ribbons"
        :key="`organ-${r.roleName}`"
        :class="['color-organ__ribbon', `color-organ__ribbon--${r.index}`]"
        :style="{ '--organ-color': r.cssVar }"
      />
    </div>
  </ClientOnly>
</template>

<style scoped>
/* Full-viewport fixed overlay behind every page chrome layer.
   `pointer-events: none` so it never blocks clicks; `z-index: 0`
   places it above the page background but below content (which sits
   on z-index >= 1 throughout the docs theme). */
.color-organ {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  contain: strict;
}

/* Each ribbon is wrapped in a positioning + sway shell; the inner
   `::before` carries the gradient, scale-pulse, and brightness/blur
   breathing. Splitting transform across the wrapper (sway) and the
   pseudo (pulse) lets both timelines run independently without
   stomping each other's transform matrix. */
.color-organ__ribbon {
  position: absolute;
  top: -20%;
  height: 140vh;
  width: 55vw;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.42;
  will-change: transform, opacity;
  transform-origin: 50% 40%;
}
.dark .color-organ__ribbon {
  mix-blend-mode: lighten;
  opacity: 0.50;
}

/* The visible glow is rendered by the pseudo-element so the wrapper
   can carry the sway animation and the pseudo can carry the pulse
   without their transforms competing. */
.color-organ__ribbon::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50% / 25%;
  background: radial-gradient(
    ellipse 38% 72% at 50% 50%,
    color-mix(in oklch, var(--organ-color) 100%, transparent) 0%,
    color-mix(in oklch, var(--organ-color) 62%, transparent) 24%,
    color-mix(in oklch, var(--organ-color) 25%, transparent) 52%,
    transparent 78%
  );
  filter: blur(90px) saturate(1.4) brightness(1.1);
  will-change: transform, filter, opacity;
  transform-origin: 50% 50%;
}

/* Five ribbons positioned around centre. Each sways on its own
   timeline (long period, calm motion) AND pulses on a faster cycle
   (scale + brightness + opacity) so the field reads as living rave
   lights. Aurora-sway carries the wrapper; aurora-pulse carries
   the pseudo. Phase offsets prevent the field from breathing in
   unison — the wave moves across the curtains, not through them all
   simultaneously. */
.color-organ__ribbon--0 {
  left: 50%;
  transform: translateX(-50%) translateX(-32vw);
  animation: aurora-sway-0 28s ease-in-out infinite alternate;
}
.color-organ__ribbon--0::before {
  animation: aurora-pulse 9s ease-in-out infinite alternate;
  animation-delay: 0s;
}
.color-organ__ribbon--1 {
  left: 50%;
  transform: translateX(-50%) translateX(-14vw);
  animation: aurora-sway-1 34s ease-in-out infinite alternate;
}
.color-organ__ribbon--1::before {
  animation: aurora-pulse 11s ease-in-out infinite alternate;
  animation-delay: -2.2s;
  filter: blur(110px) saturate(1.25) brightness(1.05);
}
.color-organ__ribbon--2 {
  left: 50%;
  transform: translateX(-50%);
  width: 70vw;
  animation: aurora-sway-2 42s ease-in-out infinite alternate;
  opacity: 0.34;
}
.dark .color-organ__ribbon--2 { opacity: 0.42; }
.color-organ__ribbon--2::before {
  animation: aurora-pulse 13s ease-in-out infinite alternate;
  animation-delay: -4.5s;
  filter: blur(140px) saturate(1.1) brightness(1.02);
}
.color-organ__ribbon--3 {
  left: 50%;
  transform: translateX(-50%) translateX(14vw);
  animation: aurora-sway-3 36s ease-in-out infinite alternate;
}
.color-organ__ribbon--3::before {
  animation: aurora-pulse 10s ease-in-out infinite alternate;
  animation-delay: -6.8s;
  filter: blur(110px) saturate(1.25) brightness(1.05);
}
.color-organ__ribbon--4 {
  left: 50%;
  transform: translateX(-50%) translateX(30vw);
  animation: aurora-sway-4 30s ease-in-out infinite alternate;
}
.color-organ__ribbon--4::before {
  animation: aurora-pulse 8.5s ease-in-out infinite alternate;
  animation-delay: -1.4s;
}

/* Sway keyframes — slow lateral + vertical + skew drift carried by
   the wrapper. Same shape as before; preserved so existing layout
   timing reads consistently. */
@keyframes aurora-sway-0 {
  0%   { transform: translateX(-50%) translateX(-34vw) translateY(0vh)  skewX(-6deg); }
  50%  { transform: translateX(-50%) translateX(-30vw) translateY(-3vh) skewX(2deg); }
  100% { transform: translateX(-50%) translateX(-28vw) translateY(2vh)  skewX(-3deg); }
}
@keyframes aurora-sway-1 {
  0%   { transform: translateX(-50%) translateX(-16vw) translateY(0vh)  skewX(4deg); }
  50%  { transform: translateX(-50%) translateX(-10vw) translateY(4vh)  skewX(-3deg); }
  100% { transform: translateX(-50%) translateX(-12vw) translateY(-2vh) skewX(6deg); }
}
@keyframes aurora-sway-2 {
  0%   { transform: translateX(-50%) translateY(0vh)  skewX(0deg); }
  50%  { transform: translateX(-50%) translateY(-5vh) skewX(-4deg); }
  100% { transform: translateX(-50%) translateY(3vh)  skewX(4deg); }
}
@keyframes aurora-sway-3 {
  0%   { transform: translateX(-50%) translateX(12vw) translateY(0vh)  skewX(-4deg); }
  50%  { transform: translateX(-50%) translateX(16vw) translateY(3vh)  skewX(2deg); }
  100% { transform: translateX(-50%) translateX(18vw) translateY(-3vh) skewX(-2deg); }
}
@keyframes aurora-sway-4 {
  0%   { transform: translateX(-50%) translateX(32vw) translateY(0vh)  skewX(5deg); }
  50%  { transform: translateX(-50%) translateX(28vw) translateY(-4vh) skewX(-3deg); }
  100% { transform: translateX(-50%) translateX(26vw) translateY(3vh)  skewX(3deg); }
}

/* Pulse keyframe — scale + brightness + saturate + opacity all
   oscillate on the same cycle so the curtain feels like it's
   inhaling and exhaling. `scaleY` carries the "grow"; `scaleX`
   stays subtle so the ribbon doesn't visibly widen across page
   chrome. Brightness lifts to 1.4 at peak so the curtain looks
   electrified at the crest. */
@keyframes aurora-pulse {
  0% {
    transform: scale(0.85, 0.78);
    opacity: 0.55;
    filter: blur(110px) saturate(1.15) brightness(0.85);
  }
  50% {
    transform: scale(1.06, 1.18);
    opacity: 1.0;
    filter: blur(80px) saturate(1.7) brightness(1.4);
  }
  100% {
    transform: scale(0.92, 0.88);
    opacity: 0.7;
    filter: blur(100px) saturate(1.3) brightness(1.0);
  }
}

.color-organ--still .color-organ__ribbon,
.color-organ--still .color-organ__ribbon::before {
  animation: none !important;
}
@media (prefers-reduced-motion: reduce) {
  .color-organ__ribbon,
  .color-organ__ribbon::before { animation: none !important; }
}

/* ── Responsiveness ──────────────────────────────────────────────
   Tablet (≤960px): widen the curtains slightly to compensate for the
   narrower viewport so the centre column still reads as the source.
   Mobile (≤640px): collapse to fewer effective curtains by tightening
   ribbons 0 and 4 against the centre. Phone (≤420px): drop blur radius
   so weaker GPUs (mid-range phones) keep 60fps. */
@media (max-width: 960px) {
  .color-organ__ribbon         { width: 70vw; }
  .color-organ__ribbon--2      { width: 90vw; }
  .color-organ__ribbon::before { filter: blur(80px) saturate(1.4) brightness(1.1); }
}
@media (max-width: 640px) {
  .color-organ__ribbon--0,
  .color-organ__ribbon--4      { width: 80vw; }
  .color-organ__ribbon--0      { transform: translateX(-50%) translateX(-18vw); animation: aurora-sway-mobile-a 26s ease-in-out infinite alternate; }
  .color-organ__ribbon--4      { transform: translateX(-50%) translateX(18vw);  animation: aurora-sway-mobile-b 30s ease-in-out infinite alternate; }
  .color-organ__ribbon--1,
  .color-organ__ribbon--3      { display: none; }
  .color-organ__ribbon::before { filter: blur(60px) saturate(1.4) brightness(1.1); }
}
@media (max-width: 420px) {
  .color-organ__ribbon::before { filter: blur(40px) saturate(1.35) brightness(1.1); }
}
@keyframes aurora-sway-mobile-a {
  0%   { transform: translateX(-50%) translateX(-20vw) translateY(0vh)  skewX(-4deg); }
  100% { transform: translateX(-50%) translateX(-14vw) translateY(3vh)  skewX(2deg); }
}
@keyframes aurora-sway-mobile-b {
  0%   { transform: translateX(-50%) translateX(20vw)  translateY(0vh)  skewX(4deg); }
  100% { transform: translateX(-50%) translateX(14vw)  translateY(-3vh) skewX(-2deg); }
}
</style>
