<script setup lang="ts">
import { computed } from 'vue';
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';
import type { RoleComplianceRowType } from './roles/buildRolesComplianceRows.ts';
import { buildRolesComplianceGridModel } from './roles/buildRolesComplianceGridModel.ts';

const props = defineProps<{
  rows: readonly RoleComplianceRowType[];
  layout: {
    badgeSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    cardClass?: string;
    containerClass: string;
    ratioClass?: string;
    showRatioLabel: boolean;
    titleClass: string;
    variant: 'row' | 'tile';
  };
  naTooltip: string;
}>();

const gridModel = computed(() => buildRolesComplianceGridModel(props.rows, props.naTooltip));
</script>

<template>
  <div :class="layout.containerClass">
    <SwatchInfoCard
      v-for="role in gridModel"
      :key="role.name"
      :class="layout.cardClass"
      :hex="role.hex"
      :label="role.name"
      :aria-label="role.ariaLabel"
      surface="elevated"
      :variant="layout.variant"
    >
      <template #title>
        <div :class="layout.titleClass">
          {{ role.name }}
        </div>
      </template>
      <div :class="layout.showRatioLabel ? 'min-w-0' : 'flex items-center gap-1'">
        <div :class="layout.showRatioLabel ? 'flex items-center gap-1.5' : 'contents'">
          <RatioLabel
            v-if="layout.showRatioLabel"
            :value="role.ratio"
          />
          <span
            v-else
            :class="layout.ratioClass"
          >{{ role.ratioLabel }}</span>
        </div>
        <UBadge
          :color="complianceBadgeColor(role.compliance)"
          :title="role.tooltip"
          variant="soft"
          :size="layout.badgeSize"
        >
          {{ role.compliance }}
        </UBadge>
      </div>
    </SwatchInfoCard>
  </div>
</template>
