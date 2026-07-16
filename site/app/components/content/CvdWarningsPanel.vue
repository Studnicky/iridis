<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CvdPairWarningInterfaceType } from '@studnicky/iridis-contrast/types';
import { buildCvdWarningsPanelModel } from './cvd/buildCvdWarningsPanelModel.ts';

const props = defineProps<{
  report?: {
    corrected: number;
    list: CvdPairWarningInterfaceType[];
    stillFailing: number;
    warnings: number;
  };
  cvdTypeLabel: (cvdType: CvdPairWarningInterfaceType['cvdType']) => string;
}>();

const showDetails = ref(false);
const panelModel = computed(() => props.report ? buildCvdWarningsPanelModel(props.report, showDetails.value) : null);
</script>

<template>
  <template v-if="props.report && panelModel">
      <BadgeSummaryRow>
        <UBadge
          :color="panelModel.summaryBadgeColor"
          variant="soft"
          size="sm"
        >
          {{ panelModel.summaryBadgeLabel }}
        </UBadge>
        <UBadge
          v-if="panelModel.correctedLabel"
          color="primary"
          variant="soft"
          size="sm"
        >
          {{ panelModel.correctedLabel }}
        </UBadge>
      </BadgeSummaryRow>

      <UCollapsible
        v-if="panelModel.hasWarnings"
        v-model:open="showDetails"
      >
        <UButton
          block
          color="neutral"
          variant="soft"
          size="xs"
          icon="i-material-symbols-list-alt-outline"
          :trailing-icon="showDetails ? 'i-material-symbols-keyboard-arrow-up-rounded' : 'i-material-symbols-keyboard-arrow-down-rounded'"
        >
          {{ panelModel.detailsToggleLabel }}
        </UButton>
        <template #content>
          <ul class="mt-2 space-y-2">
            <CvdWarningRow
              v-for="(warning, index) in props.report.list"
              :key="`${warning.foreground}-${warning.background}-${warning.cvdType}-${index}`"
              :warning="warning"
              :cvd-type-label="cvdTypeLabel"
            />
          </ul>
        </template>
      </UCollapsible>
  </template>
</template>
