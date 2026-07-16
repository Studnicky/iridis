<script setup lang="ts">
import { computed } from 'vue';
import type { RoleComplianceRowType } from './roles/buildRolesComplianceRows.ts';
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';
import { buildRolesComplianceTableModel } from './roles/buildRolesComplianceTableModel.ts';

const props = defineProps<{
  rows: readonly RoleComplianceRowType[];
  naTooltip: string;
}>();

const tableModel = computed(() => buildRolesComplianceTableModel(props.rows, props.naTooltip));
</script>

<template>
  <table class="w-full border-collapse text-sm">
    <thead>
      <tr class="border-b border-default">
        <th class="p-2 text-left text-xs font-semibold text-muted">
          Swatch
        </th>
        <th class="p-2 text-left text-xs font-semibold text-muted">
          Name
        </th>
        <th class="p-2 text-left text-xs font-semibold text-muted">
          Ratio
        </th>
        <th class="p-2 text-left text-xs font-semibold text-muted">
          Compliance
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="role in tableModel"
        :key="role.name"
        class="border-b border-default"
      >
        <td class="p-2">
          <SwatchChip
            :hex="role.hex"
            class="block h-5 w-5 rounded border border-default"
            :aria-label="role.ariaLabel"
          />
        </td>
        <td class="p-2 text-xs font-semibold text-highlighted">
          {{ role.name }}
        </td>
        <td class="p-2 text-xs text-muted">
          {{ role.ratioLabel }}
        </td>
        <td class="p-2">
          <UBadge
            :color="complianceBadgeColor(role.compliance)"
            :title="role.tooltip"
            variant="soft"
            size="xs"
          >
            {{ role.compliance }}
          </UBadge>
        </td>
      </tr>
    </tbody>
  </table>
</template>
