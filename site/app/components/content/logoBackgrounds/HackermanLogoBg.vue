<script setup lang="ts">
/**
 * Hackerman logo background — a rare comet streak that shoots across the
 * logo box once every ~20s (active for only the first ~10% of its keyframe
 * cycle, invisible the rest of the time), layered under a continuously
 * scrolling CRT scanline tint. Matches hackerman's terminal/phosphor read
 * without hardcoding a "terminal green" — both effects use the engine's
 * success role, same restraint hackerman.css applies to its own glow.
 */
</script>

<template>
  <div
    class="logo-hackerman"
    aria-hidden="true"
  >
    <div class="logo-hackerman-scanlines" />
    <div class="logo-hackerman-comet" />
  </div>
</template>

<style scoped>
.logo-hackerman { position: absolute; inset: 0; overflow: hidden; }

.logo-hackerman-scanlines {
  position: absolute;
  inset: -20% 0;
  background: repeating-linear-gradient(
    to bottom,
    var(--ui-color-success-500) 0px,
    var(--ui-color-success-500) 1px,
    transparent 1px,
    transparent 5px
  );
  opacity: 0.1;
  animation: logo-hackerman-roll 3.4s linear infinite;
}

.logo-hackerman-comet {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 1.6rem;
  height: 0.12rem;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    transparent 0%,
    var(--ui-color-success-500) 60%,
    color-mix(in oklch, var(--ui-color-success-500) 90%, white) 100%
  );
  transform: rotate(28deg);
  opacity: 0;
  animation: logo-hackerman-comet 20s linear infinite;
}

@keyframes logo-hackerman-roll {
  0%   { transform: translateY(-20%); }
  100% { transform: translateY(0%); }
}

@keyframes logo-hackerman-comet {
  0%   { opacity: 0; translate: 0 0; }
  1%   { opacity: 1; }
  9%   { opacity: 1; translate: 9rem 9rem; }
  10%  { opacity: 0; translate: 9.2rem 9.2rem; }
  100% { opacity: 0; translate: 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .logo-hackerman-scanlines { animation: none; }
  .logo-hackerman-comet { animation: none; opacity: 0; }
}
</style>
