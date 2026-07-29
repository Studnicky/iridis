<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

defineProps<{
  role: RoleMathEntryType;
  algorithmLabel: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-2 px-3 pb-3">
    <div v-if="role.synthesized">
      <StatusNote>
        No seed was close enough (all candidates exceeded the maximum acceptable OKLCH distance for this role's semantic hue/chroma). A new color was mathematically synthesized.
      </StatusNote>
    </div>
    <div v-else-if="role.isDerived">
      <RoleMathDerivedDetails
        :role="role"
        :algorithm-label="algorithmLabel"
      />
    </div>
    <div v-else-if="role.isPinned">
      <RoleMathPinnedDetails :role="role" />
    </div>
    <div v-else>
      <RoleMathCandidateList :role="role" />
    </div>

    <RoleMathClampFlow :role="role" />
  </div>
</template>
