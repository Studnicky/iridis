<script setup lang="ts">
import { buildResolvedRolesGridValueModel } from './buildResolvedRolesGridModel.ts';

defineProps<{
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
          {{ buildResolvedRolesGridValueModel(row, layout).hexLabel }}
        </MutedMono>
        <div :class="buildResolvedRolesGridValueModel(row, layout).containerClass">
          <span
            v-for="metric in buildResolvedRolesGridValueModel(row, layout).metrics"
            :key="metric"
          >{{ metric }}</span>
        </div>
      </div>
    </SwatchInfoCard>
  </div>
</template>
