<script setup lang="ts">
/**
 * Romance logo background — a sparse scatter of petals drifting past the eye
 * on a lazy diagonal, rotating slowly as they fall. Staggered durations and
 * delays keep at most one or two visible at once (an unhurried trickle, not
 * a shower), in soft muted engine tones with no glow/blur halo.
 */
import { buildStaggeredItems } from '~/utils/buildStaggeredItems';

const PETAL_ROLES = ['secondary', 'primary', 'secondary', 'primary'];

interface PetalType { 'id': string; 'style': Record<string, string>; }

const petals: PetalType[] = buildStaggeredItems('logo-petal', PETAL_ROLES.length, PETAL_ROLES).map(({ id, index: i, role }) => {
  const duration = 15 + i * 2.4;
  const delay = i * 4.5;
  const startLeft = 8 + i * 22;
  const size = 0.55 + (i % 2) * 0.15;
  return {
    id,
    'style': {
      'animationDelay':    `-${delay}s`,
      'animationDuration': `${duration}s`,
      'background':        `color-mix(in oklch, var(--ui-color-${role}-500) 65%, transparent)`,
      'height':            `${size * 1.5}rem`,
      'left':              `${startLeft}%`,
      'width':             `${size}rem`
    }
  };
});
</script>

<template>
  <div
    class="logo-petals"
    aria-hidden="true"
  >
    <span
      v-for="p in petals"
      :key="p.id"
      class="logo-petal"
      :style="p.style"
    />
  </div>
</template>

<style scoped>
.logo-petals { position: absolute; inset: 0; overflow: visible; }
.logo-petal {
  position: absolute;
  top: -1.2rem;
  border-radius: 0 100% 0 100%;
  opacity: 0;
  animation-name: logo-petal-fall;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
@keyframes logo-petal-fall {
  0%   { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  8%   { opacity: 0.85; }
  50%  { transform: translate(2.2rem, 8rem) rotate(160deg); opacity: 0.7; }
  92%  { opacity: 0.3; }
  100% { transform: translate(3.6rem, 15rem) rotate(320deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-petal { animation: none; opacity: 0.4; top: 30%; }
}
</style>
