<script setup lang="ts">
import type { CvdPairWarningInterfaceTypeEntity } from '@studnicky/iridis-contrast/types';

import { computed } from 'vue';

import { buildCvdWarningRowModel } from './buildCvdWarningRowModel.ts';

const props = defineProps<{
  warning: CvdPairWarningInterfaceTypeEntity.Type;
  cvdTypeLabel: (cvdType: CvdPairWarningInterfaceTypeEntity.Type['cvdType']) => string;
}>();

const model = computed(() => buildCvdWarningRowModel.build(props.warning));
</script>

<template>
  <li class="rounded-md border border-default bg-elevated/50 p-2 text-xs text-muted">
    <span class="font-medium text-highlighted">{{ warning.foreground }} on {{ warning.background }}</span>
    — contrast ratio drops from {{ model.originalRatio }} to {{ model.simulatedRatio }}
    ({{ model.retainedPercent }}% retained)
    under
    <span class="font-medium text-highlighted">{{ cvdTypeLabel(warning.cvdType) }}</span>.
  </li>
</template>
