<script setup lang="ts">
import { useAsyncData } from '#imports'

/**
 * iridis × Nuxt UI. A compact hero, then PaletteControls (the engine's one
 * input surface: seeds or an image, schema, contrast, framing), then the demo
 * sections as faces of a 3D coverflow carousel — each card is a read-only,
 * interactively-tunable view of what PaletteControls fed the engine — and
 * finally Multi-output, the deliverable: every emit format for the current
 * palette. Every color is produced by engine.run().
 */
const sections = [
  { 'key': 'pipeline', 'label': 'Pipeline' },
  { 'key': 'rolesTable', 'label': 'Roles table' },
  { 'key': 'cvd', 'label': 'CVD vision' },
  { 'key': 'roles', 'label': 'Roles' },
  { 'key': 'components', 'label': 'Components' },
  { 'key': 'spectrum', 'label': 'Spectrum' },
  { 'key': 'motion', 'label': 'Motion' },
  { 'key': 'spaces', 'label': 'Spaces' },
  { 'key': 'schema', 'label': 'Schema' },
];


const { data: allDocs } = await useAsyncData('alldocs', () => queryCollection('docs').all())
</script>

<template>
  <div class="space-y-8 pb-24">
    <TableOfContentsBar :items="sections" />
    <HeroBanner />

    <UContainer class="space-y-5">
      <PaletteControls />

      <CylinderCarousel :items="sections">
        <template #default="{ item }">
          <LiveComponents v-if="item.key === 'components'" />
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
              The full 50→950 ramp per alias.
            </p>
            <PaletteCarousel />
          </div>
        </template>
      </CylinderCarousel>

      <MultiOutput />
      
      <div v-if="allDocs && allDocs.length > 0" class="mt-32 space-y-12 border-t border-default pt-24">
        <UCard
          v-for="doc in allDocs"
          :key="doc.path"
          :id="doc.path.replace(/[^a-zA-Z0-9-]/g, '-').replace(/^-+|-+$/g, '')"
          class="scroll-mt-24"
        >
          <template #header>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span />
              <h2 class="text-center text-xl font-bold tracking-tight text-highlighted">{{ doc.title || doc.path }}</h2>
              <span />
            </div>
          </template>
          <article class="prose prose-primary dark:prose-invert max-w-none">
            <ContentRenderer :value="doc" />
          </article>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>
