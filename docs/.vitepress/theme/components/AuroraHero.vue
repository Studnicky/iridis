<script setup lang="ts">
/**
 * AuroraHero.vue
 *
 * Animated background painted entirely from `--iridis-*` CSS variables.
 * Four overlapping conic-gradient + radial-gradient blobs drift and
 * rotate on independent timings, mixed via screen blend mode so the
 * overlapping regions produce additive hue shifts rather than muddy
 * greys.
 *
 * The blob colors read live from the brand spectrum (violet, indigo,
 * blue, teal, green, yellow, orange, red, magenta) so the aurora
 * stays recognisably iridis regardless of which user palette is
 * driving the rest of the page. Engine-resolved `--iridis-accent` /
 * `--iridis-muted` are layered on top so user choices still tint the
 * field — the brand spectrum is the bass, the engine output is the
 * melody.
 *
 * Slot pass-through renders foreground hero content (title, CTAs)
 * above the aurora; the component itself only owns the moving
 * background and the rounded clipping container.
 */
</script>

<template>
  <ClientOnly>
    <div class="aurora-hero" aria-hidden="false">
      <div class="aurora-hero__bg" aria-hidden="true">
        <div class="aurora-hero__blob aurora-hero__blob--a" />
        <div class="aurora-hero__blob aurora-hero__blob--b" />
        <div class="aurora-hero__blob aurora-hero__blob--c" />
        <div class="aurora-hero__blob aurora-hero__blob--d" />
        <div class="aurora-hero__grain" />
      </div>
      <div class="aurora-hero__content">
        <slot />
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.aurora-hero {
  position: relative;
  overflow: hidden;
  border-radius: var(--iridis-radius-lg, 12px);
  background: var(--vp-c-bg);
  box-shadow:
    inset 0 1px 0 color-mix(in oklch, var(--iridis-brand, #7c3aed) 15%, transparent),
    0 24px 60px -32px color-mix(in oklch, var(--iridis-brand, #7c3aed) 35%, transparent),
    0 6px 18px -10px rgba(0, 0, 0, 0.18);
  isolation: isolate;
}
.aurora-hero__bg {
  position: absolute;
  inset: -10%;
  z-index: 0;
  pointer-events: none;
  filter: blur(60px) saturate(1.2);
}
.aurora-hero__blob {
  position: absolute;
  width: 60%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  mix-blend-mode: screen;
  opacity: 0.85;
  will-change: transform;
}
/* Each blob is a conic gradient spanning four of the brand spectrum
   anchors — overlapping pairs produce live additive hue mixing as the
   blobs rotate against each other. */
.aurora-hero__blob--a {
  top: -15%;
  left: -10%;
  background: conic-gradient(
    from 0deg,
    var(--iridis-violet,  #7c3aed),
    var(--iridis-indigo,  #4f46e5),
    var(--iridis-blue,    #2563eb),
    var(--iridis-teal,    #06b6d4),
    var(--iridis-violet,  #7c3aed)
  );
  animation: aurora-drift-a 22s ease-in-out infinite alternate,
             aurora-spin     38s linear            infinite;
}
.aurora-hero__blob--b {
  top: -20%;
  right: -15%;
  background: conic-gradient(
    from 90deg,
    var(--iridis-magenta, #ec4899),
    var(--iridis-red,     #ef4444),
    var(--iridis-orange,  #f97316),
    var(--iridis-yellow,  #eab308),
    var(--iridis-magenta, #ec4899)
  );
  animation: aurora-drift-b 26s ease-in-out infinite alternate,
             aurora-spin    52s linear reverse infinite;
}
.aurora-hero__blob--c {
  bottom: -25%;
  left: 10%;
  background: conic-gradient(
    from 180deg,
    var(--iridis-teal,    #06b6d4),
    var(--iridis-green,   #10b981),
    var(--iridis-yellow,  #eab308),
    var(--iridis-accent,  var(--iridis-brand, #7c3aed)),
    var(--iridis-teal,    #06b6d4)
  );
  animation: aurora-drift-c 30s ease-in-out infinite alternate,
             aurora-spin    44s linear      infinite;
}
.aurora-hero__blob--d {
  bottom: -10%;
  right: -5%;
  width: 45%;
  background: radial-gradient(
    circle at 35% 35%,
    var(--iridis-accent, var(--iridis-brand, #7c3aed)) 0%,
    color-mix(in oklch, var(--iridis-accent, var(--iridis-brand, #7c3aed)) 35%, transparent) 55%,
    transparent 75%
  );
  opacity: 0.95;
  animation: aurora-drift-d 18s ease-in-out infinite alternate;
}
.aurora-hero__grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Subtle film-grain via a high-frequency SVG noise pattern. Reads
     darker than the rest of the layer so it adds texture without
     washing out the aurora. */
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.08;
  mix-blend-mode: overlay;
}
.aurora-hero__content {
  position: relative;
  z-index: 1;
  padding: 2.5rem 1.75rem 2.25rem;
}

/* ── Guaranteed-contrast text over the live aurora ─────────────────
   The aurora background is animated and colorful — static text colors
   can't guarantee WCAG contrast against the moving blobs at every
   pixel. `mix-blend-mode: difference` solves it mathematically: with
   text painted pure white, every text pixel renders as |255 − bg|,
   the per-channel inverse of whatever the aurora is at that pixel.
   For our saturated-blob aurora that's near-AAA contrast at every
   frame; the only failure mode is bg ≈ mid-grey (~#808080) which the
   aurora rarely hits.
   The faint text-shadow is the safety net for that mid-grey edge:
   the shadow itself blends through difference too, but the dim halo
   shifts effective luminance so even a mid-grey bg pixel gets a
   readable text edge.
   Applied to direct-child h1 and the first paragraph of the slotted
   content so the design carries over to any consumer of AuroraHero
   without per-page inline styles. */
.aurora-hero__content :where(h1, h2, h3, p) {
  color: #ffffff !important;
  mix-blend-mode: difference;
  text-shadow:
    0 0 18px rgba(0, 0, 0, 0.25),
    0 0 2px  rgba(0, 0, 0, 0.4);
  isolation: isolate;
}
/* Links / CTAs inside the hero opt OUT of difference-blend so the
   button glass-chrome stays legible as a button rather than as a
   blended hue swirl. */
.aurora-hero__content :where(a, button) {
  mix-blend-mode: normal;
}
/* ── Responsive content + blur scaling ─────────────────────────── */
@media (max-width: 768px) {
  .aurora-hero__content { padding: 2rem 1.25rem 1.75rem; }
  .aurora-hero__bg      { filter: blur(40px) saturate(1.2); }
}
@media (max-width: 480px) {
  .aurora-hero__content { padding: 1.5rem 1rem 1.35rem; }
  .aurora-hero__bg      { filter: blur(30px) saturate(1.2); }
  .aurora-hero__blob--d { width: 65%; }
}
@keyframes aurora-drift-a {
  from { transform: translate3d(0%,  0%,  0); }
  to   { transform: translate3d(8%,  4%,  0); }
}
@keyframes aurora-drift-b {
  from { transform: translate3d(0%,  0%,  0); }
  to   { transform: translate3d(-6%, 6%,  0); }
}
@keyframes aurora-drift-c {
  from { transform: translate3d(0%,  0%,  0); }
  to   { transform: translate3d(5%,  -8%, 0); }
}
@keyframes aurora-drift-d {
  from { transform: translate3d(0%,  0%,  0) scale(1.0); }
  to   { transform: translate3d(-8%, -5%, 0) scale(1.12); }
}
@keyframes aurora-spin {
  from { rotate: 0deg; }
  to   { rotate: 360deg; }
}
@media (prefers-reduced-motion: reduce) {
  .aurora-hero__blob {
    animation: none !important;
  }
}
</style>
