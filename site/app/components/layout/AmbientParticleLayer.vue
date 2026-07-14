<script setup lang="ts">
import type { ParticleRenderOutputType } from '~/theme/particles/index.ts';

/**
 * One starfield layer, rendering whichever `ParticleRenderOutputType` its
 * shape's adapter (site/app/theme/particles/*.ts) produced — a `boxShadow`
 * string (the 'dot' shape's cheap hundreds-in-one-paint trick) or real
 * positioned `elements` (every other shape, since a box-shadow always takes
 * its casting element's own shape). `layerClass` selects this instance's own
 * twinkle/rotate animation timing (below) — this component (not
 * AmbientBackground.vue) owns that CSS because Vue's `scoped` styles only
 * bind to elements the OWNING SFC renders; since this wrapper div is now
 * rendered here, its styling must live here too.
 */
defineProps<{ 'layerClass': string; 'layer': ParticleRenderOutputType }>();
</script>

<template>
  <div
    v-if="layer.kind === 'boxShadow'"
    :class="layerClass"
    :style="{ boxShadow: layer.boxShadow }"
  />
  <div
    v-else
    :class="layerClass"
  >
    <span
      v-for="p in layer.elements"
      :key="p.id"
      class="particle"
      :class="p.glyph ? 'particle-glyph' : 'particle-shape'"
      :style="p.style"
    >{{ p.glyph }}</span>
  </div>
</template>

<style scoped>
.star-layer {
  position: absolute;
  top: 0; left: 0;
  width: 1.5px; height: 1.5px;
  background: transparent;
  border-radius: 50%;
  transform-origin: 50vw 50vh;
}
.star-far-1 { animation: ambient-twinkle calc(4s / var(--iridis-ambient-speed, 1)) ease-in-out infinite, star-rotate calc(200s / var(--iridis-ambient-speed, 1)) linear infinite; }
.star-far-2 { animation: ambient-twinkle calc(5s / var(--iridis-ambient-speed, 1)) ease-in-out infinite 2s, star-rotate calc(300s / var(--iridis-ambient-speed, 1)) linear infinite reverse; }
.star-far-3 { animation: ambient-twinkle calc(6s / var(--iridis-ambient-speed, 1)) ease-in-out infinite 1s, star-rotate calc(400s / var(--iridis-ambient-speed, 1)) linear infinite; }

.star-near-1 { width: 3px; height: 3px; animation: ambient-twinkle calc(3.5s / var(--iridis-ambient-speed, 1)) ease-in-out infinite reverse, star-rotate calc(150s / var(--iridis-ambient-speed, 1)) linear infinite reverse; }
.star-near-2 { width: 3px; height: 3px; animation: ambient-twinkle calc(4.5s / var(--iridis-ambient-speed, 1)) ease-in-out infinite reverse 1.5s, star-rotate calc(250s / var(--iridis-ambient-speed, 1)) linear infinite; }

/* Non-dot particle shapes — real positioned elements, translated back by
   half their own size so the vw/vh coordinate is the shape's CENTER,
   matching where a box-shadow dot at the same offset would have landed. */
.particle { position: absolute; pointer-events: none; line-height: 1; }
.particle-glyph { transform: translate(-50%, -50%); }
/* Non-glyph shapes (square/streak) supply their own full transform (translate + rotate) inline — this is just the fallback if a future shape omits one. */
.particle-shape { transform: translate(-50%, -50%); border-radius: 2px; }

@keyframes ambient-twinkle { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.95; } }
@keyframes star-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .star-layer { animation: none !important; }
}
</style>
