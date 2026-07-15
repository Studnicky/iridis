<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { sortRoleRows } from '~/utils/sortRoleRows.ts';

/**
 * The iridis-4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32 schema hierarchy as a tree: each tier node
 * expands to the roles it ADDS over the previous tier (not the cumulative
 * set — every tier after 4 re-exports its parent's roles verbatim). Each leaf
 * shows whether that role is independently resolved from a seed or hue-derived
 * from another role (ExpandFamily) by default — pinning a seed to it in
 * PaletteControls overrides either path — plus its live hex if resolved.
 */
const TIER_ORDER = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const { roles, framing, schemaName, roleSortKeys, sortedRoleContrastRows } = useIridis();

type LeafType = { 'derivedFrom'?: string; 'hex'?: string; 'label': string; 'value': string };
type TierType = { 'children': LeafType[]; 'defaultExpanded': boolean; 'label': string; 'value': string };

/** Looks up each leaf's l/c/h/ratio/compliance from the SAME sortedRoleContrastRows every other role listing reads, instead of recomputing OKLCH from hex a second time for a value the engine already resolved. */
const contrastRowByName = computed(() => new Map(sortedRoleContrastRows.value.map((r) => [r.name, r])));

/** Each tier ("folder") sorts its own leaves by the SAME shared roleSortKeys every other role listing uses — the sort here is per-tier (a tier never reorders another tier's leaves into it), matching how the tree is a hierarchy of independent groups. */
const tree = computed<TierType[]>(() => {
  const seen = new Set<string>();
  const byName = contrastRowByName.value;
  return TIER_ORDER.map((tierName) => {
    const schema = roleSchemaByName[tierName]?.[framing.value];
    const added = (schema?.roles ?? []).filter((r) => {
      if (seen.has(r.name)) {return false;}
      seen.add(r.name);
      return true;
    });
    const leafRows = added.map((r) => {
      const row = byName.get(r.name);
      // This tree shows every tier up to iridis-32 regardless of which schema
      // is currently active, so a role belonging to a deeper tier than
      // schemaName.value genuinely isn't resolved yet — fall back to the
      // always-present, required 'background' role (a derived neutral) to
      // signal "not currently active" rather than a hardcoded placeholder.
      const hex = roles.value[r.name] ?? roles.value['background']!;
      return {
        'c': row?.c ?? 0, 'compliance': row?.compliance ?? 'fail', 'derivedFrom': r.derivedFrom, 'h': row?.h ?? 0, hex,
        'l': row?.l ?? 0, 'label': r.name, 'name': r.name, 'ratio': row?.ratio ?? 1, 'value': `${tierName}:${r.name}`
      };
    });
    return {
      'children': sortRoleRows(leafRows, roleSortKeys.value),
      'defaultExpanded': tierName === schemaName.value,
      'label': tierName,
      'value': tierName
    };
  });
});
</script>

<template>
  <UCard>
    <p class="mb-3 text-sm text-muted">
      Each tier adds roles over the last. "resolved" competes for a seed by default; "← source"
      is hue-derived — pin either one in Palette to override it.
    </p>
    <RoleSortControls class="mb-3" />
    <UTree :items="tree">
      <template #item-leading="{ item }">
        <span
          v-if="(item as LeafType).hex"
          class="h-3 w-3 shrink-0 rounded-full border border-default"
          :style="{ backgroundColor: (item as LeafType).hex }"
        />
      </template>
      <template #item-label="{ item }">
        <span class="flex items-center gap-1.5">
          <span class="font-mono text-xs">{{ item.label }}</span>
          <UBadge
            v-if="'derivedFrom' in item"
            :color="(item as LeafType).derivedFrom === undefined ? 'success' : 'neutral'"
            variant="soft"
            size="xs"
          >
            {{ (item as LeafType).derivedFrom === undefined ? 'resolved' : `← ${(item as LeafType).derivedFrom}` }}
          </UBadge>
        </span>
      </template>
    </UTree>

    <p class="mt-3 text-xs text-muted">
      Each leaf above is one <code class="font-mono text-xs">RoleDefinitionInterface</code> entry — a named,
      intent-classified contract, not a raw color. See
      <a
        href="#04-engine-api"
        class="text-primary hover:underline"
      >Long-form Engine API</a> for what every field does.
    </p>
  </UCard>
</template>
