<script setup lang="ts">
import { computed } from 'vue';
import { AccordionRoot } from 'reka-ui';
import { buildPipelinePhaseGroups } from './pipeline/buildPipelinePhaseGroups.ts';

/**
 * The actual pipeline this site runs on every palette change, walked stage by
 * stage — each panel's description is pulled straight from that task's own
 * `manifest.description` (registered in the engine, not copy-pasted here), so
 * this stays truthful if a task's manifest ever changes.
 */
/**
 * The 12 accordion stages, grouped under the four conceptual phases the docs
 * describe (see "The Four Stages" below) — Resolve absorbs every
 * derive/resolve/pin/expand prefix, since role derivation, pinning, and
 * relation-building all serve that one conceptual step. A group with no
 * stages (Emit has none in this registry — emit tasks aren't part of
 * palette-building itself, see the note above the accordion) doesn't render
 * a header (NARR-7).
 */
const PHASE_GROUPS = computed(() => buildPipelinePhaseGroups());
</script>

<template>
  <UCard>
    <!-- The 4-stage plain-language framing, moved above the accordion as the
         opening line (NARR-7) — the mental model before the 12-item detail. -->
    <p class="mb-3 text-sm text-toned">
      Every useful iridis pipeline passes through four conceptual stages &mdash;
      <span class="font-mono text-xs">intake &rarr; resolve &rarr; enforce &rarr; emit</span> &mdash; even though the
      task names and order below are yours to define. See
      <DocAnchorLink href="#02-the-four-stages">The Four Stages</DocAnchorLink> for the data flow,
      the registry, and how plugins contribute optional stages.
    </p>
    <p class="mb-3 text-sm text-muted">
      Expand a stage — the description underneath is that task's own manifest, not marketing copy.
      Optional stages are automatically switched on or off depending on the compliance strictness setting.
    </p>

    <div
      v-for="group in PHASE_GROUPS"
      :key="group.label"
      class="mb-4 last:mb-0"
    >
      <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-dimmed">
        {{ group.label }}
      </p>
      <AccordionRoot
        type="multiple"
        class="w-full"
      >
        <PipelineStageAccordionItem
          v-for="stage in group.stages"
          :key="stage.value"
          :stage="stage"
        />
      </AccordionRoot>
    </div>
  </UCard>
</template>
