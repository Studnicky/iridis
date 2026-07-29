<script setup lang="ts">
import { complianceBadgeColor } from '~/utils/complianceBadgeColor.ts';

defineProps<{
  backgroundHex: string;
  backgroundName: string;
  complianceLabel: string;
  foregroundHex: string;
  foregroundName: string;
  label: string;
  compact?: boolean;
}>();
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border border-default"
    :class="compact ? 'rounded-md' : ''"
  >
    <div
      :class="compact ? 'p-2' : 'space-y-1 p-4'"
      :style="{ backgroundColor: backgroundHex, color: foregroundHex }"
    >
      <p
        :class="compact ? 'truncate text-xs font-semibold' : 'text-base font-semibold'"
      >
        {{ label }}
      </p>
      <p
        v-if="!compact"
        class="text-sm"
      >
        The quick brown fox jumps over the lazy dog.
      </p>
    </div>
    <div
      v-if="!compact"
      class="flex flex-wrap items-center justify-between gap-1.5 border-t border-default bg-elevated px-3 py-2 text-xs"
    >
      <span class="truncate text-muted">{{ foregroundName }} on {{ backgroundName }}</span>
      <UBadge
        :color="complianceBadgeColor(complianceLabel)"
        variant="soft"
        size="xs"
      >
        {{ complianceLabel }}
      </UBadge>
    </div>
    <div
      v-else
      class="flex items-center justify-center border-t border-default bg-elevated px-1 py-1"
    >
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
