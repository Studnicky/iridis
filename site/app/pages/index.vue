<script setup lang="ts">
import { useAsyncData } from '#imports'
import { computed, reactive, ref, watch } from 'vue';
import { docPanelId } from '~/composables/docPanelId.ts';
import { sanitizeDocAnchorId } from '~/composables/sanitizeDocAnchorId.ts';
import { SEQUENTIAL_STAGE_NAMES } from '~/composables/sequentialStageNames.ts';
import { STAGE_GROUPS } from '~/composables/stageGroups.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { useThemePreset } from '~/composables/useThemePreset.ts';
import { IridisUiActionType } from '~/composables/types/index.ts';

/**
 * iridis × Nuxt UI. A compact hero, then the stage carousels reflecting the
 * actual engine pipeline — Upload, Combine (only once an image is uploaded),
 * Refine (palette seed entry, role assignment, CVD preview, schema/compliance
 * settings), Explore (the resolved roles/pairings/spectrum, plus the
 * component/interactable/motion showcases), Stylesheets (every emit-plugin
 * output format), and Reference — then the docs list. The SAME
 * left-arrow/centered-title/right-arrow header and Next/Previous navigation
 * spans the whole page: after Reference, Next continues into the first doc;
 * a doc's Previous eventually leads back to Reference. Every color is
 * produced by engine.run().
 *
 * Each stage carousel is a SEPARATE `<CylinderCarousel>` instance with its
 * own independently-scoped local active index (`stageIndex`, bound via
 * `v-model`). None of them reads or drives the page's shared FSM activeIndex.
 */
const { data: allDocs } = await useAsyncData('alldocs', () => queryCollection('docs').all())

const {
  'send': send, 'framing': framing, 'uploadedImages': uploadedImages,
  'removeUploadedImage': removeUploadedImage, 'updateUploadedImageSetting': updateUploadedImageSetting,
  'selectEntryCandidate': selectEntryCandidate
} = useIridis();
const { 'registerDocTargets': registerDocTargets, 'registerStageIndexSetter': registerStageIndexSetter } = useNavigationTargets();
watch(allDocs, (docs) => { if (docs) {registerDocTargets(docs);} }, { 'immediate': true });

/** Theme-preset switcher options, derived from the THEMES registry so the list grows automatically as more themes are registered. */
const { 'THEMES': THEMES, 'activeThemeKey': activeThemeKey } = useThemePreset();
const themeOptions = computed(() => Object.values(THEMES).map((t) => ({ 'label': t.label, 'value': t.key })));

/** One local active-index per stage carousel — keyed by stage name (STAGE_GROUPS[].name). */
const stageIndex = reactive<Record<string, number>>(
  Object.fromEntries(STAGE_GROUPS.map((group) => [group.name, 0]))
);
for (const group of STAGE_GROUPS) {
  registerStageIndexSetter(group.name, (index: number) => { stageIndex[group.name] = index; });
}

/** Combine only earns its place in the flow once there's an uploaded image to combine — hidden otherwise, and skipped over by Next/Previous navigation while hidden. */
const visibleStageGroups = computed(() => STAGE_GROUPS.filter((group) => group.name !== 'combine' || uploadedImages.value.length > 0));

/** Every uploaded-image card's key shares this prefix, distinguishing it from every other stage's static item keys. */
const UPLOADED_IMAGE_KEY_PREFIX = 'uploadedImage-';
function uploadedImageItemKey(id: string): string { return `${UPLOADED_IMAGE_KEY_PREFIX}${id}`; }
function findUploadedImage(itemKey: string) {
  if (!itemKey.startsWith(UPLOADED_IMAGE_KEY_PREFIX)) return undefined;
  const id = itemKey.slice(UPLOADED_IMAGE_KEY_PREFIX.length);
  return uploadedImages.value.find((img) => img.id === id);
}

/**
 * The Upload stage's own top-level carousel gets one slide per uploaded
 * image, dynamically appended after the static dropzone slide — every
 * upload is a SEPARATE top-level carousel card in this SAME stage carousel,
 * never a second carousel nested inside the dropzone card's own content.
 * Every other stage's items are the static list stageGroups.ts defines.
 */
function stageItemsFor(group: (typeof STAGE_GROUPS)[number]) {
  if (group.name !== 'upload') return group.items;
  return [...group.items, ...uploadedImages.value.map((img) => ({ 'key': uploadedImageItemKey(img.id), 'label': img.name }))];
}

/** A newly uploaded image's card should come front-and-center immediately; removing one falls back to the dropzone slide. */
watch(() => uploadedImages.value.length, (next, prev) => {
  if (next > prev) stageIndex['upload'] = next;
  else if (next < prev) stageIndex['upload'] = 0;
});

/** Every doc's scroll-anchor id, in the same order they render — the tail of the site-wide Next/Previous sequence, after every stage. */
const docAnchorIds = computed(() => (allDocs.value ?? []).map((doc) => sanitizeDocAnchorId(doc.path)));

/**
 * The plain-English "what is this" docs (01, 02) are hoisted to render
 * directly under the intro block (WhatIsIridis), default-open, instead of
 * buried at the bottom with the rest (NARR-4). `docAnchorIds`/`fullSequence`
 * are unaffected — Next/Previous sequencing reads from `allDocs` order, not
 * from where a doc happens to render — so each id still resolves exactly
 * once regardless of which loop renders its `AccordionPanel`.
 */
const HOISTED_DOC_IDS = new Set(['01-what-is-iridis', '02-the-four-stages']);
const hoistedDocs = computed(() => (allDocs.value ?? []).filter((doc) => HOISTED_DOC_IDS.has(sanitizeDocAnchorId(doc.path))));
const remainingDocs = computed(() => (allDocs.value ?? []).filter((doc) => !HOISTED_DOC_IDS.has(sanitizeDocAnchorId(doc.path))));

/** The ONE Next/Previous sequence spanning the whole page: every stage (Combine included only while visible), then every doc. */
const fullSequence = computed(() => [
  ...SEQUENTIAL_STAGE_NAMES.filter((name) => name !== 'combine' || uploadedImages.value.length > 0),
  ...docAnchorIds.value
]);

/** Id to navigate to when a left/right arrow anywhere on the page is clicked — undefined at either end of the whole-site sequence. */
function adjacentInSequence(currentId: string | undefined, delta: 1 | -1): string | undefined {
  if (currentId === undefined) return undefined;
  const seq = fullSequence.value;
  const i = seq.indexOf(currentId);
  if (i === -1) return undefined;
  return seq[i + delta];
}

/** The doc currently shown in the docs section's own header — updated whenever its arrows (or a stage's "Next" past Reference) land on a doc. Defaults to the first doc once the list loads. */
const currentDocId = ref<string | undefined>(undefined);
watch(docAnchorIds, (ids) => { if (currentDocId.value === undefined && ids.length > 0) currentDocId.value = ids[0]; }, { 'immediate': true });

function goTo(targetId: string | undefined): void {
  if (!targetId) return;
  send({ 'targetId': targetId, 'type': IridisUiActionType.NAVIGATE_TO_TARGET });
  if (docAnchorIds.value.includes(targetId)) currentDocId.value = targetId;
}

function docTitle(id: string | undefined): string {
  if (id === undefined) return '';
  const index = docAnchorIds.value.indexOf(id);
  return (index === -1 ? undefined : allDocs.value?.[index]?.title) ?? '';
}

/** Human label for a fullSequence id — a stage's own STAGE_GROUPS label, or a doc's title. Used by the section-level Prev/Next buttons so they read as a destination ("Upload" / "Explore"), not a bare chevron (NAV-7). */
function destinationLabel(id: string): string {
  const stage = STAGE_GROUPS.find((group) => group.name === id);
  return stage ? stage.label : docTitle(id);
}

/** Section-level Prev/Next label for the id `delta` away from `currentId` in the whole-site sequence — `undefined` at either end (matching `adjacentInSequence`), so the button falls back to its icon-only `aria-label`. */
function stepLabel(currentId: string | undefined, delta: 1 | -1): string | undefined {
  const target = adjacentInSequence(currentId, delta);
  return target === undefined ? undefined : destinationLabel(target);
}

/** Strips the 'output-' prefix OUTPUT_FORMAT_CARDS keys share, matching useMultiOutput()'s outputsByKey keys. */
function outputFormatKey(itemKey: string): string {
  return itemKey.replace(/^output-/, '');
}

/**
 * Prose content (docs cards, "Learn more" sections) links to other sections
 * via plain `<a href="#id">` anchors. Native anchor-jump conflicts with
 * nothing here today, but routing it through NAVIGATE_TO_TARGET instead of
 * `preventDefault`-free default behavior keeps every internal navigation —
 * carousel dots, the ToC bar, and prose links alike — going through the same
 * FSM event.
 */
function onDocsClick(e: MouseEvent): void {
  const anchor = (e.target as HTMLElement).closest('a[href^="#"]');
  if (!anchor) {return;}
  const targetId = anchor.getAttribute('href')!.slice(1);
  if (!targetId) {return;}
  e.preventDefault();
  goTo(targetId);
}
</script>

<template>
  <div class="space-y-8 pb-24">
    <TableOfContentsBar />
    <HeroBanner />
    <!-- Zero-height marker TableOfContentsBar observes (IntersectionObserver)
         to know when the user has scrolled past the hero — the bar stays
         non-sticky, in normal document flow, until this scrolls out of view,
         so a mobile visitor's first viewport is the hero, not the bar
         (NAV-1/NAV-3). -->
    <div
      id="toc-hero-sentinel"
      aria-hidden="true"
      class="h-px w-full"
    />

    <!-- Plain-language on-ramp (NARR-3) — visible by default, directly under
         the hero and above the stage container. -->
    <WhatIsIridis />

    <!-- Live theme/framing switcher (NARR-6) — a signature feature, moved up
         from the page footer to right under the intro so a first-time
         visitor can actually find and poke it, while still sitting below the
         hero's primary "Upload a photo" CTA so it never competes with the
         main action. Kept as one compact, clearly-labeled row. -->
    <UContainer>
      <!-- Sits over the fixed ambient starfield with only a border, no
           background (CONTRAST-3) — needs its own near-opaque backing so its
           labels clear AA in both framings; the row's own compact,
           already-bounded footprint keeps the starfield visible everywhere
           else on the page. Labels promoted from text-dimmed to text-muted
           for a wider margin on top of the backing. -->
      <div
        class="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg border border-default px-4 py-3"
        :style="{ background: 'color-mix(in oklch, var(--ui-bg) 90%, transparent)' }"
      >
        <PanelHeading
          title="Try a theme"
          as="span"
          class="font-semibold text-muted"
        />
        <!-- AppSelect (a native <select> wrapper) rather than <USelect>: a
             theme change is a pure style swap, so its control must not mount
             a listener-bearing popover. Reka's USelect re-mounts ~12
             collection-item components (each with pointer/focus/drag
             handlers) on every open and does not tear them down on close,
             leaking ~200 listeners per open/close cycle — after a few theme
             changes every scroll/pointer event fires hundreds of stale
             handlers and the page crawls. AppSelect carries exactly one
             change handler, styled from the same engine tokens as the rest
             of the chrome. -->
        <AppSelect
          v-model="activeThemeKey"
          :items="themeOptions"
          aria-label="Theme preset"
          class="w-44 shrink-0"
        />
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium uppercase tracking-wide text-muted">Light</span>
          <USwitch
            :model-value="framing === 'dark'"
            unchecked-icon="material-symbols:light-mode-rounded"
            checked-icon="material-symbols:dark-mode-rounded"
            :aria-label="framing === 'dark' ? 'Dark framing' : 'Light framing'"
            @update:model-value="send({ framing: $event ? 'dark' : 'light', type: IridisUiActionType.SET_FRAMING })"
          />
          <span class="text-xs font-medium uppercase tracking-wide text-muted">Dark</span>
        </div>
        <span class="text-xs text-muted">Every color here is <code class="font-mono">engine.run()</code>.</span>
      </div>
    </UContainer>

    <!-- The 01/02 docs, hoisted out of the bottom docs loop and rendered
         open-by-default right under the intro block (NARR-4). -->
    <UContainer
      v-if="hoistedDocs.length > 0"
      class="space-y-4"
    >
      <div @click="onDocsClick">
        <AccordionPanel
          v-for="doc in hoistedDocs"
          :id="sanitizeDocAnchorId(doc.path)"
          :key="doc.path"
          :panel-id="docPanelId(doc.path)"
          :title="doc.title || doc.path"
          icon="i-material-symbols-article-outline-rounded"
          :default-open="true"
          class="toc-scroll-target mb-4 last:mb-0"
        >
          <article class="vp-doc prose prose-primary dark:prose-invert max-w-none">
            <ContentRenderer :value="doc" />
          </article>
        </AccordionPanel>
      </div>
    </UContainer>

    <UContainer class="space-y-12">
      <section
        v-for="group in visibleStageGroups"
        :id="group.name"
        :key="group.name"
        class="space-y-4 toc-scroll-target"
      >
        <div class="flex items-center justify-center gap-4">
          <UButton
            icon="i-material-symbols-arrow-back-rounded"
            :label="stepLabel(group.name, -1)"
            color="neutral"
            variant="soft"
            size="lg"
            :class="{ invisible: !adjacentInSequence(group.name, -1) }"
            :disabled="!adjacentInSequence(group.name, -1)"
            :aria-label="stepLabel(group.name, -1) ? undefined : 'Previous step'"
            @click="goTo(adjacentInSequence(group.name, -1))"
          />
          <h2 class="font-display text-lg font-bold uppercase tracking-widest glow-text text-center">
            {{ group.label }}
          </h2>
          <UButton
            trailing
            icon="i-material-symbols-arrow-forward-rounded"
            :label="stepLabel(group.name, 1)"
            :color="group.name === 'upload' ? 'neutral' : 'primary'"
            variant="soft"
            size="lg"
            :class="{ invisible: !adjacentInSequence(group.name, 1) }"
            :disabled="!adjacentInSequence(group.name, 1)"
            :aria-label="stepLabel(group.name, 1) ? undefined : 'Next step'"
            @click="goTo(adjacentInSequence(group.name, 1))"
          />
        </div>

        <CylinderCarousel
          :items="stageItemsFor(group)"
          :model-value="stageIndex[group.name]"
          @update:model-value="stageIndex[group.name] = $event"
        >
          <template #default="{ item, active }">
            <UploadIntakeCard v-if="item.key === 'upload'" />
            <UploadedImageCard
              v-else-if="findUploadedImage(item.key)"
              :image="findUploadedImage(item.key)!"
              @remove="removeUploadedImage(findUploadedImage(item.key)!.id)"
              @update="updateUploadedImageSetting(findUploadedImage(item.key)!.id, $event)"
              @select-candidate="selectEntryCandidate(findUploadedImage(item.key)!.id, $event)"
            />
            <CombineCard v-else-if="item.key === 'combine'" />
            <PickerIntakeCard v-else-if="item.key === 'picker'" />
            <RefinePaletteCard v-else-if="item.key === 'palette'" />
            <CvdVision v-else-if="item.key === 'cvd'" />
            <SchemaComplianceCard v-else-if="item.key === 'schemaCompliance'" />
            <DerivationRelations v-else-if="item.key === 'derivationRelations'" />
            <RolesTable v-else-if="item.key === 'rolesTable'" />
            <ResolvedRoles v-else-if="item.key === 'roles'" />
            <PairingPreview v-else-if="item.key === 'pairingPreview'" />
            <div
              v-else-if="item.key === 'spectrum'"
              class="space-y-3"
            >
              <p class="text-sm text-muted">
                The full 50→950 ramp per alias.
              </p>
              <PaletteCarousel />
            </div>
            <div
              v-else-if="item.key === 'colorGraph'"
              class="space-y-3"
            >
              <p class="text-sm text-muted">
                The resolved role graph, live — every node is that role's own <code class="font-mono">engine.run()</code> color, edges are derivation lineage settling under a force simulation. Pinned/synthesized/direct-match roles toggle via the legend.
              </p>
              <ColorGraph :enabled="active" />
            </div>
            <OutputFormatCard
              v-else-if="item.key.startsWith('output-')"
              :format-key="outputFormatKey(item.key)"
            />
            <PipelineExplainer v-else-if="item.key === 'pipeline'" />
            <SchemaTree v-else-if="item.key === 'schema'" />
            <HueDerivation v-else-if="item.key === 'hueDerivation'" />
            <RoleClamps v-else-if="item.key === 'clamps'" />
            <LiveComponents v-else-if="item.key === 'components'" />
            <InteractablesShowcase v-else-if="item.key === 'interactables'" />
            <MotionShowcase v-else-if="item.key === 'motion'" />
            <ColorStreamCard v-else-if="item.key === 'colorStream'" />
          </template>
        </CylinderCarousel>
      </section>

      <section
        v-if="remainingDocs.length > 0"
        class="mt-32 space-y-4 border-t border-default pt-24 toc-scroll-target"
      >
        <div class="flex items-center justify-center gap-4">
          <UButton
            icon="i-material-symbols-arrow-back-rounded"
            :label="stepLabel(currentDocId, -1)"
            color="neutral"
            variant="soft"
            size="lg"
            :class="{ invisible: !adjacentInSequence(currentDocId, -1) }"
            :disabled="!adjacentInSequence(currentDocId, -1)"
            :aria-label="stepLabel(currentDocId, -1) ? undefined : 'Previous doc'"
            @click="goTo(adjacentInSequence(currentDocId, -1))"
          />
          <h2 class="font-display text-lg font-bold uppercase tracking-widest glow-text text-center">
            {{ docTitle(currentDocId) }}
          </h2>
          <UButton
            trailing
            icon="i-material-symbols-arrow-forward-rounded"
            :label="stepLabel(currentDocId, 1)"
            color="primary"
            variant="soft"
            size="lg"
            :class="{ invisible: !adjacentInSequence(currentDocId, 1) }"
            :disabled="!adjacentInSequence(currentDocId, 1)"
            :aria-label="stepLabel(currentDocId, 1) ? undefined : 'Next doc'"
            @click="goTo(adjacentInSequence(currentDocId, 1))"
          />
        </div>

        <div
          class="space-y-12"
          @click="onDocsClick"
        >
          <AccordionPanel
            v-for="doc in remainingDocs"
            :id="sanitizeDocAnchorId(doc.path)"
            :key="doc.path"
            :panel-id="docPanelId(doc.path)"
            :title="doc.title || doc.path"
            icon="i-material-symbols-article-outline-rounded"
            :default-open="false"
            class="toc-scroll-target"
          >
            <article class="vp-doc prose prose-primary dark:prose-invert max-w-none">
              <ContentRenderer :value="doc" />
            </article>
          </AccordionPanel>
        </div>
      </section>
    </UContainer>
  </div>
</template>
