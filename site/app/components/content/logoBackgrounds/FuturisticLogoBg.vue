<script setup lang="ts">
/**
 * Futuristic logo background — the SAME lava-glob visual as
 * AmbientBackground.vue's metaball wash (gooey blend, two-role engine
 * gradient per blob), just orbiting the eye logo in a tight ellipse instead
 * of rising across the viewport. Literal blob shapes only — never a
 * glow/blur halo.
 */
import { buildStaggeredItems } from '~/utils/staggeredItems';

const LAVA_ROLES = ['primary', 'info', 'secondary', 'success', 'warning', 'error'];
const BLOB_COUNT = 5;

interface OrbitBlobType { 'id': string; 'style': Record<string, string>; }

const blobs: OrbitBlobType[] = buildStaggeredItems('logo-lava', BLOB_COUNT, LAVA_ROLES).map(({ id, index: i, role: roleA }) => {
  const roleB = LAVA_ROLES[(i + 2) % LAVA_ROLES.length];
  const size = 1.1 + (i % 3) * 0.35;
  const duration = 10 + i * 2.6;
  const radius = 5.2 + i * 0.85;
  return {
    id,
    'style': {
      'animationDelay':     `-${i * 3.1}s`,
      'animationDirection': i % 2 === 0 ? 'normal' : 'reverse',
      'animationDuration':  `${duration}s`,
      'background':         `linear-gradient(160deg, var(--ui-color-${roleA}-500) 0%, var(--ui-color-${roleB}-500) 100%)`,
      'height':             `${size}rem`,
      'offsetPath':         `circle(${radius}rem at 50% 50%)`,
      'width':              `${size}rem`
    }
  };
});
</script>

<template>
  <div
    class="logo-lava"
    aria-hidden="true"
  >
    <svg
      class="logo-lava-goo-defs"
      aria-hidden="true"
    >
      <defs>
        <filter
          id="iridis-logo-goo"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="6"
            result="blur"
          />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 20 -8"
            result="goo"
          />
          <feBlend
            in="SourceGraphic"
            in2="goo"
          />
        </filter>
      </defs>
    </svg>
    <div
      class="logo-lava-field"
      style="filter: url(#iridis-logo-goo)"
    >
      <div
        v-for="b in blobs"
        :key="b.id"
        class="logo-lava-blob"
        :style="b.style"
      />
    </div>
  </div>
</template>

<style scoped>
.logo-lava { position: absolute; inset: 0; }
.logo-lava-goo-defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.logo-lava-field { position: absolute; inset: 0; mix-blend-mode: screen; }
.logo-lava-blob {
  position: absolute;
  border-radius: 46%;
  animation-name: logo-lava-orbit;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  offset-rotate: 0deg;
  will-change: offset-distance;
}
@keyframes logo-lava-orbit {
  from { offset-distance: 0%; }
  to   { offset-distance: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .logo-lava-blob { animation: none; }
}
</style>
