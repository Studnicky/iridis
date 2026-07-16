<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleMathList } from '~/composables/useRoleMathList.ts';
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import type { HueAlgorithmType, RoleRelationDerivationType } from '~/composables/types/colorDerivation.ts';
import { SEMANTIC_HUE_CLAMP } from '~/theme/semanticHueClamp.ts';
import {
  buildAlgorithmRelationUpdate,
  buildBulkAlgorithmState,
  buildFreeformRelationUpdate,
  buildGroupRelationBatch,
  buildRelationGroups,
  buildSemanticHueGuide,
  buildSemanticHueGuideDisplayEntries,
  buildVariantRelationUpdate,
  defaultBulkAlgorithmFor,
  buildVariantOptions,
  HUE_ALGORITHM_OPTIONS
} from './derivation/buildDerivationRelations.ts';
import type { DerivationRelationGroup } from './derivation/buildDerivationRelations.ts';

/**
 * Per-relation hue-derivation control: every `derivedFrom` edge in the
 * ACTIVE schema (the same graph ColorGraph.vue renders) gets its own
 * algorithm + hue-variant picker, grouped by parent role. Changing a
 * relation calls updateRelation(), which merges it into derivationConfig
 * and re-runs the whole engine pipeline via the FSM — the picked algorithm
 * is never recomputed client-side, only ever what derive:roleRelations
 * (the registered pipeline task) resolves.
 */
const { updateRelation, updateRelations, semanticHuesEnabled, setSemanticHuesEnabled } = useIridis();
const { mathList } = useRoleMathList();

/** Neutral pipeline-token fallback for a parent swatch missing its own hex
 * (should not normally happen) — reads the resolved `--ui-text-muted` custom
 * property Tokens.apply() already wrote to the document root, so even the
 * fallback stays engine-derived. SSR has no `document` to read from, so the
 * literal gray is only ever a last-ditch pre-hydration value. */
function parentHexFallback(): string {
  if (typeof document === 'undefined') {return '#888888';}
  return getComputedStyle(document.documentElement).getPropertyValue('--ui-text-muted').trim() || '#888888';
}

/** Same 4 roles/targets derive:semanticHues actually nudges toward — read directly from its own source of truth (never a second hardcoded copy that could drift out of sync). */
const semanticHueGuide = buildSemanticHueGuide();
const semanticHueGuideEntries = buildSemanticHueGuideDisplayEntries(semanticHueGuide);

/** Grouped by parent so a hub's whole family (e.g. every syntax-* role derived from brand) is edited together, matching the graph's own hub-and-spoke structure. */
const groups = computed<readonly DerivationRelationGroup[]>(() => {
  return buildRelationGroups(mathList.value, parentHexFallback());
});

function onAlgorithmChange(role: RoleMathEntryType, algorithm: HueAlgorithmType): void {
  updateRelation(role.name, buildAlgorithmRelationUpdate(role, algorithm));
}

function onVariantChange(role: RoleMathEntryType, hueVariantIndex: number): void {
  updateRelation(role.name, buildVariantRelationUpdate(role, hueVariantIndex));
}

function onFreeformOffsetChange(role: RoleMathEntryType, offsetDeg: number): void {
  updateRelation(role.name, buildFreeformRelationUpdate(offsetDeg));
}

/** One algorithm per group, defaulting to the first child's current algorithm so re-opening a group doesn't reset your last bulk pick. */
const bulkAlgorithm = ref<Record<string, HueAlgorithmType>>({});
function bulkAlgorithmFor(group: DerivationRelationGroup): HueAlgorithmType {
  return bulkAlgorithm.value[group.parentName] ?? defaultBulkAlgorithmFor(group);
}

/**
 * A triad/tetrad/etc. describes a RELATIONSHIP among several hues — there's
 * no such thing as "this one child is triadic" in isolation. So applying an
 * algorithm to a group means classifying every child into whichever of the
 * algorithm's candidate hues (relative to the parent) it's already closest
 * to — each child keeps its own identity/semantic meaning as closely as
 * possible while the family as a whole becomes an actual triad/tetrad/etc.
 * `child.h` is the child's own current engine-resolved hue, which already
 * reflects any semantic hue nudge (success/warning/error/info) it's
 * subject to — so a semantic role naturally lands on the slot nearest its
 * semantic target, not an arbitrary one.
 */
function applyToGroup(group: DerivationRelationGroup, algorithm: HueAlgorithmType): void {
  bulkAlgorithm.value = buildBulkAlgorithmState(bulkAlgorithm.value, group.parentName, algorithm);
  if (algorithm === 'freeform') {return;}
  // Batched into one updateRelations() call — dispatching one updateRelation()
  // per child here would fire the FSM's async EffectInterpreter.send() once
  // per child in a tight synchronous loop, which races (only the first lands
  // before the interpreter is still busy processing it) and silently drops
  // the rest.
  updateRelations(buildGroupRelationBatch(group, algorithm));
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted">
      Every derived role's hue relation to its parent, grouped by hub. Picking an algorithm here changes what
      <code class="font-mono">expand:family</code> actually derives — not a preview.
    </p>

    <SemanticHueNudgePanel
      :enabled="semanticHuesEnabled"
      :clamp-degrees="SEMANTIC_HUE_CLAMP"
      :entries="semanticHueGuideEntries"
      @toggle="setSemanticHuesEnabled"
    />

    <div
      v-if="groups.length === 0"
      class="text-sm text-dimmed"
    >
      This schema tier has no derived roles yet — nothing to configure.
    </div>

    <DerivationGroupPanel
      v-for="group in groups"
      :key="group.parentName"
      :group="group"
      :bulk-algorithm="bulkAlgorithmFor(group)"
      :algorithm-options="HUE_ALGORITHM_OPTIONS"
      :variant-options="buildVariantOptions"
      @bulk-algorithm-change="(algorithm: HueAlgorithmType) => bulkAlgorithm = buildBulkAlgorithmState(bulkAlgorithm, group.parentName, algorithm)"
      @apply-all="applyToGroup(group, bulkAlgorithmFor(group))"
      @algorithm-change="onAlgorithmChange"
      @variant-change="onVariantChange"
      @freeform-offset-change="onFreeformOffsetChange"
    />
  </div>
</template>
