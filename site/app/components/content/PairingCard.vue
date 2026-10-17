<script setup lang="ts">
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';

import { PairingCardPresentation } from './PairingCardPresentation.ts';

defineProps<{
  backgroundHex: string;
  backgroundName: string;
  complianceLabel: string;
  foregroundHex: string;
  foregroundName: string;
  label: string;
  presentation: PairingCardPresentation;
}>();
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border border-default"
    :class="presentation.rootClass"
  >
    <div
      :class="presentation.sampleClass"
      :style="{ backgroundColor: backgroundHex, color: foregroundHex }"
    >
      <p :class="presentation.titleClass">
        {{ label }}
      </p>
      <p :class="presentation.detailClass">
        The quick brown fox jumps over the lazy dog.
      </p>
    </div>
    <div :class="presentation.metadataClass">
      <span class="truncate text-muted">{{ foregroundName }} on {{ backgroundName }}</span>
      <UBadge
        :color="complianceBadgeColor(complianceLabel)"
        variant="soft"
        size="xs"
      >
        {{ complianceLabel }}
      </UBadge>
    </div>
    <div :class="presentation.compactBadgeClass">
      <UBadge
        :color="complianceBadgeColor(complianceLabel)"
        variant="soft"
        size="xs"
      >
        {{ complianceLabel }}
      </UBadge>
    </div>
  </div>
</template>
