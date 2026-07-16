<script setup lang="ts">
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';

/**
 * Hero. The iridis logo, an engine-lit title, and floating palette orbs — all
 * colored from the live --ui-* tokens so the hero itself is engine output.
 * The plain-language lead sentence and the "Upload a photo" CTA are the
 * first things a first-time visitor reads and can act on; the technical
 * tagline underneath is a demoted second read for anyone who wants it.
 */
const base = useRuntimeConfig().app.baseURL;
const orbs = ['primary', 'info', 'success', 'error', 'warning'];
const { activateTarget } = useNavigationTargets();
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
        class="absolute rounded-full blur-2xl hero-orb"
        :style="{
          backgroundColor: `color-mix(in oklch, var(--ui-color-${o}-500) 45%, transparent)`
        }"
      />
    </div>

    <ScrimCopy
      strength="medium"
      class="relative mx-auto max-w-3xl text-center"
    >
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

      <!-- Plain-language on-ramp — the first sentence a first-time visitor
           reads, visually primary. -->
      <p class="mx-auto mt-4 max-w-xl text-lg font-semibold text-highlighted sm:text-xl">
        Give it a few colors or a photo — get back a full, accessible color
        palette for your app.
      </p>

      <UButton
        icon="i-material-symbols-upload-rounded"
        color="primary"
        size="lg"
        class="mt-5"
        @click="activateTarget('upload')"
      >
        Upload a photo
      </UButton>

      <!-- Demoted technical tagline — smaller and one step brighter than the
           minimum-legal muted tier (CONTRAST-2), no longer closing on the
           engine.run() dev flourish (NARR-5 moves that to a caption near the
           relocated theme controls, see index.vue). Gets its own tightly-fit,
           near-opaque scrim (CONTRAST-3): the hero's shared radial vignette
           has already faded most of the way out by the time it reaches this
           far down the column, which isn't enough backing for text-toned's
           tight AA margin — this scrim plateaus at full strength right
           behind the text and fades out just past its own edges, so the
           starfield stays visible everywhere else in the hero. -->
      <ScrimCopy
        strength="strong"
        class="mx-auto mt-5 max-w-xl"
      >
        <p class="text-sm text-toned">
          A chromatic engine that resolves any seeds — or any image — into a full,
          contrast-enforced, <span
            class="font-semibold"
            style="color: var(--ui-text-highlighted)"
          >OKLCH-native</span> palette.
        </p>
      </ScrimCopy>
    </ScrimCopy>
  </section>
</template>
