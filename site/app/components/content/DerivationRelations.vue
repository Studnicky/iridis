<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useRoleMathList, type RoleMathEntry } from '~/composables/useRoleMathList.ts';
import type { HueAlgorithm, RoleRelationDerivation } from '~/composables/types/colorDerivation.ts';
import { hueVariantLabel, selectHueAlgorithm } from '~/utils/colorDerivation.ts';
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
const { updateRelation } = useIridis();
const { mathList } = useRoleMathList();

const HUE_ALGORITHM_OPTIONS: { label: string; value: HueAlgorithm }[] = [
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
  readonly children: readonly RoleMathEntry[];
}

/** Grouped by parent so a hub's whole family (e.g. every syntax-* role derived from brand) is edited together, matching the graph's own hub-and-spoke structure. */
const groups = computed<readonly RelationGroup[]>(() => {
  const byParent = new Map<string, RoleMathEntry[]>();
  for (const role of mathList.value) {
    if (!role.isDerived || role.parentRole === undefined) {continue;}
    const list = byParent.get(role.parentRole) ?? [];
    list.push(role);
    byParent.set(role.parentRole, list);
  }
  const parentHexes = new Map(mathList.value.map((r) => [r.name, r.hex]));
  return Array.from(byParent.entries()).map(([parentName, children]) => ({
    'parentName': parentName,
    'parentHex': parentHexes.get(parentName) ?? '#888888',
    'children': children,
  }));
});

function variantOptions(algorithm: HueAlgorithm): { label: string; value: number }[] {
  return selectHueAlgorithm(algorithm, 0).map((offset, index) => ({ 'label': hueVariantLabel(offset), 'value': index }));
}

function onAlgorithmChange(role: RoleMathEntry, algorithm: HueAlgorithm): void {
  const relation: RoleRelationDerivation = algorithm === 'freeform'
    ? { 'hueAlgorithm': algorithm, 'hueVariantIndex': 0, 'freeformOffset': role.algorithmInfo?.offsetDeg ?? 0 }
    : { 'hueAlgorithm': algorithm, 'hueVariantIndex': 0 };
  updateRelation(role.name, relation);
}

function onVariantChange(role: RoleMathEntry, hueVariantIndex: number): void {
  const algorithm = role.algorithmInfo?.hueAlgorithm ?? 'monochromatic';
  updateRelation(role.name, { 'hueAlgorithm': algorithm, 'hueVariantIndex': hueVariantIndex });
}

function onFreeformOffsetChange(role: RoleMathEntry, offsetDeg: number): void {
  updateRelation(role.name, { 'hueAlgorithm': 'freeform', 'hueVariantIndex': 0, 'freeformOffset': offsetDeg });
}

/** One algorithm per group, defaulting to the first child's current algorithm so re-opening a group doesn't reset your last bulk pick. */
const bulkAlgorithm = ref<Record<string, HueAlgorithm>>({});
function bulkAlgorithmFor(group: RelationGroup): HueAlgorithm {
  return bulkAlgorithm.value[group.parentName] ?? group.children[0]?.algorithmInfo?.hueAlgorithm ?? 'analogous';
}

/** Assigns hueVariantIndex = position % algorithm.length across a hub's children, in the same (schema-sort-order) sequence they're listed here — a one-click default; each child's slot stays individually editable afterward. */
function applyToGroup(group: RelationGroup, algorithm: HueAlgorithm): void {
  bulkAlgorithm.value = { ...bulkAlgorithm.value, [group.parentName]: algorithm };
  if (algorithm === 'freeform') {return;}
  const slotCount = selectHueAlgorithm(algorithm, 0).length;
  group.children.forEach((child, index) => {
    updateRelation(child.name, { 'hueAlgorithm': algorithm, 'hueVariantIndex': index % slotCount });
  });
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted">
      Every derived role's hue relation to its parent, grouped by hub. Picking an algorithm here changes what
      <code class="font-mono">expand:family</code> actually derives — not a preview.
    </p>

    <div v-if="groups.length === 0" class="text-sm text-dimmed">
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
