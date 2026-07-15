<script setup lang="ts">
/**
 * Streamer logo background — the loud exception among the themes: a ring of
 * 4-pointed spark stars pop and burst around the logo perimeter on staggered
 * loops (echoing streamer.css's own particle-burst timing), plus a bright
 * alert-glow ring pulsing at the logo's edge (its own selector/keyframes,
 * distinct from the ambient pseudo-element pulse, but matching its voice).
 */
import { buildStaggeredItems } from '~/utils/staggeredItems';

const SPARK_ROLES = ['error', 'primary', 'error', 'primary', 'error', 'primary'];

interface SparkType { 'id': string; 'style': Record<string, string>; }

const sparks: SparkType[] = buildStaggeredItems('logo-spark', SPARK_ROLES.length, SPARK_ROLES).map(({ id, index: i, role }) => {
  const angle = (360 / SPARK_ROLES.length) * i;
  const radius = 4.4 + (i % 2) * 0.6;
  const duration = 0.7 + (i % 3) * 0.1;
  const delay = i * 0.32;
  return {
    id,
    'style': {
      'animationDelay':    `-${delay}s`,
      'animationDuration': `${duration}s`,
      'background':        `var(--ui-color-${role}-500)`,
      'transform':         `rotate(${angle}deg) translateY(-${radius}rem)`
    }
  };
});
</script>

<template>
  <div
    class="logo-streamer-fx"
    aria-hidden="true"
  >
    <span class="logo-streamer-ring" />
    <div class="logo-streamer-sparks">
      <span
        v-for="s in sparks"
        :key="s.id"
        class="logo-streamer-spark"
        :style="s.style"
      />
    </div>
  </div>
</template>

<style scoped>
.logo-streamer-fx { position: absolute; inset: 0; }
.logo-streamer-ring {
  position: absolute;
  inset: 0.4rem;
  border-radius: 50%;
  border: 2px solid var(--ui-color-error-500);
  box-shadow: 0 0 0.6rem var(--ui-color-error-500), 0 0 1.2rem color-mix(in oklch, var(--ui-color-error-500) 60%, transparent);
  animation: logo-streamer-ring-pulse 1.2s ease-in-out infinite;
}
.logo-streamer-sparks {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-streamer-spark {
  position: absolute;
  width: 0.5rem;
  height: 0.5rem;
  clip-path: polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%);
  opacity: 0;
  animation-name: logo-streamer-burst;
  animation-timing-function: ease-out;
  animation-iteration-count: infinite;
}
@keyframes logo-streamer-ring-pulse {
  0%, 100% { opacity: 0.5; box-shadow: 0 0 0.4rem var(--ui-color-error-500); }
  50%      { opacity: 1;   box-shadow: 0 0 1rem var(--ui-color-error-500), 0 0 1.8rem color-mix(in oklch, var(--ui-color-error-500) 70%, transparent); }
}
@keyframes logo-streamer-burst {
  0%   { scale: 0.2; opacity: 0; }
  15%  { opacity: 1; }
  50%  { scale: 1.3; opacity: 0.9; }
  100% { scale: 1.9; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-streamer-ring { animation: none; opacity: 0.6; }
  .logo-streamer-spark { animation: none; opacity: 0; }
}
</style>
