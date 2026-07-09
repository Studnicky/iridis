<script setup lang="ts">
/**
 * iridis × Nuxt UI. A compact hero, then PaletteControls (the engine's one
 * input surface: seeds or an image, schema, contrast, framing), then the demo
 * sections as faces of a 3D coverflow carousel — each card is a read-only,
 * interactively-tunable view of what PaletteControls fed the engine — and
 * finally Multi-output, the deliverable: every emit format for the current
 * palette. Every color is produced by engine.run().
 */
const sections = [
  { 'key': 'histogram', 'label': 'Histogram' },
  { 'key': 'components', 'label': 'Components' },
  { 'key': 'roles', 'label': 'Roles' },
  { 'key': 'rolesTable', 'label': 'Roles table' },
  { 'key': 'spaces', 'label': 'Spaces' },
  { 'key': 'pipeline', 'label': 'Pipeline' },
  { 'key': 'schema', 'label': 'Schema' },
  { 'key': 'motion', 'label': 'Motion' },
  { 'key': 'cvd', 'label': 'CVD vision' },
  { 'key': 'spectrum', 'label': 'Spectrum' },
];
</script>

<template>
  <div class="space-y-8 pb-24">
    <TableOfContentsBar :items="sections" />
    <HeroBanner />

    <UContainer class="space-y-5">
      <PaletteControls />

      <CylinderCarousel :items="sections">
        <template #default="{ item }">
          <HistogramDemo v-if="item.key === 'histogram'" />
          <LiveComponents v-else-if="item.key === 'components'" />
          <ResolvedRoles v-else-if="item.key === 'roles'" />
          <RolesTable v-else-if="item.key === 'rolesTable'" />
          <ColorSpaces v-else-if="item.key === 'spaces'" />
          <PipelineExplainer v-else-if="item.key === 'pipeline'" />
          <SchemaTree v-else-if="item.key === 'schema'" />
          <MotionShowcase v-else-if="item.key === 'motion'" />
          <CvdVision v-else-if="item.key === 'cvd'" />
          <div
            v-else-if="item.key === 'spectrum'"
            class="space-y-3"
          >
            <p class="text-sm text-muted">
              The full 50→950 ramp per alias — swipe it, or let it autoplay.
            </p>
            <PaletteCarousel />
          </div>
        </template>
      </CylinderCarousel>

      <MultiOutput />
    </UContainer>
  </div>
</template>
