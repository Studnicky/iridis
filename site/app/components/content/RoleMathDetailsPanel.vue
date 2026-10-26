<script setup lang="ts">
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

defineProps<{
  role: RoleMathEntry;
}>();
</script>

<template>
  <div class="flex flex-col gap-2 px-3 pb-3">
    <div v-if="role.origin.isSynthesized()">
      <StatusNote>
        No seed was close enough (all candidates exceeded the maximum acceptable OKLCH distance for this role's semantic hue/chroma). A new color was mathematically synthesized.
      </StatusNote>
    </div>
    <div v-else-if="role.origin.isDerived()">
      <RoleMathDerivedDetails
        :role="role"
      />
    </div>
    <div v-else-if="role.origin.isPinned()">
      <RoleMathPinnedDetails :role="role" />
    </div>
    <div v-else>
      <RoleMathCandidateList :role="role" />
    </div>

    <RoleMathClampFlow :role="role" />
  </div>
</template>
