<script setup lang="ts">
import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';
import { ALGORITHM_LABELS } from '~/composables/GalleryAlgorithms.ts';

/**
 * Presents the (typically 3) non-destructive candidate palettes from
 * gallery:extractCandidates as selectable swatch groups — the designer's
 * "give me a few optimized palettes to choose from" ask, layered on top of
 * the single default extraction (gallery:dominantColors) that already
 * populates imageSeeds. Selecting a candidate swaps imageSeeds to that
 * candidate's colors; selectedLabel === null means the default extraction
 * is still active (no candidate chosen yet).
 */
const props = defineProps<{
  candidates: readonly GalleryCandidateInterfaceType[];
  selectedLabel: string | null;
}>();

const emit = defineEmits<{
  select: [candidate: GalleryCandidateInterfaceType];
}>();

function humanize(candidate: GalleryCandidateInterfaceType): string {
  return ALGORITHM_LABELS[candidate.algorithm] ?? candidate.label;
}

function isSelected(candidate: GalleryCandidateInterfaceType): boolean {
  return props.selectedLabel === candidate.label;
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
      Candidate palettes
    </div>
    <p class="text-xs text-muted">
      A few alternate clusterings of the same image — pick one to use it instead of the default extraction.
    </p>
    <BalancedWrap
      :items="[...candidates]"
      :min-width="260"
      :gap="8"
    >
      <template #default="{ item: candidate }">
        <UButton
          :key="candidate.label"
          :color="isSelected(candidate) ? 'primary' : 'neutral'"
          :variant="isSelected(candidate) ? 'solid' : 'soft'"
          :aria-pressed="isSelected(candidate)"
          class="flex-1 flex-col items-start gap-2 h-auto p-2.5"
          @click="emit('select', candidate)"
        >
          <span class="text-xs font-medium">
            {{ humanize(candidate) }}{{ isSelected(candidate) ? ' ✓' : '' }}
          </span>
          <BalancedWrap
            :items="candidate.colors"
            :min-width="20"
            :gap="4"
          >
            <template #default="{ item: color }">
              <span
                class="h-5 w-5 rounded border border-default/50"
                :style="{ backgroundColor: color.hex }"
                :title="color.hex"
                role="img"
                :aria-label="`Candidate ${humanize(candidate)} color ${color.hex}`"
              />
            </template>
          </BalancedWrap>
        </UButton>
      </template>
    </BalancedWrap>
  </div>
</template>
