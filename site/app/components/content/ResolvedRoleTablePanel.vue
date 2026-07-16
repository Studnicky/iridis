<script setup lang="ts">
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';
import { buildResolvedRoleTablePanelModel } from './buildResolvedRoleTablePanelModel.ts';

/** UTable — the current sort's top 6 rows, so this table itself demonstrates the shared roleSortKeys ordering. */
const { sortedRoleContrastRows } = useIridis();
const tableModel = computed(() => buildResolvedRoleTablePanelModel(sortedRoleContrastRows.value, 6));
</script>

<template>
  <InfoPanel
    variant="default"
    :label="tableModel.label"
    class="lg:col-span-2"
  >
    <UTable
      :data="[...tableModel.rows]"
      :columns="[...tableModel.columns]"
    >
      <template #hex-cell="{ row }">
        <span class="inline-flex items-center gap-1.5 font-mono text-xs">
          <span
            class="h-3 w-3 rounded-full border border-default"
            :style="{ backgroundColor: row.original.hex }"
          />
          {{ row.original.hex }}
        </span>
      </template>
      <template #ratio-cell="{ row }">
        {{ row.original.ratio.toFixed(2) }}
      </template>
      <template #compliance-cell="{ row }">
        <UBadge
          size="xs"
          variant="soft"
          :color="complianceBadgeColor(row.original.compliance)"
        >
          {{ row.original.compliance }}
        </UBadge>
      </template>
    </UTable>
  </InfoPanel>
</template>
