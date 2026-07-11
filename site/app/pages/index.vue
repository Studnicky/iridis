<script setup lang="ts">
import { useAsyncData } from '#imports'
import { watch } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';
import { CAROUSEL_SECTIONS } from '~/composables/CarouselSections.ts';

/**
 * iridis × Nuxt UI. A compact hero, then PaletteControls (the engine's one
 * input surface: seeds or an image, schema, contrast, framing), then the demo
 * sections as faces of a 3D coverflow carousel — each card is a read-only,
 * interactively-tunable view of what PaletteControls fed the engine — and
 * finally Multi-output, the deliverable: every emit format for the current
 * palette. Every color is produced by engine.run().
 */
const sections = CAROUSEL_SECTIONS;

const { data: allDocs } = await useAsyncData('alldocs', () => queryCollection('docs').all())

const { 'send': send } = useIridis();
const { 'registerDocTargets': registerDocTargets } = useNavigationTargets();
watch(allDocs, (docs) => { if (docs) {registerDocTargets(docs);} }, { 'immediate': true });

/**
 * Prose content (docs cards, "Learn more" sections) links to other sections
 * via plain `<a href="#id">` anchors. Native anchor-jump conflicts with
 * nothing here today, but routing it through NAVIGATE_TO_TARGET instead of
 * `preventDefault`-free default behavior keeps every internal navigation —
 * carousel dots, the ToC bar, and prose links alike — going through the same
 * FSM event, which is what a future navigation-helper feature dispatches
 * against too.
 */
function onDocsClick(e: MouseEvent): void {
  const anchor = (e.target as HTMLElement).closest('a[href^="#"]');
  if (!anchor) {return;}
  const targetId = anchor.getAttribute('href')!.slice(1);
  if (!targetId) {return;}
  e.preventDefault();
  send({ 'targetId': targetId, 'type': IridisUiActionType.NAVIGATE_TO_TARGET });
}
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
          <RoleClamps v-else-if="item.key === 'clamps'" />
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
      
      <div v-if="allDocs && allDocs.length > 0" class="mt-32 space-y-12 border-t border-default pt-24" @click="onDocsClick">
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
