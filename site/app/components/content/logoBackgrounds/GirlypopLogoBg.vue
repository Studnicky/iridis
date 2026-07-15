<script setup lang="ts">
/**
 * Girlypop logo background — a handful of small heart shapes (two circles
 * plus a rotated square), drifting in lazy bobbing arcs around the logo,
 * staggered so they never move in lockstep. Echoes girlypop.ts's bubbly, heart-shaped
 * ambient particles but as a tight local cluster hugging the eye rather
 * than the full-viewport rise.
 */
import { buildStaggeredItems } from '~/utils/staggeredItems';

const HEART_ROLES = ['secondary', 'primary', 'warning', 'success', 'info'];

interface HeartType { 'id': string; 'style': Record<string, string>; }

const hearts: HeartType[] = buildStaggeredItems('logo-heart', HEART_ROLES.length, HEART_ROLES).map(({ id, index: i, role }) => {
  const size = 0.6 + (i % 3) * 0.14;
  const duration = 6.5 + i * 1.3;
  const positions = [
    { 'left': '6%', 'top': '10%' },
    { 'left': '78%', 'top': '4%' },
    { 'left': '84%', 'top': '68%' },
    { 'left': '2%', 'top': '72%' },
    { 'left': '46%', 'top': '-6%' }
  ];
  const pos = positions[i % positions.length]!;
  return {
    id,
    'style': {
      'animationDelay':    `-${i * 1.7}s`,
      'animationDuration': `${duration}s`,
      'background':        `var(--ui-color-${role}-500)`,
      'height':            `${size}rem`,
      'left':               pos.left,
      'top':                pos.top,
      'width':              `${size}rem`
    }
  };
});
</script>

<template>
  <div
    class="logo-hearts"
    aria-hidden="true"
  >
    <span
      v-for="h in hearts"
      :key="h.id"
      class="logo-hearts-heart"
      :style="h.style"
    />
  </div>
</template>

<style scoped>
.logo-hearts { position: absolute; inset: 0; }

.logo-hearts-heart {
  position: absolute;
  transform: translate(-50%, -50%) rotate(-45deg) scale(1);
  animation-name: logo-hearts-bob;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  opacity: 0.85;
}
.logo-hearts-heart::before,
.logo-hearts-heart::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  background: inherit;
  border-radius: 50%;
}
.logo-hearts-heart::before { top: -50%; left: 0; }
.logo-hearts-heart::after { top: 0; left: 50%; }

@keyframes logo-hearts-bob {
  0%   { transform: translate(-50%, -50%) rotate(-45deg) translate(0, 0) scale(1); }
  25%  { transform: translate(-50%, -50%) rotate(-45deg) translate(0.3rem, -0.5rem) scale(1.08); }
  50%  { transform: translate(-50%, -50%) rotate(-45deg) translate(-0.2rem, -0.9rem) scale(0.96); }
  75%  { transform: translate(-50%, -50%) rotate(-45deg) translate(-0.4rem, -0.3rem) scale(1.05); }
  100% { transform: translate(-50%, -50%) rotate(-45deg) translate(0, 0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .logo-hearts-heart { animation: none; }
}
</style>
