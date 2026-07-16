<script setup lang="ts">
import { computed } from 'vue';
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { selectDataCardLayout } from './selectDataCardLayout.ts';

/**
 * Raw-value-focused role listing — name, hex, and the OKLCH breakdown
 * (L/C/H) the engine actually resolved. Contrast/compliance detail lives in
 * Roles table instead, so the two cards split the same underlying role set
 * by concern rather than both showing everything. Sort state is shared
 * (RoleSortControls / roleSortKeys) with every other role listing on the
 * page — sorting here by, say, Compliance reorders Roles table identically.
 */
const { sortedRoleContrastRows } = useIridis();
const { dataLayout } = useDataLayout();

const cardLayoutByMode = {
  'grid': {
    'cardClass':      undefined,
    'containerClass': 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3',
    'showTitleSlot':  false,
    'valueClass':     'truncate text-[10px]',
    'variant':        undefined
  },
  'list': {
    'cardClass':      'gap-3',
    'containerClass': 'flex flex-col gap-2',
    'showTitleSlot':  true,
    'valueClass':     'shrink-0 text-[10px]',
    'variant':        undefined
  },
  'pixel': {
    'cardClass':      'gap-0.5 rounded-md',
    'containerClass': 'grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6',
    'showTitleSlot':  false,
    'valueClass':     'truncate text-[8px]',
    'variant':        'tile'
  }
} as const;

const activeCardLayout = computed(() => {
  return selectDataCardLayout(dataLayout.value, cardLayoutByMode);
});
</script>

<template>
  <UCard>
    <LeadSummary>
      <p class="text-sm text-muted">
        Same roles as Roles table, laid out with their raw OKLCH values — sort by any field below.
      </p>
      <template #meta>
        <UBadge
          color="neutral"
          variant="soft"
        >
          {{ sortedRoleContrastRows.length }} roles
        </UBadge>
      </template>
    </LeadSummary>

    <RoleSortControls class="mb-3" />

    <ResolvedRolesGrid
      v-if="activeCardLayout"
      :rows="sortedRoleContrastRows"
      :layout="activeCardLayout"
    />

    <ResolvedRolesTable
      v-show="dataLayout === 'table'"
      :rows="sortedRoleContrastRows"
    />
  </UCard>
</template>
