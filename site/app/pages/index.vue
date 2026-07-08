<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';

/**
 * iridis × Nuxt UI. Every color on this page — roles and the full 50→950 scales —
 * is produced by the synchronous iridis engine. The page is EITHER a color picker
 * OR an image extractor; switching modes swaps the palette that themes everything.
 */
const { mode } = useIridis();
</script>

<template>
  <UContainer class="space-y-8 py-10">
    <header class="space-y-3">
      <h1 class="text-4xl font-bold text-highlighted">iridis × Nuxt UI</h1>
      <p class="max-w-2xl text-muted">
        Every token here — buttons, borders, code, badges, and each shade of every scale — is produced
        by <code>engine.run()</code>. Pick a mode, edit the palette, and the whole Nuxt UI surface
        re-tones live.
      </p>
      <ModeSwitch />
    </header>

    <PalettePlayground v-if="mode === 'picker'" />
    <ImageMode v-else />

    <section class="space-y-4">
      <h2 class="text-lg font-semibold text-highlighted">Live component surface</h2>
      <UCard>
        <div class="space-y-5">
          <div class="flex flex-wrap gap-2">
            <UButton color="primary">Primary</UButton>
            <UButton color="primary" variant="outline">Outline</UButton>
            <UButton color="primary" variant="soft">Soft</UButton>
            <UButton color="secondary">Secondary</UButton>
            <UButton color="success">Success</UButton>
            <UButton color="warning">Warning</UButton>
            <UButton color="error">Error</UButton>
            <UButton color="info">Info</UButton>
            <UButton color="neutral" variant="outline">Neutral</UButton>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-3">
              <UInput placeholder="Search…" icon="i-lucide-search" />
              <USlider :default-value="60" />
              <UProgress :model-value="72" />
              <div class="flex flex-wrap gap-2">
                <UBadge color="primary">primary</UBadge>
                <UBadge color="secondary" variant="soft">secondary</UBadge>
                <UBadge color="success" variant="soft">success</UBadge>
                <UBadge color="warning" variant="soft">warning</UBadge>
                <UBadge color="error" variant="outline">error</UBadge>
                <UBadge color="info" variant="soft">info</UBadge>
              </div>
            </div>
            <UAlert
              color="primary"
              variant="soft"
              title="Themed by the engine"
              description="This alert, its icon, border and text all read from --ui-* variables the engine wrote."
              icon="i-lucide-palette"
            />
          </div>
          <div class="space-y-1">
            <div class="text-xs font-medium text-muted">Primary scale (engine-generated variants)</div>
            <div class="flex flex-wrap gap-1">
              <div
                v-for="s in [50,100,200,300,400,500,600,700,800,900,950]"
                :key="s"
                class="h-9 w-9 rounded"
                :style="{ backgroundColor: `var(--ui-color-primary-${s})` }"
                :title="`primary-${s}`"
              />
            </div>
          </div>
        </div>
      </UCard>
    </section>

    <ResolvedRoles />

    <div class="grid gap-6 lg:grid-cols-2">
      <ColorSpaces />
      <MultiOutput />
    </div>
  </UContainer>
</template>
