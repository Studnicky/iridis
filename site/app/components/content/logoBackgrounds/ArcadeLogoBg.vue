<script setup lang="ts">
/**
 * Arcade logo background — chunky, sharp-edged pixel blocks scattered around
 * the logo perimeter that hard-cut on/off (steps(1) timing, no ease) like an
 * 8-bit sprite blink, each on its own offset so the ring flashes in a retro
 * chase pattern rather than all at once.
 */
import { buildStaggeredItems } from '~/utils/buildStaggeredItems';

const PIXEL_ROLES = ['primary', 'success', 'warning', 'error', 'info', 'secondary', 'primary', 'success'];
const PIXEL_COUNT = 8;

interface PixelBlockType { 'id': string; 'style': Record<string, string>; }

const pixels: PixelBlockType[] = buildStaggeredItems('logo-pixel', PIXEL_COUNT, PIXEL_ROLES).map(({ id, index: i, role }) => {
  const angle = (i / PIXEL_COUNT) * 360;
  const radius = i % 2 === 0 ? 5.6 : 4.6;
  const rad = (angle * Math.PI) / 180;
  const x = 50 + radius * Math.cos(rad) * 4.2;
  const y = 50 + radius * Math.sin(rad) * 4.2;
  const size = 0.5 + (i % 3) * 0.15;
  const duration = 0.4 + (i % 4) * 0.1;
  return {
    id,
    'style': {
      'animationDelay':    `-${i * 0.09}s`,
      'animationDuration': `${duration}s`,
      'background':        `var(--ui-color-${role}-500)`,
      'height':            `${size}rem`,
      'left':              `${x}%`,
      'top':               `${y}%`,
      'width':             `${size}rem`
    }
  };
});
</script>

<template>
  <div
    class="logo-pixels"
    aria-hidden="true"
  >
    <span
      v-for="p in pixels"
      :key="p.id"
      class="logo-pixel"
      :style="p.style"
    />
  </div>
</template>

<style scoped>
.logo-pixels { position: absolute; inset: 0; }
.logo-pixel {
  position: absolute;
  border-radius: 0;
  animation-name: logo-pixel-blink;
  animation-timing-function: steps(1, jump-start);
  animation-iteration-count: infinite;
  will-change: opacity;
}
@keyframes logo-pixel-blink {
  0%   { opacity: 1; }
  50%  { opacity: 0; }
  100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-pixel { animation: none; opacity: 0.7; }
}
</style>
