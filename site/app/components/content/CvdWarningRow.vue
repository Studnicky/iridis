<script setup lang="ts">
import type { CvdPairWarningInterfaceType } from '@studnicky/iridis-contrast/types';

defineProps<{
  warning: CvdPairWarningInterfaceType;
  cvdTypeLabel: (cvdType: CvdPairWarningInterfaceType['cvdType']) => string;
}>();
</script>

<template>
  <li class="rounded-md border border-default bg-elevated/50 p-2 text-xs text-muted">
    <span class="font-medium text-highlighted">{{ warning.foreground }} on {{ warning.background }}</span>
    — contrast drops from {{ warning.originalLuminanceContrast.toFixed(4) }} to
    {{ warning.simulatedLuminanceContrast.toFixed(4) }} (ratio {{ warning.simulatedContrastRatio.toFixed(4) }}
    / {{ (warning.simulatedContrastDropRatio * 100).toFixed(2) }}% drop)
    under
    <span class="font-medium text-highlighted">{{ cvdTypeLabel(warning.cvdType) }}</span>.
  </li>
</template>
