<script setup lang="ts">
/**
 * Backroads logo background — a lone bird silhouette occasionally wings
 * across behind the eye, distinct from the ambient backdrop's drifting dust
 * motes. The flight itself occupies only a short window of a long, mostly
 * idle cycle so it reads as a rare, rustic flourish rather than a loop.
 */
</script>

<template>
  <div
    class="logo-bird"
    aria-hidden="true"
  >
    <svg
      class="logo-bird-shape"
      viewBox="0 0 32 16"
      width="32"
      height="16"
    >
      <path d="M0 8 Q8 -4 16 8 Q24 -4 32 8 Q24 4 16 8 Q8 4 0 8 Z" />
    </svg>
  </div>
</template>

<style scoped>
.logo-bird {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.logo-bird-shape {
  position: absolute;
  top: 22%;
  left: -2rem;
  fill: color-mix(in oklch, var(--ui-color-neutral-900) 80%, transparent);
  animation: logo-bird-flyby 30s linear infinite;
}
@keyframes logo-bird-flyby {
  0%   { transform: translate(0, 0); opacity: 0; }
  1%   { opacity: 1; }
  8%   { transform: translate(14rem, -1.5rem); opacity: 1; }
  9%   { opacity: 0; }
  100% { transform: translate(14rem, -1.5rem); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-bird-shape { animation: none; opacity: 0; }
}
</style>
