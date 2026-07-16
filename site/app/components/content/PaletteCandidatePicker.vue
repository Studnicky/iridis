<script setup lang="ts">
import { computed } from 'vue';
import type { GalleryCandidateInterfaceType } from '@studnicky/iridis-image/types';
import { buildPaletteCandidateModels } from './picker/buildPaletteCandidateModel.ts';

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

const candidateModels = computed(() => buildPaletteCandidateModels(props.candidates, props.selectedLabel));
</script>

<template>
  <div class="space-y-2">
    <SectionIntro
      title="Candidate palettes"
      body="A few alternate clusterings of the same image — pick one to use it instead of the default extraction."
    />
    <div class="space-y-2">
      <UButton
        v-for="candidateModel in candidateModels"
        :key="candidateModel.candidate.label"
        :color="candidateModel.isSelected ? 'primary' : 'neutral'"
        :variant="candidateModel.isSelected ? 'solid' : 'soft'"
        :aria-pressed="candidateModel.isSelected"
        class="w-full flex-col items-start gap-2 h-auto p-2.5"
        @click="emit('select', candidateModel.candidate)"
      >
        <span class="text-xs font-medium">
          {{ candidateModel.humanLabel }}{{ candidateModel.isSelected ? ' ✓' : '' }}
        </span>
        <SwatchList
          :swatches="candidateModel.swatches"
          :aria-label-prefix="candidateModel.swatchAriaLabelPrefix"
          chip-class="h-5 w-5 rounded border border-default/50"
        />
      </UButton>
    </div>
  </div>
</template>
