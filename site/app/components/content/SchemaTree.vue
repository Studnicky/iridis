<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { buildSchemaTree } from './schema/buildSchemaTree.ts';

/**
 * The iridis-4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32 schema hierarchy as a tree: each tier node
 * expands to the roles it ADDS over the previous tier (not the cumulative
 * set — every tier after 4 re-exports its parent's roles verbatim). Each leaf
 * shows whether that role is independently resolved from a seed or hue-derived
 * from another role (ExpandFamily) by default — pinning a seed to it in
 * PaletteControls overrides either path — plus its live hex if resolved.
 */
const { roles, framing, schemaName, roleSortKeys, sortedRoleContrastRows } = useIridis();

type LeafType = { 'derivedFrom': string | undefined; 'hex': string; 'label': string; 'value': string };
type TierType = { 'children': LeafType[]; 'defaultExpanded': boolean; 'label': string; 'value': string };

function isLeaf(item: LeafType | TierType): item is LeafType {
  return 'hex' in item;
}

/** Looks up each leaf's l/c/h/ratio/compliance from the SAME sortedRoleContrastRows every other role listing reads, instead of recomputing OKLCH from hex a second time for a value the engine already resolved. */
const contrastRowByName = computed(() => new Map(sortedRoleContrastRows.value.map((r) => [r.name, r])));

/** Each tier ("folder") sorts its own leaves by the SAME shared roleSortKeys every other role listing uses — the sort here is per-tier (a tier never reorders another tier's leaves into it), matching how the tree is a hierarchy of independent groups. */
const tree = computed<TierType[]>(() => buildSchemaTree(
  framing.value,
  schemaName.value,
  roles.value,
  roleSortKeys.value,
  contrastRowByName.value
));
</script>

<template>
  <UCard>
    <SectionIntro
      class="mb-3"
      body="Each tier adds roles over the last. &quot;resolved&quot; competes for a seed by default; &quot;← source&quot; is hue-derived — pin either one in Palette to override it."
    />
    <RoleSortControls class="mb-3" />
    <UTree :items="tree">
      <template #item-label="{ item }">
        <SchemaTreeLeafLabel
          :label="item.label"
          :is-leaf="isLeaf(item)"
          :hex="isLeaf(item) ? item.hex : undefined"
          :derived-from="isLeaf(item) ? item.derivedFrom : undefined"
        />
      </template>
    </UTree>

    <FootnoteText>
      Each leaf above is one <code class="font-mono text-xs">RoleDefinitionInterface</code> entry — a named,
      intent-classified contract, not a raw color. See
      <DocAnchorLink href="#04-engine-api">Long-form Engine API</DocAnchorLink> for what every field does.
    </FootnoteText>
  </UCard>
</template>
