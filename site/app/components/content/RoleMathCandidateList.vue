<script setup lang="ts">
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';
import { computed } from 'vue';
import { buildRoleMathCandidateListModel } from './roleMath/buildRoleMathCandidateListModel.ts';

const props = defineProps<{
  role: RoleMathEntry;
}>();

const candidateListModel = computed(() => buildRoleMathCandidateListModel.build(props.role));
</script>

<template>
  <div class="space-y-2">
    <PanelHeading
      title="Candidates"
      as="div"
    />
    <div class="space-y-1">
      <div
        v-for="candidate in candidateListModel.items"
        :key="candidate.hex"
        class="flex items-center gap-3 p-1.5 rounded-md"
        :class="candidate.presentation.cardClass()"
      >
        <SwatchChip
          :hex="candidate.hex"
          class="h-5 w-5 rounded shadow-inner flex-none"
          :aria-label="`${props.role.name} candidate ${candidate.hex}`"
        />
        <div class="flex-1 text-xs font-mono">
          {{ candidate.hex }}
        </div>
        <div
          class="text-xs font-mono"
          :class="candidate.presentation.distanceClass()"
        >
          Δ {{ candidate.distanceLabel }}
        </div>
      </div>
      <MicroNote
        v-if="candidateListModel.hiddenCountLabel !== null"
        class="italic pl-1.5"
      >
        {{ candidateListModel.hiddenCountLabel }}
      </MicroNote>
    </div>
  </div>
</template>
