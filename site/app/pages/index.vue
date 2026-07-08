<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';

/**
 * iridis × Nuxt UI. A compact hero, then the demo sections as faces of a 3D
 * coverflow carousel — the palette/image deriver is the front face on load;
 * spin the drum and the front face snaps forward and becomes interactive while
 * the rest curl away in parallax. Every color is produced by engine.run().
 */
const { mode } = useIridis();

const sections = [
  { 'key': 'palette', 'label': 'Palette' },
  { 'key': 'components', 'label': 'Components' },
  { 'key': 'roles', 'label': 'Roles' },
  { 'key': 'spaces', 'label': 'Spaces' },
  { 'key': 'outputs', 'label': 'Outputs' },
];
</script>

<template>
  <div class="space-y-8 pb-24">
    <HeroBanner />

    <UContainer>
      <div class="mb-5 flex flex-col items-center gap-3">
        <ModeSwitch />
        <p class="text-xs text-muted">
          Drag, swipe, or use the arrows — the front card is live.
        </p>
      </div>

      <CylinderCarousel :items="sections">
        <template #default="{ item }">
          <template v-if="item.key === 'palette'">
            <PalettePlayground v-if="mode === 'picker'" />
            <ImageMode v-else />
          </template>
          <LiveComponents v-else-if="item.key === 'components'" />
          <ResolvedRoles v-else-if="item.key === 'roles'" />
          <ColorSpaces v-else-if="item.key === 'spaces'" />
          <MultiOutput v-else-if="item.key === 'outputs'" />
        </template>
      </CylinderCarousel>
    </UContainer>

    <UContainer>
      <div class="mb-4 text-center">
        <h2
          class="font-display text-xl font-bold uppercase tracking-widest glow-text"
          style="color: var(--ui-text-highlighted)"
        >
          Spectrum
        </h2>
        <p class="mt-1 text-xs text-muted">
          Every scale, engine-generated. Spin it.
        </p>
      </div>
      <PaletteCarousel />
    </UContainer>
  </div>
</template>
