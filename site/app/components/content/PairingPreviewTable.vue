<script setup lang="ts">
import { computed } from 'vue';
import type { ContrastPairingType } from '~/composables/types/contrastPairing.ts';
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';
import { buildPairingPreviewTableModel } from './buildPairingPreviewTableModel.ts';

const props = defineProps<{
  pairings: readonly ContrastPairingType[];
}>();

const tableModel = computed(() => buildPairingPreviewTableModel(props.pairings));
</script>

<template>
  <table class="w-full border-collapse text-sm">
    <thead>
      <tr class="border-b border-default text-left text-xs text-muted">
        <th class="px-3 py-2 font-medium">
          Pairing
        </th>
        <th class="px-3 py-2 font-medium">
          Label
        </th>
        <th class="px-3 py-2 font-medium">
          Compliance
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="pairing in tableModel"
        :key="pairing.key"
        class="border-b border-default last:border-b-0"
      >
        <td class="px-3 py-2">
          <div
            class="h-6 w-10 rounded border border-default"
            :style="pairing.previewStyle"
          />
        </td>
        <td class="truncate px-3 py-2">
          {{ pairing.label }}
        </td>
        <td class="px-3 py-2">
          <UBadge
            :color="complianceBadgeColor(pairing.complianceLabel)"
            variant="soft"
            size="xs"
          >
            {{ pairing.complianceLabel }}
          </UBadge>
        </td>
      </tr>
    </tbody>
  </table>
</template>
