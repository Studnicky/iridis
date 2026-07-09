<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';

/**
 * The iridis-4 ⊂ 8 ⊂ 12 ⊂ 16 ⊂ 32 schema hierarchy as a tree: each tier node
 * expands to the roles it ADDS over the previous tier (not the cumulative
 * set — every tier after 4 re-exports its parent's roles verbatim). Each leaf
 * shows whether that role is independently resolved from a seed or hue-derived
 * from another role (ExpandFamily) by default — pinning a seed to it in
 * PaletteControls overrides either path — plus its live hex if resolved.
 */
const TIER_ORDER = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const { roles, framing, schemaName } = useIridis();

type LeafType = { 'derivedFrom'?: string; 'hex'?: string; 'label': string; 'value': string };
type TierType = { 'children': LeafType[]; 'defaultExpanded': boolean; 'label': string; 'value': string };

const tree = computed<TierType[]>(() => {
  const seen = new Set<string>();
  return TIER_ORDER.map((tierName) => {
    const schema = roleSchemaByName[tierName]?.[framing.value];
    const added = (schema?.roles ?? []).filter((r) => {
      if (seen.has(r.name)) {return false;}
      seen.add(r.name);
      return true;
    });
    return {
      'children': added.map((r) => {return { 'derivedFrom': r.derivedFrom, 'hex': roles.value[r.name], 'label': r.name, 'value': `${tierName}:${r.name}` };}),
      'defaultExpanded': tierName === schemaName.value,
      'label': tierName,
      'value': tierName
    };
  });
});
</script>

<template>
  <UCard>
    <template #header>
      <span class="block text-center font-semibold text-highlighted">Schema tree</span>
    </template>
    <p class="mb-3 text-sm text-muted">
      Each tier adds roles over the last. "resolved" competes for a seed by default; "← source"
      is hue-derived — pin either one in Palette to override it.
    </p>
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
  </UCard>
</template>
