<script setup lang="ts">
/**
 * Hero. The iridis logo, an engine-lit title, and floating palette orbs — all
 * colored from the live --ui-* tokens so the hero itself is engine output.
 */
const base = useRuntimeConfig().app.baseURL;
const orbs = ['primary', 'info', 'success', 'error', 'warning'];
</script>

<template>
  <section class="relative overflow-hidden rounded-3xl px-6 pt-12 pb-8 sm:pt-16">
    <!-- floating engine-colored orbs. Masked to fade to zero opacity well
         before the section's own overflow-hidden edge, so the clip boundary
         is never crossed at visible alpha — no hard seam. -->
    <div class="hero-orb-field pointer-events-none absolute inset-0 -z-10">
      <div
        v-for="o in orbs"
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
          <!-- Per-theme logo background — dispatches to the active theme's
               own bespoke effect (see components/content/logoBackgrounds/),
               never a one-size-fits-all glow. -->
          <LogoBackground />
          <img
            :src="`${base}logo.png`"
            alt="iridis"
            class="float relative z-10 h-24 w-24 sm:h-28 sm:w-28"
          >
        </div>
      </div>

      <h1 class="iridis-logo">
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
