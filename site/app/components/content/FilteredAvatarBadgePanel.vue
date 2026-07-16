<script setup lang="ts">
import type { AliasColorType } from '~/theme/types/aliasColor.ts';

defineProps<{
  checkedColors: readonly AliasColorType[];
}>();
</script>

<template>
  <InfoPanel
    variant="default"
    label="Avatars & badges — filtered by the checkboxes above"
    class="lg:col-span-2"
  >
    <div class="flex flex-wrap items-center gap-3">
      <div
        v-for="color in checkedColors"
        :key="color"
        class="flex items-center gap-1.5"
      >
        <UAvatar
          :alt="color"
          size="sm"
          :ui="{ root: `bg-[var(--ui-color-${color}-500)] text-[var(--ui-color-${color}-50)]` }"
        >
          {{ color[0]?.toUpperCase() }}
        </UAvatar>
        <UBadge
          :color="color"
          variant="subtle"
          size="sm"
        >
          {{ color }}
        </UBadge>
      </div>
      <span
        v-if="checkedColors.length === 0"
        class="text-xs text-dimmed italic"
      >Check a color above to show it here.</span>
    </div>
  </InfoPanel>
</template>
