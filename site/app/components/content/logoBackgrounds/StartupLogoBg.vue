<script setup lang="ts">
/**
 * Startup logo background — small soap-bubble rings rising from the base of
 * the logo box and popping (scale + fade) as they exit the top, echoing the
 * ambient bubble particle's rise energy but scaled to fit the small logo
 * wrapper (rem-based travel, not viewport units) and staggered per bubble so
 * they never move in lockstep.
 */
import { buildStaggeredItems } from '~/utils/staggeredItems';

const BUBBLE_ROLES = ['primary', 'info', 'primary', 'success', 'info', 'primary'];
const BUBBLE_COUNT = 6;

interface RisingBubbleType { 'id': string; 'style': Record<string, string>; }

const bubbles: RisingBubbleType[] = buildStaggeredItems('logo-bubble', BUBBLE_COUNT, BUBBLE_ROLES).map(({ id, index: i, role }) => {
  const size = 0.45 + (i % 3) * 0.18;
  const duration = 5.2 + i * 0.9;
  const left = 8 + (i * 15) % 84;
  const drift = (i % 2 === 0 ? 1 : -1) * (0.4 + (i % 3) * 0.3);
  return {
    id,
    'style': {
      'animationDelay':    `-${i * 1.4}s`,
      'animationDuration': `${duration}s`,
      'borderColor':       `color-mix(in oklch, var(--ui-color-${role}-500) 70%, transparent)`,
      'bottom':            '-0.5rem',
      'height':            `${size}rem`,
      'left':              `${left}%`,
      'width':             `${size}rem`,
      '--bubble-drift':    `${drift}rem`,
      '--bubble-highlight': `var(--ui-color-${role}-500)`
    } as Record<string, string>
  };
});
</script>

<template>
  <div
    class="logo-bubbles"
    aria-hidden="true"
  >
    <span
      v-for="b in bubbles"
      :key="b.id"
      class="logo-bubble"
      :style="b.style"
    />
  </div>
</template>

<style scoped>
.logo-bubbles { position: absolute; inset: 0; overflow: hidden; }
.logo-bubble {
  position: absolute;
  border-radius: 50%;
  border-width: 1px;
  border-style: solid;
  background: radial-gradient(circle at 32% 28%,
    color-mix(in oklch, var(--bubble-highlight) 60%, white) 0%,
    color-mix(in oklch, var(--bubble-highlight) 18%, transparent) 45%,
    transparent 75%);
  animation-name: logo-bubble-rise;
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}
@keyframes logo-bubble-rise {
  0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
  10%  { opacity: 0.85; }
  80%  { transform: translate(var(--bubble-drift), -8.5rem) scale(1); opacity: 0.7; }
  92%  { transform: translate(var(--bubble-drift), -9.6rem) scale(1.5); opacity: 0.35; }
  100% { transform: translate(var(--bubble-drift), -10rem) scale(1.8); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-bubble { animation: none; opacity: 0.4; transform: none; }
}
</style>
