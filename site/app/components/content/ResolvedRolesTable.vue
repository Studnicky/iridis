<script setup lang="ts">
import { computed } from 'vue';
import { buildResolvedRolesTableModel } from './buildResolvedRolesTableModel.ts';

type ResolvedRoleRowType = {
  name: string;
  hex: string;
  l: number;
  c: number;
  h: number;
};

const props = defineProps<{
  rows: readonly ResolvedRoleRowType[];
}>();

const tableModel = computed(() => buildResolvedRolesTableModel(props.rows));
</script>

<template>
  <table class="w-full border-collapse text-xs">
    <thead>
      <tr class="border-b border-default text-left text-muted">
        <th class="p-2 font-medium">
          Swatch
        </th>
        <th class="p-2 font-medium">
          Name
        </th>
        <th class="p-2 font-medium">
          Hex
        </th>
        <th class="p-2 font-medium">
          L
        </th>
        <th class="p-2 font-medium">
          C
        </th>
        <th class="p-2 font-medium">
          H
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="row in tableModel"
        :key="row.name"
        class="border-b border-default last:border-0"
      >
        <td class="p-2">
          <SwatchChip
            :hex="row.hex"
            class="h-5 w-5 rounded border border-default"
            :aria-label="row.ariaLabel"
          />
        </td>
        <td class="p-2 font-medium text-highlighted">
          {{ row.name }}
        </td>
        <td class="p-2 font-mono text-muted">
          {{ row.hex }}
        </td>
        <td class="p-2 text-muted">
          {{ row.lLabel }}
        </td>
        <td class="p-2 text-muted">
          {{ row.cLabel }}
        </td>
        <td class="p-2 text-muted">
          {{ row.hLabel }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
