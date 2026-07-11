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
        class="float absolute rounded-full blur-2xl hero-orb"
        :style="{
          backgroundColor: `color-mix(in oklch, var(--ui-color-${o}-500) 45%, transparent)`
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
                '--c': `var(--ui-color-${c}-500)`
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

      <h1 class="iridis-logo glow-text">
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


