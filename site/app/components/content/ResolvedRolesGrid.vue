<script setup lang="ts">
import { computed } from 'vue';
import { buildResolvedRolesGridModel } from './buildResolvedRolesGridModel.ts';

const props = defineProps<{
  rows: readonly {
    name: string;
    hex: string;
    l: number;
    c: number;
    h: number;
  }[];
  layout: {
    cardClass?: string;
    containerClass: string;
    showTitleSlot: boolean;
    valueClass: string;
    variant?: 'tile';
  };
}>();

const presentation = computed(() => {
  if (props.layout.showTitleSlot) {
    return buildResolvedRolesGridModel.titleSlotPresentation;
  }
  if (props.layout.variant === 'tile') {
    return buildResolvedRolesGridModel.tilePresentation;
  }
  return buildResolvedRolesGridModel.standardPresentation;
});
</script>

<template>
  <div :class="layout.containerClass">
    <SwatchInfoCard
      v-for="row in rows"
      :key="row.name"
      :class="layout.cardClass"
      :hex="row.hex"
      :label="row.name"
      :aria-label="`${row.name} ${row.hex}`"
      :variant="layout.variant"
    >
      <template
        v-if="layout.showTitleSlot"
        #title
      >
        <div class="min-w-0 flex-1 truncate text-xs font-medium text-highlighted">
          {{ row.name }}
        </div>
      </template>
      <div :class="layout.showTitleSlot ? 'flex items-center gap-2' : 'min-w-0'">
        <MutedMono :class="layout.valueClass">
          {{ buildResolvedRolesGridModel.build(row, presentation).hexLabel }}
        </MutedMono>
        <div :class="buildResolvedRolesGridModel.build(row, presentation).containerClass">
          <span
            v-for="metric in buildResolvedRolesGridModel.build(row, presentation).metrics"
            :key="metric"
          >{{ metric }}</span>
        </div>
      </div>
    </SwatchInfoCard>
  </div>
</template>
