<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';

/**
 * Hero. The iridis logo, an engine-lit title, and floating palette orbs — all
 * colored from the live --ui-* tokens so the hero itself is engine output.
 */
useIridis();
const base = useRuntimeConfig().app.baseURL;
const orbs = ['primary', 'info', 'success', 'error', 'warning'];
const halo = ['primary', 'info', 'success', 'warning', 'error', 'secondary'];
</script>

<template>
  <section class="relative overflow-hidden rounded-3xl px-6 pt-12 pb-8 sm:pt-16">
    <!-- floating engine-colored orbs. Masked to fade to zero opacity well
         before the section's own overflow-hidden edge, so the clip boundary
         is never crossed at visible alpha — no hard seam. -->
    <div class="hero-orb-field pointer-events-none absolute inset-0 -z-10">
      <div
        v-for="(o, i) in orbs"
        :key="o"
        class="float absolute rounded-full blur-2xl"
        :style="{
          backgroundColor: `color-mix(in oklch, var(--ui-color-${o}-500) 45%, transparent)`,
          width: `${7 + i * 3}rem`, height: `${7 + i * 3}rem`,
          left: `${8 + i * 20}%`, top: `${i % 2 ? 50 : 8}%`,
          animationDelay: `${i * 0.9}s`, opacity: 0.45,
        }"
      />
    </div>

    <div class="relative mx-auto max-w-3xl text-center">
      <div class="mb-4 flex justify-center">
        <div class="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
          <!-- Pulsing multichromatic rings emanating from the eye. Each is a
               radial gradient in a different engine hue; their opacity pulses
               out of phase and screen-blends where they overlap, so the halo
               flows and shifts color as it fades outward. -->
          <div
            class="halo"
            aria-hidden="true"
          >
            <span
              v-for="(c, i) in halo"
              :key="c"
              class="halo-ring"
              :style="{
                '--c': `var(--ui-color-${c}-500)`,
                width: `${5.5 + i * 2.4}rem`, height: `${5.5 + i * 2.4}rem`,
                animationDelay: `${i * 0.8}s`,
              }"
            />
          </div>
          <img
            :src="`${base}logo.png`"
            alt="iridis"
            class="float relative z-10 h-24 w-24 sm:h-28 sm:w-28"
            style="filter: drop-shadow(0 0 22px color-mix(in oklch, var(--ui-primary) 65%, transparent));"
          >
        </div>
      </div>

      <h1
        class="font-display text-5xl font-black uppercase tracking-tight glow-text sm:text-6xl"
        style="color: var(--ui-text-highlighted, #fff)"
      >
        iridis
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-sm text-muted sm:text-base">
        A chromatic engine that resolves any seeds — or any image — into a full,
        contrast-enforced, <span
          class="font-semibold"
          style="color: var(--ui-color-primary-400)"
        >OKLCH-native</span> palette.
        Every pixel here is <code class="font-mono">engine.run()</code>.
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero-orb-field {
  mask-image: radial-gradient(ellipse 65% 65% at 50% 45%, #000 0%, transparent 85%);
  -webkit-mask-image: radial-gradient(ellipse 65% 65% at 50% 45%, #000 0%, transparent 85%);
}
.halo {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  animation: halo-drift 30s linear infinite;
}
.halo-ring {
  position: absolute;
  border-radius: 9999px;
  /* soft radial glow that fades outward */
  background: radial-gradient(circle, color-mix(in oklch, var(--c) 75%, transparent) 0%, color-mix(in oklch, var(--c) 30%, transparent) 45%, transparent 68%);
  mix-blend-mode: screen;
  filter: blur(5px);
  opacity: 0.18;
  animation: halo-pulse 5s ease-in-out infinite;
}
@keyframes halo-pulse {
  0%, 100% { opacity: 0.1; transform: scale(0.82); }
  50%      { opacity: 0.6; transform: scale(1.14); }
}
@keyframes halo-drift {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .halo, .halo-ring { animation: none; }
  .halo-ring { opacity: 0.3; }
}
</style>
