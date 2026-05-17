<script setup lang="ts">
/**
 * IridisCursorBlob.vue
 *
 * Soft glow that tracks the cursor. Position is written to two CSS
 * custom properties (`--iridis-cursor-x`, `--iridis-cursor-y`) on the
 * root element on every pointermove; the blob's transform reads them.
 * No requestAnimationFrame loop — the browser's compositor smoothly
 * interpolates the transform between pointer events.
 *
 * Painted from `--iridis-brand` (engine-resolved role) — that's the
 * variable every iridis-N schema exposes, so the blob is always tinted
 * even on minimal schemas. Hidden on coarse-pointer devices (touch)
 * where a cursor doesn't exist. Pointer-events disabled so it never
 * blocks clicks or selections.
 */
import { onMounted, onUnmounted } from 'vue';

function onMove(ev: PointerEvent): void {
  const html = document.documentElement;
  html.style.setProperty('--iridis-cursor-x', `${ev.clientX}px`);
  html.style.setProperty('--iridis-cursor-y', `${ev.clientY}px`);
}

onMounted(() => {
  if (typeof window === 'undefined') return;
  window.addEventListener('pointermove', onMove, { 'passive': true });
});
onUnmounted(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('pointermove', onMove);
});
</script>

<template>
  <ClientOnly>
    <div class="iridis-cursor-blob" aria-hidden="true" />
  </ClientOnly>
</template>

<style scoped>
.iridis-cursor-blob {
  position: fixed;
  pointer-events: none;
  top: 0;
  left: 0;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  z-index: 1;   /* above page bg, below content layers */
  transform: translate3d(
    calc(var(--iridis-cursor-x, 50vw) - 140px),
    calc(var(--iridis-cursor-y, 50vh) - 140px),
    0
  );
  background: radial-gradient(
    circle at center,
    color-mix(in oklch, var(--iridis-brand, #7c3aed) 38%, transparent) 0%,
    color-mix(in oklch, var(--iridis-brand, #7c3aed) 18%, transparent) 35%,
    transparent 70%
  );
  filter: blur(40px);
  opacity: 0.55;
  mix-blend-mode: screen;
  transition: opacity 260ms ease;
  will-change: transform;
}
.dark .iridis-cursor-blob {
  mix-blend-mode: lighten;
  opacity: 0.45;
}
/* Coarse pointers (touch) don't have a hover cursor — hiding the blob
   prevents a permanent stuck spotlight at the last tap location. */
@media (pointer: coarse) {
  .iridis-cursor-blob { display: none; }
}
/* Respect users who opted out of motion. The blob itself doesn't
   animate, but cursor-following motion can be uncomfortable for
   vestibular sensitivity. */
@media (prefers-reduced-motion: reduce) {
  .iridis-cursor-blob { display: none; }
}
</style>
