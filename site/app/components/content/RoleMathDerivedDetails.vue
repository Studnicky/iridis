<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import { computed } from 'vue';
import { buildRoleMathDerivedDetailsModel } from './roleMath/buildRoleMathDerivedDetailsModel.ts';

const props = defineProps<{
  algorithmLabel: string;
  role: RoleMathEntryType;
}>();

const detailsModel = computed(() => buildRoleMathDerivedDetailsModel(props.role));
</script>

<template>
  <div v-if="props.role.isDerived">
    <StatusNote class="space-y-2">
      <div>This role is derived from <strong class="text-highlighted uppercase">{{ props.role.parentRole }}</strong>. Its color is computed by offsetting the parent's OKLCH values according to the schema below.</div>
    </StatusNote>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
      <MetricTile
        v-for="metric in detailsModel.metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metric.value"
      />
    </div>

    <div
      v-if="detailsModel.algorithmSummary !== null"
      class="mt-2 pt-2 border-t border-default/30 space-y-1"
    >
      <PanelHeading
        title="Hue-derivation algorithm"
        as="div"
      />
      <div class="not-italic text-highlighted">
        {{ props.algorithmLabel }}
      </div>
      <div class="not-italic font-mono text-[11px] text-muted">
        {{ detailsModel.algorithmSummary }}
      </div>
    </div>
  </div>
</template>
