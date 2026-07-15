<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleMathList } from '~/composables/useRoleMathList.ts';
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import type { HueAlgorithmType, RoleRelationDerivationType } from '~/composables/types/colorDerivation.ts';
import { hueCircularDistance } from '~/utils/hueCircularDistance.ts';
import { hueVariantLabel } from '~/utils/hueVariantLabel.ts';
import { normalizeHue } from '~/utils/normalizeHue.ts';
import { selectHueAlgorithm } from '~/utils/selectHueAlgorithm.ts';
import { SEMANTIC_HUE } from '~/theme/semanticHue.ts';
import { SEMANTIC_HUE_CLAMP } from '~/theme/semanticHueClamp.ts';
import { capitalize } from '~/utils/capitalize.ts';

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

/** Common-name anchors for OKLCH hue degrees — only used to make the semantic-hue guide legible; the engine itself never reasons about color names. */
const HUE_FAMILY_NAMES: readonly { max: number; name: string }[] = [
  { 'max': 20, 'name': 'red' },
  { 'max': 50, 'name': 'orange' },
  { 'max': 90, 'name': 'yellow' },
  { 'max': 170, 'name': 'green' },
  { 'max': 200, 'name': 'teal' },
  { 'max': 260, 'name': 'blue' },
  { 'max': 300, 'name': 'violet' },
  { 'max': 340, 'name': 'magenta' },
  { 'max': 361, 'name': 'red' },
];
function hueFamilyName(hueDeg: number): string {
  return HUE_FAMILY_NAMES.find((f) => hueDeg <= f.max)?.name ?? 'red';
}

/** Same 4 roles/targets derive:semanticHues actually nudges toward — read directly from its own source of truth (never a second hardcoded copy that could drift out of sync). */
const semanticHueGuide = Object.entries(SEMANTIC_HUE).map(([role, hue]) => ({
  'role': role,
  'hue': hue,
  'familyName': hueFamilyName(hue),
}));

const HUE_ALGORITHM_OPTIONS: { label: string; value: HueAlgorithmType }[] = [
  { label: 'Monochromatic', value: 'monochromatic' },
  { label: 'Complementary', value: 'complementary' },
  { label: 'Analogous', value: 'analogous' },
  { label: 'Triadic', value: 'triadic' },
  { label: 'Tetradic', value: 'tetradic' },
  { label: 'Split-complementary', value: 'split-complementary' },
  { label: 'Compound', value: 'compound' },
  { label: 'Freeform', value: 'freeform' },
];

interface RelationGroup {
  readonly parentName: string;
  readonly parentHex: string;
  readonly parentHue: number;
  readonly children: readonly RoleMathEntryType[];
}

/** Grouped by parent so a hub's whole family (e.g. every syntax-* role derived from brand) is edited together, matching the graph's own hub-and-spoke structure. */
const groups = computed<readonly RelationGroup[]>(() => {
  const byParent = new Map<string, RoleMathEntryType[]>();
  for (const role of mathList.value) {
    if (!role.isDerived || role.parentRole === undefined) {continue;}
    const list = byParent.get(role.parentRole) ?? [];
    list.push(role);
    byParent.set(role.parentRole, list);
  }
  const parents = new Map(mathList.value.map((r) => [r.name, r]));
  return Array.from(byParent.entries()).map(([parentName, children]) => ({
    'parentName': parentName,
    'parentHex': parents.get(parentName)?.hex ?? '#888888',
    'parentHue': parents.get(parentName)?.h ?? 0,
    'children': children,
  }));
});

function variantOptions(algorithm: HueAlgorithmType): { label: string; value: number }[] {
  return selectHueAlgorithm(algorithm, 0).map((offset, index) => ({ 'label': hueVariantLabel(offset), 'value': index }));
}

function onAlgorithmChange(role: RoleMathEntryType, algorithm: HueAlgorithmType): void {
  const relation: RoleRelationDerivationType = algorithm === 'freeform'
    ? { 'hueAlgorithm': algorithm, 'hueVariantIndex': 0, 'freeformOffset': role.algorithmInfo?.offsetDeg ?? 0 }
    : { 'hueAlgorithm': algorithm, 'hueVariantIndex': 0 };
  updateRelation(role.name, relation);
}

function onVariantChange(role: RoleMathEntryType, hueVariantIndex: number): void {
  const algorithm = role.algorithmInfo?.hueAlgorithm ?? 'monochromatic';
  updateRelation(role.name, { 'hueAlgorithm': algorithm, 'hueVariantIndex': hueVariantIndex });
}

function onFreeformOffsetChange(role: RoleMathEntryType, offsetDeg: number): void {
  updateRelation(role.name, { 'hueAlgorithm': 'freeform', 'hueVariantIndex': 0, 'freeformOffset': offsetDeg });
}

/** One algorithm per group, defaulting to the first child's current algorithm so re-opening a group doesn't reset your last bulk pick. */
const bulkAlgorithm = ref<Record<string, HueAlgorithmType>>({});
function bulkAlgorithmFor(group: RelationGroup): HueAlgorithmType {
  return bulkAlgorithm.value[group.parentName] ?? group.children[0]?.algorithmInfo?.hueAlgorithm ?? 'analogous';
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
function applyToGroup(group: RelationGroup, algorithm: HueAlgorithmType): void {
  bulkAlgorithm.value = { ...bulkAlgorithm.value, [group.parentName]: algorithm };
  if (algorithm === 'freeform') {return;}
  const offsets = selectHueAlgorithm(algorithm, 0);
  const candidateHues = offsets.map((offset) => normalizeHue(group.parentHue + offset));
  // Batched into one updateRelations() call — dispatching one updateRelation()
  // per child here would fire the FSM's async EffectInterpreter.send() once
  // per child in a tight synchronous loop, which races (only the first lands
  // before the interpreter is still busy processing it) and silently drops
  // the rest.
  const batch: Record<string, RoleRelationDerivationType> = {};
  for (const child of group.children) {
    let bestIndex = 0;
    let bestDist = Infinity;
    candidateHues.forEach((candidateHue, index) => {
      const dist = hueCircularDistance(child.h, candidateHue);
      if (dist < bestDist) { bestDist = dist; bestIndex = index; }
    });
    batch[child.name] = { 'hueAlgorithm': algorithm, 'hueVariantIndex': bestIndex };
  }
  updateRelations(batch);
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted">
      Every derived role's hue relation to its parent, grouped by hub. Picking an algorithm here changes what
      <code class="font-mono">expand:family</code> actually derives — not a preview.
    </p>

    <div class="space-y-2 rounded-lg border border-default/50 p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm font-semibold text-highlighted">Semantic hue nudge</span>
        <USwitch
          :model-value="semanticHuesEnabled"
          @update:model-value="setSemanticHuesEnabled"
        />
      </div>
      <p class="text-xs text-muted">
        Independent of the relations below — <code class="font-mono">derive:semanticHues</code> nudges
        success/warning/error/info toward their conventional meaning, bounded to
        ±{{ SEMANTIC_HUE_CLAMP }}° so a role never jumps to a hue absent from your actual palette (e.g. a
        red-dominant image still yields a warm-leaning, not pure-green, success). Turn it off to let those
        4 roles resolve purely from their own seed/relation, with no built-in lean.
      </p>
      <ul class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-dimmed sm:grid-cols-4">
        <li
          v-for="entry in semanticHueGuide"
          :key="entry.role"
        >
          <span class="font-medium text-muted">{{ capitalize(entry.role) }}</span>
          → {{ entry.hue }}° ({{ entry.familyName }})
        </li>
      </ul>
    </div>

    <div
      v-if="groups.length === 0"
      class="text-sm text-dimmed"
    >
      This schema tier has no derived roles yet — nothing to configure.
    </div>

    <div
      v-for="group in groups"
      :key="group.parentName"
      class="space-y-3 rounded-lg border border-default/50 p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span
            class="inline-block h-3 w-3 rounded-full ring-1 ring-default/50"
            :style="{ background: group.parentHex }"
          />
          <span class="text-sm font-semibold text-highlighted">{{ capitalize(group.parentName) }}</span>
          <span class="text-xs text-dimmed">{{ group.children.length }} derived role{{ group.children.length === 1 ? '' : 's' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <USelect
            :model-value="bulkAlgorithmFor(group)"
            :items="HUE_ALGORITHM_OPTIONS"
            value-key="value"
            size="xs"
            class="w-40"
            @update:model-value="($event) => bulkAlgorithm = { ...bulkAlgorithm, [group.parentName]: $event }"
          />
          <UButton
            size="xs"
            variant="soft"
            :disabled="bulkAlgorithmFor(group) === 'freeform'"
            @click="applyToGroup(group, bulkAlgorithmFor(group))"
          >
            Apply to all
          </UButton>
        </div>
      </div>

      <div class="space-y-2">
        <div
          v-for="role in group.children"
          :key="role.name"
          class="flex flex-wrap items-center gap-2 rounded border border-default/40 p-2"
        >
          <span
            class="inline-block h-3 w-3 flex-none rounded-full ring-1 ring-default/50"
            :style="{ background: role.hex }"
          />
          <span class="w-24 flex-none truncate text-xs font-medium text-highlighted">{{ role.name }}</span>
          <USelect
            :model-value="role.algorithmInfo?.hueAlgorithm ?? 'monochromatic'"
            :items="HUE_ALGORITHM_OPTIONS"
            value-key="value"
            size="xs"
            class="w-32 flex-none"
            @update:model-value="($event) => onAlgorithmChange(role, $event)"
          />
          <USelect
            v-if="role.algorithmInfo && role.algorithmInfo.hueAlgorithm !== 'freeform'"
            :model-value="role.algorithmInfo.hueVariantIndex"
            :items="variantOptions(role.algorithmInfo.hueAlgorithm)"
            value-key="value"
            size="xs"
            class="w-24 flex-none"
            @update:model-value="($event) => onVariantChange(role, $event)"
          />
          <UInput
            v-else
            type="number"
            :model-value="role.algorithmInfo?.freeformOffset ?? 0"
            size="xs"
            class="w-16 flex-none"
            @update:model-value="($event) => onFreeformOffsetChange(role, Number($event))"
          />
          <span class="flex-none text-xs text-dimmed">{{ role.algorithmInfo ? hueVariantLabel(role.algorithmInfo.offsetDeg) : '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
